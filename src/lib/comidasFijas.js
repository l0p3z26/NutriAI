// ═══════════════════════════════════════════════════════
// COMIDAS FRECUENTES (se añaden solas cada día) + TIPOS DE COMIDA
// ═══════════════════════════════════════════════════════
// Muchas comidas se repiten (p. ej. el mismo desayuno cada día). El usuario
// define una comida frecuente por FRANJA y la app la añade automáticamente cada
// día dentro de su franja horaria, a la hora de inicio (las horas primeras).
import { sg, ss, KEYS } from "./storage.js";

// Etiquetas de tipo para marcar/insigniar una comida (selector manual del análisis).
export const TIPOS_COMIDA = [
  { id: "desayuno", emoji: "🍳" },
  { id: "comida",   emoji: "🍽️" },
  { id: "merienda", emoji: "🍎" },
  { id: "cena",     emoji: "🌙" },
  { id: "postre",   emoji: "🍰" },
];

export const emojiTipo = (t) => TIPOS_COMIDA.find((x) => x.id === t)?.emoji || "🍽️";

// Franjas de las comidas frecuentes (en minutos desde medianoche). `tipo` es la
// etiqueta que se usa para la insignia. Se añaden a la hora `ini` de cada franja.
export const FRANJAS_FRECUENTES = [
  { id: "desayuno",        tipo: "desayuno", emoji: "🍳", ini: 8 * 60,  fin: 11 * 60 },
  { id: "merienda_manana", tipo: "merienda", emoji: "🥪", ini: 11 * 60, fin: 13 * 60 },
  { id: "comida",          tipo: "comida",   emoji: "🍽️", ini: 13 * 60, fin: 15 * 60 },
  { id: "merienda_tarde",  tipo: "merienda", emoji: "🍎", ini: 17 * 60, fin: 19 * 60 },
  { id: "cena",            tipo: "cena",     emoji: "🌙", ini: 21 * 60, fin: 23 * 60 },
];

const dosDig = (n) => String(n).padStart(2, "0");
export const fmtHoraMin = (min) => `${dosDig(Math.floor(min / 60))}:${dosDig(min % 60)}`;
export const fmtFranja = (s) => `${fmtHoraMin(s.ini)}–${fmtHoraMin(s.fin)}`;

// { desayuno: {mealName, caloriesKcal, proteinG, carbohydratesG, fatG}, ... }
export async function getComidasFijas() {
  const g = await sg(KEYS.COMIDAS_FIJAS);
  return g && typeof g === "object" ? g : {};
}

export async function setComidaFija(slotId, plantilla) {
  const g = await getComidasFijas();
  // Guardamos CUÁNDO se configuró: así no se rellena retroactivamente la franja
  // de hoy si ya había empezado; solo se añade en la próxima hora de activación.
  g[slotId] = { ...plantilla, desde: Date.now() };
  await ss(KEYS.COMIDAS_FIJAS, g);
}

export async function borrarComidaFija(slotId) {
  const g = await getComidasFijas();
  delete g[slotId];
  await ss(KEYS.COMIDAS_FIJAS, g);
}

// Construye una comida real a partir de una frecuente, fechada a la hora de
// inicio de su franja (hoy).
function comidaFrecuente(slot, fija) {
  const d = new Date();
  d.setHours(Math.floor(slot.ini / 60), slot.ini % 60, 0, 0);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: d.toISOString(),
    mealType: slot.tipo,
    frecuenteId: slot.id,     // marca para no duplicar y saber que es automática
    mealName: fija.mealName,
    summary: "",
    caloriesKcal:   Number(fija.caloriesKcal)   || 0,
    proteinG:       Number(fija.proteinG)        || 0,
    carbohydratesG: Number(fija.carbohydratesG)  || 0,
    fatG:           Number(fija.fatG)            || 0,
    fiberG: null, sugarG: null, sodiumMg: null,
    confidence: "high",
    detectedFoods: [], uncertaintyNotes: [], accuracyTips: [], healthNotes: [],
  };
}

// Devuelve las comidas frecuentes que toca añadir HOY (franjas ya empezadas y no
// añadidas todavía). Registra cuáles se han añadido para no repetir aunque el
// usuario las borre. Prioriza las franjas más tempranas (van ordenadas).
export async function autoAnadirFrecuentes() {
  const fijas = await getComidasFijas();
  const activas = FRANJAS_FRECUENTES.filter((s) => fijas[s.id]);
  if (!activas.length) return [];

  const hoy = new Date().toDateString();
  let reg = await sg(KEYS.FREC_ADDED);
  if (!reg || reg.fecha !== hoy) reg = { fecha: hoy, slots: [] };

  const ahora = new Date();

  const nuevas = [];
  for (const s of activas) {
    if (reg.slots.includes(s.id)) continue;   // ya añadida hoy
    // Inicio de su franja HOY.
    const inicioHoy = new Date();
    inicioHoy.setHours(Math.floor(s.ini / 60), s.ini % 60, 0, 0);
    if (ahora < inicioHoy) continue;                        // la franja aún no ha empezado
    const desde = fijas[s.id].desde || 0;
    if (inicioHoy.getTime() < desde) continue;             // se configuró DESPUÉS de que empezara hoy → espera a mañana
    nuevas.push(comidaFrecuente(s, fijas[s.id]));
    reg.slots.push(s.id);
  }
  if (nuevas.length) await ss(KEYS.FREC_ADDED, reg);
  return nuevas;
}
