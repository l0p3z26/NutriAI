// ═══════════════════════════════════════════════════════
// MEMORIA DEL ENTRENADOR (ficha aprendida del usuario)
// ═══════════════════════════════════════════════════════
// El entrenador personal "aprende" sobre el usuario sin reentrenar el modelo:
// guardamos localmente una ficha (hechos concretos) que se inyecta en cada
// prompt como contexto. Así, aunque se cambie de clave/API, el contexto sigue.
//
// También llevamos un registro de "comidas sociales" (familiares, cenas fuera…)
// para detectar un PATRÓN: algo puntual no pasa nada, pero si se repite 2+ veces
// por semana el entrenador debe ser firme y pedir que no ponga excusas.
import { sg, ss, KEYS } from "./storage.js";

export const MEMORIA_VACIA = { notas: [], social: [], actualizada: null };

const MS_DIA = 24 * 60 * 60 * 1000;
const MAX_NOTAS = 60;   // tope para que la ficha no crezca sin fin

export async function getMemoria() {
  const m = await sg(KEYS.MEMORIA);
  if (!m || typeof m !== "object") return { ...MEMORIA_VACIA };
  return {
    notas: Array.isArray(m.notas) ? m.notas : [],
    social: Array.isArray(m.social) ? m.social : [],
    actualizada: m.actualizada || null,
  };
}

export async function setMemoria(m) { await ss(KEYS.MEMORIA, m); }

// Añade hechos nuevos a la ficha (dedup por texto, sin distinguir mayúsculas).
export async function anadirNotas(hechos) {
  if (!Array.isArray(hechos) || hechos.length === 0) return;
  const m = await getMemoria();
  const vistos = new Set(m.notas.map((n) => n.toLowerCase().trim()));
  for (const h of hechos) {
    const txt = (h || "").trim();
    if (txt && !vistos.has(txt.toLowerCase())) { m.notas.push(txt); vistos.add(txt.toLowerCase()); }
  }
  if (m.notas.length > MAX_NOTAS) m.notas = m.notas.slice(-MAX_NOTAS);
  m.actualizada = Date.now();
  await setMemoria(m);
}

// Registra que HOY el usuario ha tenido una comida social/familiar (puntual).
export async function registrarComidaSocial() {
  const m = await getMemoria();
  const hoy = new Date().toDateString();
  if (!m.social.some((s) => s.fecha === hoy)) m.social.push({ fecha: hoy, ts: Date.now() });
  // Solo conservamos los últimos 30 días de registro.
  const corte = Date.now() - 30 * MS_DIA;
  m.social = m.social.filter((s) => s.ts >= corte);
  m.actualizada = Date.now();
  await setMemoria(m);
}

// Nº de comidas sociales en los últimos 7 días (para detectar el patrón de excusas).
export async function comidasSocialesSemana() {
  const m = await getMemoria();
  const corte = Date.now() - 7 * MS_DIA;
  return m.social.filter((s) => s.ts >= corte).length;
}

export async function borrarMemoria() { await setMemoria({ ...MEMORIA_VACIA }); }
