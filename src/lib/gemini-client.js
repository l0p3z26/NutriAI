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
import {
  getApiKeys, getActiveApiKey, getModelo, MODELOS_GEMINI, MODELO_PERSONALIZADO,
  esErrorDeClave, esErrorDeCuota, esErrorDeModeloSaturado, marcarAgotada, marcarInvalida,
} from "./apiKey.js";
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

// Un cliente por clave (cacheado). Se crea bajo demanda al rotar.
const _clients = new Map();
function clientPara(apiKey) {
  let c = _clients.get(apiKey);
  if (!c) { c = new GoogleGenAI({ apiKey }); _clients.set(apiKey, c); }
  return c;
}

// Ejecuta `fn(cliente)` rotando entre las claves usables:
//  · error de CUOTA (429) → marca la clave agotada y prueba la siguiente.
//  · clave INVÁLIDA        → la marca inválida y prueba la siguiente.
//  · otro error            → se propaga (no rota).
// Si no queda ninguna clave usable, lanza un error claro y avisa a la app.
async function conRotacion(fn) {
  let ultimo = null;
  for (let i = 0; i < 50; i++) {
    const apiKey = await getActiveApiKey();
    if (!apiKey) {
      const hayClaves = (await getApiKeys()).length > 0;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(hayClaves ? "nutriai:claves-agotadas" : "nutriai:clave-invalida"));
      }
      throw new Error(traducir(hayClaves ? "err.todas_agotadas" : "err.falta_clave"));
    }
    try {
      return await fn(clientPara(apiKey));
    } catch (e) {
      ultimo = e;
      if (esErrorDeCuota(e)) { await marcarAgotada(apiKey); continue; }
      if (esErrorDeClave(e)) { await marcarInvalida(apiKey); continue; }
      console.error("[NutriAI] Error de la API de Gemini:", e?.message || String(e));
      throw new Error(e?.message || String(e) || "Error desconocido al llamar a Gemini.");
    }
  }
  throw ultimo || new Error(traducir("err.todas_agotadas"));
}

// ── Cambio de modelo automático y silencioso (alta demanda) ─────────────────
// El modelo predeterminado es SIEMPRE el que el usuario eligió en Ajustes →
// Conectar IA (getModelo()). Pero si Google devuelve que ESE modelo está
// saturado (503/UNAVAILABLE, no un problema de la clave), reintentamos la MISMA
// petición con otro modelo del catálogo, sin avisar al usuario ni tocar su
// preferencia guardada — solo afecta a esta llamada puntual. Se aplica a TODAS
// las llamadas con salida estructurada: Análisis, Comidas frecuentes (reusa
// analizarComida), Despensa, Crear comidas y Entrenador.
async function conFallbackModelo(ejecutar) {
  const elegido = await getModelo();
  const otros = MODELOS_GEMINI.map((m) => m.v).filter((v) => v !== elegido && v !== MODELO_PERSONALIZADO);
  const candidatos = [elegido, ...otros];
  let ultimo = null;
  for (const modelo of candidatos) {
    try {
      return await ejecutar(modelo);
    } catch (e) {
      ultimo = e;
      if (esErrorDeModeloSaturado(e) && modelo !== candidatos[candidatos.length - 1]) {
        console.warn(`[NutriAI] Modelo "${modelo}" saturado, probando con otro en silencio…`);
        continue;
      }
      throw e;
    }
  }
  throw ultimo;
}

// Si Gemini corta la respuesta a mitad de generar el JSON (p. ej. por gastar el
// límite de tokens "pensando" antes de escribir, y quedarse sin margen para
// terminar), JSON.parse falla. En vez de enseñarle al usuario el JSON crudo
// (p. ej. `{"reply":"¡Hola! Hoy te has qued`), rescatamos a mano el contenido
// de "reply" con una regex tolerante a que falte la comilla de cierre.
export function rescatarReply(texto) {
  const m = String(texto || "").match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return texto;
  return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

async function llamarGeminiJSON({ systemPrompt, parts, schema, maxOutputTokens = 2048 }) {
  const config = {
    // Directiva de idioma para que la IA responda en el idioma del usuario.
    systemInstruction: `${systemPrompt} ${getInstruccionIdiomaIA()}`,
    responseMimeType: "application/json",
    responseSchema: schema,
    maxOutputTokens,
    // NB: NO fijamos thinkingConfig. Los modelos Gemini 3.x rechazan
    // (INVALID_ARGUMENT) desactivar el "thinking" (budget 0) cuando se pide
    // salida estructurada (responseSchema). Dejamos que el modelo decida.
  };
  const response = await conFallbackModelo((modelo) => conRotacion((ai) => ai.models.generateContent({
    model: modelo,
    contents: [{ role: "user", parts }],
    config,
  })));

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

// ── Chat del entrenador personal ─────────────────────────────────────────────
// La respuesta llega como JSON: el mensaje para el usuario + hechos nuevos que
// aprender sobre él + si ha reportado una comida social puntual hoy. Así, en una
// sola llamada, respondemos y actualizamos la ficha (memoria.js) sin gasto extra.
const COACH_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    memory_add: { type: "ARRAY", items: { type: "STRING" } },
    social_meal_today: { type: "BOOLEAN" },
  },
  required: ["reply", "memory_add", "social_meal_today"],
};

// `contents` es el historial multi-turno de Gemini: [{ role:"user"|"model", parts:[{text}] }].
export async function chatCoach({ systemPrompt, contents, maxOutputTokens = 2048 }) {
  const config = {
    systemInstruction: `${systemPrompt} ${getInstruccionIdiomaIA()}`,
    responseMimeType: "application/json",
    responseSchema: COACH_SCHEMA,
    maxOutputTokens,
    // Sin thinkingConfig: Gemini 3.x rechaza budget 0 con salida estructurada.
  };
  // El entrenador SIEMPRE admite el cambio silencioso de modelo por alta demanda.
  const response = await conFallbackModelo((modelo) => conRotacion((ai) => ai.models.generateContent({
    model: modelo,
    contents,
    config,
  })));

  const texto = response.text;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (!texto) {
    if (finishReason === "MAX_TOKENS") throw new Error(traducir("err.respuesta_larga"));
    throw new Error(traducir("err.sin_resultado"));
  }
  try {
    const o = JSON.parse(texto);
    return {
      reply: typeof o.reply === "string" ? o.reply : "",
      memory_add: Array.isArray(o.memory_add) ? o.memory_add : [],
      social_meal_today: !!o.social_meal_today,
    };
  } catch {
    // JSON inválido/cortado: rescatamos el "reply" a mano en vez de enseñar el
    // JSON crudo al usuario.
    return { reply: rescatarReply(texto), memory_add: [], social_meal_today: false };
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
