// ═══════════════════════════════════════════════════════
// Proceso principal: toda la comunicación con Gemini vive aquí.
// El renderer nunca ve la API key ni hace fetch directo (ver preload.cjs).
// ═══════════════════════════════════════════════════════
import { GoogleGenAI } from "@google/genai";

// Nunca leer process.env.GEMINI_MODEL a nivel de módulo: este archivo se
// importa antes de que main.js ejecute dotenv.config(), así que las
// variables de entorno del .env todavía no existirían. Se resuelve de forma
// perezosa, en cada llamada.
const getModelId = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";

const fmt = (n) => (Number.isFinite(n) ? Math.round(n) : 0);

// Etiquetas legibles para los códigos de preferencia de dieta del perfil
const ETIQUETAS_DIETA = {
  none: "sin restricción específica",
  high_protein: "alta en proteína",
  low_carb: "baja en carbohidratos",
  vegetarian: "vegetariana",
  vegan: "vegana",
  other: "personalizada",
};

const ETIQUETAS_TIPO_COMIDA = {
  desayuno: "desayuno",
  comida: "comida (almuerzo)",
  cena: "cena",
};

// ── Esquema de respuesta estructurada (Gemini generationConfig.responseSchema) ──
// Sustituye al "pide JSON en el prompt + strip de markdown" que usaba Claude:
// Gemini garantiza que la salida cumple exactamente esta forma.
const CONFIDENCE_ENUM = ["high", "medium", "low"];

const DETECTED_FOOD_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    estimated_amount: { type: "STRING" },
    confidence: { type: "STRING", enum: CONFIDENCE_ENUM },
  },
  required: ["name", "estimated_amount", "confidence"],
};

const NUTRITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    calories_kcal: { type: "NUMBER" },
    protein_g: { type: "NUMBER" },
    carbohydrates_g: { type: "NUMBER" },
    fat_g: { type: "NUMBER" },
    fiber_g: { type: "NUMBER" },
    sugar_g: { type: "NUMBER" },
    sodium_mg: { type: "NUMBER" },
  },
  required: ["calories_kcal", "protein_g", "carbohydrates_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"],
};

const MEAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    meal_name: { type: "STRING" },
    summary: { type: "STRING" },
    detected_foods: { type: "ARRAY", items: DETECTED_FOOD_SCHEMA },
    nutrition_estimate: NUTRITION_SCHEMA,
    confidence: { type: "STRING", enum: CONFIDENCE_ENUM },
    uncertainty_notes: { type: "ARRAY", items: { type: "STRING" } },
    accuracy_tips: { type: "ARRAY", items: { type: "STRING" } },
    health_notes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "meal_name", "summary", "detected_foods", "nutrition_estimate",
    "confidence", "uncertainty_notes", "accuracy_tips", "health_notes",
  ],
};

const PANTRY_SCHEMA = {
  type: "OBJECT",
  properties: {
    suggestions: { type: "ARRAY", items: MEAL_SCHEMA },
  },
  required: ["suggestions"],
};

let _client = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar GEMINI_API_KEY. Añade tu clave de Gemini en el archivo .env y reinicia NutriAI."
    );
  }
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

async function llamarGeminiJSON({ systemPrompt, parts, schema, maxOutputTokens = 2048 }) {
  const ai = getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: getModelId(),
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens,
        // Los modelos Gemini 3.x "piensan" por defecto y ese razonamiento
        // consume el presupuesto de maxOutputTokens, truncando el JSON. Para
        // una tarea de extracción estructurada no lo necesitamos: lo
        // desactivamos para que todo el presupuesto vaya a la respuesta.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (e) {
    const msg = e?.message || String(e) || "Error desconocido al llamar a Gemini.";
    console.error("[NutriAI] Error de la API de Gemini:", msg);
    throw new Error(msg);
  }

  const texto = response.text;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (!texto) {
    if (finishReason === "MAX_TOKENS") {
      throw new Error("La respuesta se cortó por longitud. Inténtalo de nuevo.");
    }
    throw new Error("Gemini no devolvió ningún resultado. Inténtalo de nuevo.");
  }
  try {
    return JSON.parse(texto);
  } catch {
    console.error("[NutriAI] Respuesta de Gemini no es JSON válido (finishReason:", finishReason, "):", texto);
    throw new Error("La respuesta de la IA no se pudo interpretar. Inténtalo de nuevo.");
  }
}

// ── Analiza una comida (foto y/o texto) ──
export async function analizarComida({ b64, mime, nota, macrosUsuario }) {
  const notaStr = nota ? `\nNota del usuario: "${nota}"` : "";

  let macroPartes = [];
  if (macrosUsuario?.calorias != null) macroPartes.push(`${macrosUsuario.calorias} kcal`);
  if (macrosUsuario?.proteinas != null) macroPartes.push(`${macrosUsuario.proteinas}g proteína`);
  if (macrosUsuario?.carbos != null) macroPartes.push(`${macrosUsuario.carbos}g carbohidratos`);
  if (macrosUsuario?.grasas != null) macroPartes.push(`${macrosUsuario.grasas}g grasa`);
  const calStr = macroPartes.length > 0
    ? `\nIMPORTANTE - Valores nutricionales confirmados por el usuario: ${macroPartes.join(", ")}. Estos valores son definitivos, no los cambies. Estima solo los campos que el usuario no haya proporcionado.`
    : "";

  const tieneImagen = b64 != null;
  const contexto = tieneImagen
    ? `Analiza esta imagen de comida.${notaStr}${calStr}`
    : `El usuario describe esta comida: "${nota}".${calStr}\nNo hay imagen. Analiza únicamente a partir de la descripción escrita.`;

  const prompt = `${contexto}

Reglas: sé honesto sobre la incertidumbre. Menciona calorías ocultas (aceite, salsas, rebozados, métodos de cocción). Usa la descripción del usuario para mejorar la estimación. Sin consejos médicos.`;

  const parts = tieneImagen
    ? [{ inlineData: { mimeType: mime, data: b64 } }, { text: prompt }]
    : [{ text: prompt }];

  return llamarGeminiJSON({
    systemPrompt: "Eres un asistente experto en nutrición.",
    parts,
    schema: MEAL_SCHEMA,
    maxOutputTokens: 2048,
  });
}

// ── Despensa: sugiere 2-3 recetas a partir de una lista o foto de productos ──
export async function analizarDespensa({ itemsTexto, b64, mime, perfil }) {
  const contextoPerfil = [];
  if (perfil?.allergies) contextoPerfil.push(`Alergias/evitar: ${perfil.allergies}`);
  if (perfil?.dietPreference) contextoPerfil.push(`Preferencia de dieta: ${ETIQUETAS_DIETA[perfil.dietPreference] || perfil.dietPreference}`);
  const perfilStr = contextoPerfil.length > 0 ? `\nContexto del usuario: ${contextoPerfil.join(". ")}.` : "";

  const itemsStr = itemsTexto?.trim() ? `\nProductos disponibles: ${itemsTexto.trim()}` : "";
  const origenImagen = b64 != null ? " (también se adjunta una foto de la lista/despensa para identificar más productos)" : "";

  const prompt = `El usuario quiere ideas de comidas con lo que tiene en casa.${itemsStr}${origenImagen}${perfilStr}

Propón entre 2 y 3 recetas distintas usando principalmente estos productos (se pueden asumir básicos de despensa como sal, aceite, especias).

Reglas: respeta alergias y preferencias del usuario si se indican. Sé honesto sobre la incertidumbre de las cantidades. No inventes productos que no tengan sentido con la lista.`;

  const parts = b64 != null
    ? [{ inlineData: { mimeType: mime, data: b64 } }, { text: prompt }]
    : [{ text: prompt }];

  const p = await llamarGeminiJSON({
    systemPrompt: "Eres un asistente experto en nutrición y cocina.",
    parts,
    schema: PANTRY_SCHEMA,
    maxOutputTokens: 4096,
  });

  return Array.isArray(p.suggestions) ? p.suggestions : [];
}

// ── Creador de comidas: genera 1 receta ajustada a dieta, exclusiones y macros ──
export async function crearComida({ dietType, exclusiones, macrosObjetivo, notaSaciedad, tipoComida, intensidad }) {
  const dietaStr = ETIQUETAS_DIETA[dietType] || "sin restricción específica";
  const exclStr = exclusiones?.length > 0 ? `\nIngredientes a EVITAR: ${exclusiones.join(", ")}.` : "";
  const macroStr = `\nObjetivo nutricional para esta comida: ${fmt(macrosObjetivo.caloriesKcal)} kcal, ${fmt(macrosObjetivo.proteinG)}g proteína, ${fmt(macrosObjetivo.carbohydratesG)}g carbohidratos, ${fmt(macrosObjetivo.fatG)}g grasa.`;
  const saciedadStr = notaSaciedad ? `\n${notaSaciedad}` : "";

  const tipoStr = tipoComida
    ? `\nMomento del día: ${ETIQUETAS_TIPO_COMIDA[tipoComida] || tipoComida}. Propón un plato típico y apropiado para ${ETIQUETAS_TIPO_COMIDA[tipoComida] || tipoComida}.`
    : "";
  const intensidadStr = intensidad === "ligera"
    ? `\nEstilo: comida LIGERA. Fácil de digerir y poco pesada, con ingredientes frescos y métodos de cocción suaves (plancha, horno, vapor, cocido); evita frituras y salsas muy grasas. Respeta igualmente el objetivo de macros.`
    : intensidad === "pesada"
      ? `\nEstilo: comida PESADA y contundente. Más saciante y sustanciosa. Respeta igualmente el objetivo de macros.`
      : "";

  const prompt = `Crea UNA receta de comida personalizada.
Tipo de dieta: ${dietaStr}.${tipoStr}${intensidadStr}${exclStr}${macroStr}${saciedadStr}

Ajusta las cantidades de los ingredientes para acercarte lo máximo posible al objetivo nutricional indicado.

Reglas: respeta estrictamente el tipo de dieta y los ingredientes a evitar. No inventes alérgenos. Sé claro en las cantidades de cada ingrediente.`;

  return llamarGeminiJSON({
    systemPrompt: "Eres un asistente experto en nutrición y cocina que diseña comidas personalizadas ajustadas a objetivos de macros.",
    parts: [{ text: prompt }],
    schema: MEAL_SCHEMA,
    maxOutputTokens: 2048,
  });
}
