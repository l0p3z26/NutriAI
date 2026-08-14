// ═══════════════════════════════════════════════════════
// AVISO DE ACTUALIZACIÓN (solo Android)
// ═══════════════════════════════════════════════════════
// La app no tiene servidor propio. Para avisar a versiones antiguas de que hay
// una nueva, al arrancar consultamos un pequeño version.json alojado en el repo
// de GitHub (como asset de una release estable). Si el build publicado es mayor
// que el instalado, mostramos un aviso con enlace a GitHub para actualizar.
//
// La petición va por el HTTP NATIVO de Capacitor (CapacitorHttp), así evitamos
// problemas de CORS del WebView.
import { Capacitor, CapacitorHttp } from "@capacitor/core";

// URL estable del asset. Para publicar una actualización basta con sustituir
// este archivo (mismo tag) subiendo la build/mensaje nuevos.
const VERSION_URL = "https://github.com/l0p3z26/NutriAI/releases/download/v1.0.0/version.json";
// A dónde mandamos al usuario a actualizar (por defecto, la última release).
const URL_DESCARGA = "https://github.com/l0p3z26/NutriAI/releases/latest";

const esAndroid = () =>
  typeof window !== "undefined" &&
  Capacitor?.isNativePlatform?.() &&
  Capacitor?.getPlatform?.() === "android";

async function buildInstalado() {
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return Number(info?.build) || 0;
  } catch { return 0; }
}

// Devuelve { build, version, url, mensaje } si hay una versión más nueva; si no, null.
export async function comprobarActualizacion() {
  if (!esAndroid()) return null;
  try {
    const actual = await buildInstalado();
    const res = await CapacitorHttp.get({
      url: VERSION_URL,
      headers: { "Cache-Control": "no-cache", Accept: "application/json" },
      readTimeout: 8000, connectTimeout: 8000,
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const remoto = Number(data?.build) || 0;
    if (remoto > actual) {
      return {
        build: remoto,
        version: data?.version || "",
        url: data?.url || URL_DESCARGA,
        mensaje: data?.mensaje || "",
      };
    }
  } catch { /* sin conexión o json no disponible: no molestamos */ }
  return null;
}
