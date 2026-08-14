// ═══════════════════════════════════════════════════════
// CLAVE Y MODELO DE GEMINI (solo versión web/APK)
// ═══════════════════════════════════════════════════════
// En la versión pública (móvil/web) cada usuario trae su propia clave de
// Google AI Studio. Este módulo es la ÚNICA fuente de la clave y del modelo:
// tanto la pantalla de conexión como gemini-client.js leen de aquí.
//
// En Electron (escritorio) NADA de esto se usa: la clave va incrustada en el
// proceso principal y las llamadas van por IPC, no por gemini-client.js.
import { GoogleGenAI } from "@google/genai";
import { sg, ss, KEYS } from "./storage.js";
import { traducir } from "./i18n.jsx";

// Modelo predeterminado. Si Google renombrase o retirase este ID, la validación
// con llamada de prueba real lo detectará y el usuario podrá elegir otro.
export const MODELO_POR_DEFECTO = "gemini-3.7-flash";

// Valor especial del desplegable para escribir un ID de modelo a mano.
export const MODELO_PERSONALIZADO = "__personalizado__";

// Lista curada de modelos con nivel gratuito en Google AI Studio.
// ⚠️ Verificar los IDs exactos en https://aistudio.google.com/ — pueden cambiar.
export const MODELOS_GEMINI = [
  { v: "gemini-3.7-flash",      l: "Gemini 3.7 Flash (recomendado)" },
  { v: "gemini-3.6-flash",      l: "Gemini 3.6 Flash" },
  { v: MODELO_PERSONALIZADO,    l: "Otro (escribir el ID a mano)" },
];

// ── Multi-clave con rotación ─────────────────────────────────────────────────
// La app admite varias claves. Cada una es { key, invalida, agotadaHasta }.
// Cuando una da error de cuota (429) se marca "agotada" un rato y se rota a la
// siguiente usable; si es inválida, se marca y no se reintenta. Todo local.
const COOLDOWN_AGOTADA = 5 * 60 * 1000;   // reactivar una clave agotada tras 5 min
const usable = (k) => !k.invalida && (!k.agotadaHasta || k.agotadaHasta <= Date.now());

export async function getApiKeys() {
  let list = await sg(KEYS.APIKEYS);
  if (!Array.isArray(list)) list = [];
  // Migración desde la clave única antigua (KEYS.APIKEY).
  if (list.length === 0) {
    const legacy = ((await sg(KEYS.APIKEY)) || "").trim();
    if (legacy) { list = [{ key: legacy, invalida: false, agotadaHasta: null }]; await ss(KEYS.APIKEYS, list); }
  }
  return list;
}
export async function setApiKeys(list) { await ss(KEYS.APIKEYS, Array.isArray(list) ? list : []); }

// Clave activa = primera usable (reactiva las agotadas cuya espera ya pasó).
export async function getActiveApiKey() {
  const list = await getApiKeys();
  const k = list.find(usable);
  return k ? k.key : "";
}
// Compat: el resto del código sigue llamando getApiKey().
export async function getApiKey() { return await getActiveApiKey(); }

export async function addApiKey(clave) {
  const c = (clave || "").trim();
  if (!c) return;
  const list = await getApiKeys();
  const ya = list.find((k) => k.key === c);
  if (ya) { ya.invalida = false; ya.agotadaHasta = null; }
  else list.push({ key: c, invalida: false, agotadaHasta: null });
  await setApiKeys(list);
}
export async function removeApiKey(clave) {
  await setApiKeys((await getApiKeys()).filter((k) => k.key !== clave));
}
// Compat (onboarding de una sola clave): deja la lista con esa clave.
export async function setApiKey(clave) {
  const c = (clave || "").trim();
  await setApiKeys(c ? [{ key: c, invalida: false, agotadaHasta: null }] : []);
  await ss(KEYS.APIKEY, c);
}
export async function clearApiKey() { await setApiKeys([]); await ss(KEYS.APIKEY, ""); }

export async function marcarAgotada(clave, ms = COOLDOWN_AGOTADA) {
  const list = await getApiKeys();
  const e = list.find((k) => k.key === clave);
  if (e) { e.agotadaHasta = Date.now() + ms; await setApiKeys(list); }
}
export async function marcarInvalida(clave) {
  const list = await getApiKeys();
  const e = list.find((k) => k.key === clave);
  if (e) { e.invalida = true; await setApiKeys(list); }
}
export async function hayClaveUsable() { return (await getApiKeys()).some(usable); }

// Estado legible de una clave para la UI: "activa" | "agotada" | "invalida".
export function estadoClave(k) {
  if (k.invalida) return "invalida";
  if (k.agotadaHasta && k.agotadaHasta > Date.now()) return "agotada";
  return "activa";
}

export async function getModelo() {
  // Valor vacío = "auto": sigue SIEMPRE el modelo recomendado actual, así las
  // futuras actualizaciones del recomendado se aplican solas (sin re-seleccionar).
  return (await sg(KEYS.MODELO)) || MODELO_POR_DEFECTO;
}
export async function setModelo(modelo) {
  const m = (modelo || "").trim();
  // Si eligen el recomendado, guardamos "auto" (vacío) para que se actualice
  // solo. Solo se fija si eligen un modelo distinto a mano.
  await ss(KEYS.MODELO, (!m || m === MODELO_POR_DEFECTO) ? "" : m);
}

// Migración: quien tuviera fijado un modelo por defecto ANTIGUO pasa a "auto",
// para no quedarse anclado a un modelo viejo tras actualizar la app. Versionada:
// si añadimos un recomendado nuevo, subimos MIGR_VER para que vuelva a correr.
const MIGR_VER = 2;
const MODELOS_ANTIGUOS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
export async function migrarModeloAuto() {
  const v = Number(await sg(KEYS.MODELO_MIGR)) || 0;
  if (v >= MIGR_VER) return;
  await ss(KEYS.MODELO_MIGR, MIGR_VER);
  const m = await sg(KEYS.MODELO);
  if (MODELOS_ANTIGUOS.includes(m)) await ss(KEYS.MODELO, "");
}

// ── Errores ─────────────────────────────────────────────────────────────────
// ¿El error viene de una clave inválida / sin permiso? (para volver a pedirla)
export function esErrorDeClave(e) {
  const m = (e?.message || String(e) || "").toLowerCase();
  return (
    m.includes("api key") || m.includes("api_key") || m.includes("unauthenticated") ||
    m.includes("permission") || m.includes("unauthorized") ||
    m.includes("401") || m.includes("403")
  );
}

// ¿El error es por cuota/límite agotado? (para rotar a otra clave)
export function esErrorDeCuota(e) {
  const m = (e?.message || String(e) || "").toLowerCase();
  return m.includes("quota") || m.includes("rate") || m.includes("429") || m.includes("resource_exhausted");
}

// Traduce un error crudo de la API a un mensaje claro en el idioma del usuario.
export function traducirError(e) {
  const m = (e?.message || String(e) || "").toLowerCase();
  if (m.includes("api key") || m.includes("api_key") || m.includes("unauthenticated") ||
      m.includes("permission") || m.includes("unauthorized") || m.includes("401") || m.includes("403")) {
    return traducir("err.clave_invalida");
  }
  if (m.includes("not found") || m.includes("404") ||
      (m.includes("model") && (m.includes("support") || m.includes("not")))) {
    return traducir("err.modelo_inexistente");
  }
  if (m.includes("invalid argument") || m.includes("invalid_argument") || m.includes("\"code\":400") || m.includes("code: 400")) {
    return traducir("err.modelo_incompatible");
  }
  if (m.includes("quota") || m.includes("rate") || m.includes("429") || m.includes("resource_exhausted")) {
    return traducir("err.sin_cuota");
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to") || m.includes("connect")) {
    return traducir("err.sin_conexion");
  }
  return e?.message || traducir("err.validar_generico");
}

// ── Validación con llamada de prueba real ────────────────────────────────────
// Comprueba clave + modelo juntos con el menor gasto posible. NO usa el cliente
// guardado: crea uno temporal con la clave candidata que aún no está persistida.
export async function validarClaveYModelo({ apiKey, modelo }) {
  const clave = (apiKey || "").trim();
  if (!clave) return { ok: false, error: traducir("conexion.err_clave") };
  const model = (modelo || "").trim() || MODELO_POR_DEFECTO;
  try {
    const ai = new GoogleGenAI({ apiKey: clave });
    await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      config: { maxOutputTokens: 8, thinkingConfig: { thinkingBudget: 0 } },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: traducirError(e) };
  }
}
