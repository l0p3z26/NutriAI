// ═══════════════════════════════════════════════════════
// CLIENTE GEMINI (lado navegador / móvil)
// ═══════════════════════════════════════════════════════
// En la versión Electron (escritorio) las llamadas a Gemini viven en el
// proceso principal (electron/gemini.js) y la clave (incrustada) nunca llega al
// renderer. En la versión web/APK (Capacitor) NO hay proceso principal: la app
// corre en un WebView, así que la llamada se hace aquí directamente con la clave
// que el propio usuario introdujo (apiKey.js → almacenamiento local).
//
// IMPORTANTE: este archivo debe mantenerse en paralelo con electron/gemini.js
// (mismos prompts, mismo esquema, mismo modelo). Si cambias uno, cambia el otro.
import { GoogleGenAI } from "@google/genai";
import { getApiKey, getModelo, esErrorDeClave } from "./apiKey.js";
import { traducir, getInstruccionIdiomaIA } from "./i18n.jsx";

const fmt = (n) => (Number.isFinite(n) ? Math.round(n) : 0);

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

// ── Recetas (Crear / Despensa): incluyen ingredientes con cantidad y pasos ──
const INGREDIENTE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    amount: { type: "STRING" },
  },
  required: ["name", "amount"],
};

const RECETA_SCHEMA = {
  type: "OBJECT",
  properties: {
    meal_name: { type: "STRING" },
    summary: { type: "STRING" },
    nutrition_estimate: NUTRITION_SCHEMA,
    ingredients: { type: "ARRAY", items: INGREDIENTE_SCHEMA },
    steps: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "STRING", enum: CONFIDENCE_ENUM },
    health_notes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "meal_name", "summary", "nutrition_estimate",
    "ingredients", "steps", "confidence", "health_notes",
  ],
};

const RECETAS_SCHEMA = {
  type: "OBJECT",
  properties: {
    suggestions: { type: "ARRAY", items: RECETA_SCHEMA },
  },
  required: ["suggestions"],
};

// Etiquetas legibles para el tipo de entrenamiento del perfil (para el prompt).
const ETIQUETAS_ENTRENO = {
  none: "", strength: "entrenamiento de fuerza", hypertrophy: "hipertrofia",
  cardio: "cardio", swimming: "natación", crossfit: "crossfit/funcional",
  sports: "deportes de equipo", running: "running/atletismo", mixed: "mixto", other: "",
};

// El cliente se cachea, pero se reconstruye si el usuario cambia su clave
// (p. ej. desde Ajustes → Conexión). Por eso guardamos la clave con la que se
// creó y comparamos en cada llamada.
let _client = null;
let _clientKey = null;
async function getClient() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(traducir("err.falta_clave"));
  }
  if (!_client || _clientKey !== apiKey) {
    _client = new GoogleGenAI({ apiKey });
    _clientKey = apiKey;
  }
  return _client;
}

async function llamarGeminiJSON({ systemPrompt, parts, schema, maxOutputTokens = 2048 }) {
  const ai = await getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: await getModelo(),
      contents: [{ role: "user", parts }],
      config: {
        // Añadimos la directiva de idioma para que la IA responda en el idioma
        // del usuario (nombres de comida, resúmenes, consejos, notas, etc.).
        systemInstruction: `${systemPrompt} ${getInstruccionIdiomaIA()}`,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (e) {
    const msg = e?.message || String(e) || "Error desconocido al llamar a Gemini.";
    // Si la clave dejó de valer (revocada / sin permiso), avisamos a la app
    // para que lleve al usuario de vuelta a la pantalla de conexión.
    if (esErrorDeClave(e) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nutriai:clave-invalida"));
    }
    console.error("[NutriAI] Error de la API de Gemini:", msg);
    throw new Error(msg);
  }

  const texto = response.text;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (!texto) {
    if (finishReason === "MAX_TOKENS") {
      throw new Error(traducir("err.respuesta_larga"));
    }
    throw new Error(traducir("err.sin_resultado"));
  }
  try {
    return JSON.parse(texto);
  } catch {
    console.error("[NutriAI] Respuesta de Gemini no es JSON válido (finishReason:", finishReason, "):", texto);
    throw new Error(traducir("err.no_json"));
  }
}

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

// Instrucción común de formato de receta para Crear y Despensa.
const REGLAS_RECETA =
  "Para cada idea incluye: nombre del plato, un resumen breve, la lista de ingredientes con su cantidad, " +
  "los pasos de preparación (paso a paso, claros y en orden) y una estimación nutricional (calorías y macros) de UNA ración. " +
  "Las cantidades deben ser realistas. No inventes alérgenos.";

export async function analizarDespensa({ itemsTexto, b64, mime, perfil }) {
  const contextoPerfil = [];
  if (perfil?.allergies) contextoPerfil.push(`Alergias/evitar: ${perfil.allergies}`);
  if (perfil?.dietPreference) contextoPerfil.push(`Preferencia de dieta: ${ETIQUETAS_DIETA[perfil.dietPreference] || perfil.dietPreference}`);
  const entreno = ETIQUETAS_ENTRENO[perfil?.trainingType] || "";
  if (entreno) contextoPerfil.push(`Entrenamiento habitual: ${entreno}`);
  const perfilStr = contextoPerfil.length > 0 ? `\nContexto del usuario: ${contextoPerfil.join(". ")}.` : "";

  const itemsStr = itemsTexto?.trim() ? `\nProductos disponibles: ${itemsTexto.trim()}` : "";
  const origenImagen = b64 != null ? " (también se adjunta una foto de la lista/despensa para identificar más productos)" : "";

  const prompt = `El usuario quiere ideas de comidas con lo que tiene en casa.${itemsStr}${origenImagen}${perfilStr}

Propón entre 3 y 4 recetas distintas usando principalmente estos productos (se pueden asumir básicos de despensa como sal, aceite, especias).
${REGLAS_RECETA}

Reglas: respeta alergias y preferencias del usuario si se indican. No inventes productos que no tengan sentido con la lista.`;

  const parts = b64 != null
    ? [{ inlineData: { mimeType: mime, data: b64 } }, { text: prompt }]
    : [{ text: prompt }];

  const p = await llamarGeminiJSON({
    systemPrompt: "Eres un asistente experto en nutrición y cocina.",
    parts,
    schema: RECETAS_SCHEMA,
    maxOutputTokens: 8192,
  });

  return Array.isArray(p.suggestions) ? p.suggestions : [];
}

export async function crearComida({ dietType, exclusiones, tipoComida, intensidad, entrenamiento }) {
  const dietaStr = ETIQUETAS_DIETA[dietType] || "sin restricción específica";
  const exclStr = exclusiones?.length > 0 ? `\nIngredientes a EVITAR: ${exclusiones.join(", ")}.` : "";
  const entreno = ETIQUETAS_ENTRENO[entrenamiento] || "";
  const entrenoStr = entreno ? `\nEl usuario entrena: ${entreno}. Ajusta las ideas a ese tipo de entrenamiento (p. ej. más proteína si es fuerza/hipertrofia).` : "";

  const tipoStr = tipoComida
    ? `\nMomento del día: ${ETIQUETAS_TIPO_COMIDA[tipoComida] || tipoComida}. Propón platos típicos y apropiados para ${ETIQUETAS_TIPO_COMIDA[tipoComida] || tipoComida}.`
    : "";
  const intensidadStr = intensidad === "ligera"
    ? `\nEstilo: comida LIGERA. Fácil de digerir y poco pesada, con ingredientes frescos y métodos de cocción suaves (plancha, horno, vapor, cocido); evita frituras y salsas muy grasas.`
    : intensidad === "pesada"
      ? `\nEstilo: comida PESADA y contundente. Más saciante y sustanciosa.`
      : "";

  const prompt = `Propón entre 3 y 4 ideas de comida DIFERENTES entre sí, para que el usuario elija la que más le apetezca.
Tipo de dieta: ${dietaStr}.${tipoStr}${intensidadStr}${exclStr}${entrenoStr}
${REGLAS_RECETA}

Reglas: respeta estrictamente el tipo de dieta y los ingredientes a evitar. Que sean recetas variadas y apetecibles.`;

  const p = await llamarGeminiJSON({
    systemPrompt: "Eres un asistente experto en nutrición y cocina que propone comidas personalizadas y variadas.",
    parts: [{ text: prompt }],
    schema: RECETAS_SCHEMA,
    maxOutputTokens: 8192,
  });

  return Array.isArray(p.suggestions) ? p.suggestions : [];
}
