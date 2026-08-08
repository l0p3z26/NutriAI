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
export const MODELO_POR_DEFECTO = "gemini-3.5-flash";

// Valor especial del desplegable para escribir un ID de modelo a mano.
export const MODELO_PERSONALIZADO = "__personalizado__";

// Lista curada de modelos con nivel gratuito en Google AI Studio.
// ⚠️ Verificar los IDs exactos en https://aistudio.google.com/ — pueden cambiar.
export const MODELOS_GEMINI = [
  { v: "gemini-3.5-flash",      l: "Gemini 3.5 Flash (recomendado)" },
  { v: "gemini-2.5-flash",      l: "Gemini 2.5 Flash" },
  { v: "gemini-2.5-flash-lite", l: "Gemini 2.5 Flash-Lite" },
  { v: "gemini-2.0-flash",      l: "Gemini 2.0 Flash" },
  { v: "gemini-1.5-flash",      l: "Gemini 1.5 Flash" },
  { v: MODELO_PERSONALIZADO,    l: "Otro (escribir el ID a mano)" },
];

// ── Lectura / escritura persistida ──────────────────────────────────────────
export async function getApiKey() {
  return ((await sg(KEYS.APIKEY)) || "").trim();
}
export async function setApiKey(clave) {
  await ss(KEYS.APIKEY, (clave || "").trim());
}
export async function clearApiKey() {
  await ss(KEYS.APIKEY, "");
}
export async function getModelo() {
  return (await sg(KEYS.MODELO)) || MODELO_POR_DEFECTO;
}
export async function setModelo(modelo) {
  await ss(KEYS.MODELO, (modelo || "").trim() || MODELO_POR_DEFECTO);
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
