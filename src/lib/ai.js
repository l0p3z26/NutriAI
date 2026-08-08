// ═══════════════════════════════════════════════════════
// ANÁLISIS IA (lado renderer)
// ═══════════════════════════════════════════════════════
// Estas funciones mantienen EXACTAMENTE la misma firma que en el artefacto
// original para no tocar las pantallas. La diferencia: el fetch real a Gemini
// y la API key viven en el proceso principal (electron/gemini.js); aquí solo
// se hace la petición vía IPC y se normaliza la respuesta.

import * as geminiWeb from "./gemini-client.js";
import { traducir } from "./i18n.jsx";

// En Electron las llamadas van por IPC (window.nutriai → proceso principal,
// clave protegida). En web/APK no hay proceso principal, así que se llama a
// Gemini directamente desde el navegador (gemini-client.js, clave incrustada).
const usarBridge = () => typeof window !== "undefined" && !!window.nutriai;

// Convierte una respuesta JSON cruda de la IA (un único plato) en el objeto
// de comida estándar que usa toda la app. Reutilizado en los 3 flujos de IA.
export function normalizarComida(p, userNote = "", macrosUsuario = null) {
  const n = p.nutrition_estimate || {};
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
    userNote,
    mealName:       p.meal_name || traducir("data.comida_desconocida"),
    summary:        p.summary || "",
    // Valores del usuario son definitivos (Opción A); si no los proporcionó, usa los de la IA
    caloriesKcal:   macrosUsuario?.calorias  != null ? macrosUsuario.calorias  : (n.calories_kcal    || 0),
    proteinG:       macrosUsuario?.proteinas != null ? macrosUsuario.proteinas : (n.protein_g       || 0),
    carbohydratesG: macrosUsuario?.carbos    != null ? macrosUsuario.carbos    : (n.carbohydrates_g || 0),
    fatG:           macrosUsuario?.grasas    != null ? macrosUsuario.grasas    : (n.fat_g           || 0),
    fiberG:         n.fiber_g,
    sugarG:         n.sugar_g,
    sodiumMg:       n.sodium_mg,
    confidence:     p.confidence || "low",
    detectedFoods:  p.detected_foods  || [],
    // Recetas (Crear / Despensa): ingredientes con cantidad + pasos de preparación.
    ingredients:    Array.isArray(p.ingredients) ? p.ingredients : [],
    steps:          Array.isArray(p.steps) ? p.steps : [],
    uncertaintyNotes: p.uncertainty_notes || [],
    accuracyTips:   p.accuracy_tips   || [],
    healthNotes:    p.health_notes    || [],
  };
}

export async function analizarIA(b64, mime, nota, macrosUsuario = null) {
  const p = usarBridge()
    ? await window.nutriai.analizarComida({ b64, mime, nota, macrosUsuario })
    : await geminiWeb.analizarComida({ b64, mime, nota, macrosUsuario });
  return normalizarComida(p, nota, macrosUsuario);
}

// ── Despensa: sugiere 2-3 recetas a partir de una lista o foto de productos ──
export async function analizarDespensaIA(itemsTexto, b64, mime, perfil) {
  const lista = usarBridge()
    ? await window.nutriai.analizarDespensa({ itemsTexto, b64, mime, perfil })
    : await geminiWeb.analizarDespensa({ itemsTexto, b64, mime, perfil });
  const notaBase = itemsTexto?.trim() ? `${traducir("data.despensa")}: ${itemsTexto.trim()}` : traducir("data.receta_foto");

  return lista.map((s, i) => ({
    ...normalizarComida(s, notaBase),
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
  }));
}

// ── Creador de comidas: genera VARIAS ideas de receta (dieta, exclusiones, etc.) ──
export async function crearComidaIA({ dietType, exclusiones, tipoComida, intensidad, entrenamiento }) {
  const payload = { dietType, exclusiones, tipoComida, intensidad, entrenamiento };
  const res = usarBridge()
    ? await window.nutriai.crearComida(payload)
    : await geminiWeb.crearComida(payload);
  // Web/APK devuelve un array; el puente antiguo (Electron) puede devolver un único objeto.
  const lista = Array.isArray(res) ? res : (res?.suggestions ? res.suggestions : (res ? [res] : []));

  // Nota descriptiva (se muestra en la tarjeta), localizada al idioma del usuario.
  const DIETA_KEY = { none: "dieta.none_crear", high_protein: "dieta.high_protein", low_carb: "dieta.low_carb", vegetarian: "dieta.vegetarian", vegan: "dieta.vegan", other: "dieta.other" };
  const CTX_KEY = { desayuno: "crear.desayuno", comida: "crear.comida", cena: "crear.cena", ligera: "crear.ligera", pesada: "crear.pesada" };
  const dietaStr = traducir(DIETA_KEY[dietType] || "dieta.none_crear");
  const contexto = [tipoComida, intensidad].filter(Boolean).map(x => traducir(CTX_KEY[x] || x)).join(" · ");
  const prefijo = contexto ? `${traducir("data.comida_creada")} (${contexto})` : traducir("data.comida_creada");
  const nota = `${prefijo}: ${traducir("data.dieta")} ${dietaStr}${exclusiones?.length ? `, ${traducir("data.sin")} ${exclusiones.join(", ")}` : ""}`;

  return lista.map((s, i) => ({
    ...normalizarComida(s, nota),
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
  }));
}

// Heurística simple (no ML) basada en el histórico de feedback de saciedad.
// Necesita al menos 3 comidas valoradas para dar una recomendación; si no,
// devuelve null y crearComidaIA no ajusta nada.
export function calcularSesgoSaciedad(historial) {
  const conFeedback = (historial || []).filter(m => m.satiety);
  if (conFeedback.length < 3) return null;

  const cuenta = { hambre: 0, normal: 0, bien: 0, lleno: 0 };
  conFeedback.forEach(m => { cuenta[m.satiety] = (cuenta[m.satiety] || 0) + 1; });
  const total = conFeedback.length;
  const pctHambre = cuenta.hambre / total;
  const pctLleno  = cuenta.lleno / total;

  if (pctHambre >= 0.35 && pctHambre > pctLleno) {
    return {
      instruccion: "El histórico del usuario indica que suele quedarse con hambre en comidas similares; aumenta ligeramente las cantidades (~10-15%) sin romper el objetivo de macros.",
      aviso: "Cantidades ligeramente aumentadas según tu histórico de saciedad.",
    };
  }
  if (pctLleno >= 0.35 && pctLleno > pctHambre) {
    return {
      instruccion: "El histórico del usuario indica que suele llenarse en exceso en comidas similares; reduce ligeramente las cantidades (~10-15%) sin romper el objetivo de macros.",
      aviso: "Cantidades ligeramente reducidas según tu histórico de saciedad.",
    };
  }
  return null;
}
