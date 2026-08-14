// ═══════════════════════════════════════════════════════
// ALMACENAMIENTO
// ═══════════════════════════════════════════════════════
// En el artefacto de Claude.ai esto envolvía window.storage. Aquí envuelve
// el puente IPC expuesto por electron/preload.cjs, que a su vez habla con
// electron-store (JSON en disco, en la carpeta de datos del usuario) desde
// el proceso principal. Las pantallas no necesitan saber nada de esto.
export const KEYS = {
  PERFIL: "nai:perfil",
  OBJETIVOS: "nai:objetivos",
  COMIDAS: "nai:comidas",
  COMIDAS_FIJAS: "nai:comidas_fijas",   // comidas frecuentes por franja (desayuno, etc.)
  FREC_ADDED: "nai:frec_added",         // franjas ya auto-añadidas hoy (para no duplicar)
  // Solo versión web/APK: cada usuario trae su propia clave de Gemini y elige
  // el modelo. En Electron la clave va incrustada, así que estas no se usan.
  APIKEY: "nai:apikey",       // (heredado) clave única antigua; se migra a APIKEYS
  APIKEYS: "nai:apikeys",     // lista de claves con rotación automática
  MODELO: "nai:modelo",       // "" = auto (sigue el recomendado); o un ID fijo
  MODELO_MIGR: "nai:modelo_migr",  // marca de migración a modelo "auto" (una vez)
  // Icono del lanzador elegido (solo Android). Ver lib/appIcon.js.
  ICONO: "nai:icono",
  // Idioma de la interfaz (es/en/fr/it/pt). Ver lib/i18n.jsx.
  IDIOMA: "nai:idioma",
  // Notificaciones/recordatorios (solo Android). Ver lib/notificaciones.js.
  NOTIF: "nai:notif",
  // Estado de optimización del sistema (inicio automático marcado por el usuario).
  OPTIM: "nai:optim",
  // Entrenador personal (chat): historial de mensajes y "ficha" aprendida.
  CHAT: "nai:chat",          // (heredado) hilo único antiguo; se migra a CHATS
  CHATS: "nai:chats",        // lista de conversaciones con el entrenador (Chat)
  RESUMENES: "nai:resumenes", // avisos/resúmenes del entrenador (Notificaciones ✉️)
  MEMORIA: "nai:memoria",    // ficha que la IA va aprendiendo sobre el usuario
  COACH_UNREAD: "nai:coach_unread",  // ¿el entrenador tiene mensajes sin leer? (punto rojo)
  NOTIF_COACH: "nai:notif_coach",    // config del resumen diario del entrenador { activado, h, m }
  RESUMEN_PENDIENTE: "nai:resumen_pendiente",  // hay un resumen diario por generar al abrir el chat
};

// En Electron existe el puente window.nutriai (IPC → electron-store en disco).
// En la versión web/APK (Capacitor) no existe, así que caemos a localStorage,
// que el WebView de Android persiste entre reinicios.
const tieneBridge = () => typeof window !== "undefined" && !!window.nutriai;

export const sg = async (k) => {
  try {
    if (tieneBridge()) return await window.nutriai.storageGet(k);
    const raw = localStorage.getItem(k);
    return raw != null ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const ss = async (k, v) => {
  try {
    if (tieneBridge()) { await window.nutriai.storageSet(k, v); return; }
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export const hoy = () => new Date().toDateString();

// Elimina comidas con más de 90 días y persiste el resultado si hubo cambios.
// Devuelve la lista ya depurada de comidas "recientes".
export async function limpiarComidasAntiguas() {
  const todas = (await sg(KEYS.COMIDAS)) ?? [];
  const corte = new Date();
  corte.setDate(corte.getDate() - 90);
  corte.setHours(0, 0, 0, 0);
  const recientes = todas.filter(m => new Date(m.createdAt) >= corte);
  if (todas.length !== recientes.length) {
    await ss(KEYS.COMIDAS, recientes);
  }
  return recientes;
}
