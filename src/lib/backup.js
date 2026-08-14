// ═══════════════════════════════════════════════════════
// COPIA DE SEGURIDAD (exportar / importar)
// ═══════════════════════════════════════════════════════
// Permite guardar todos los datos de la app en un archivo .json y restaurarlos
// después (en el mismo móvil tras reinstalar, o en otro dispositivo).
//
// Exportar:
//   - Android (Capacitor): escribe el archivo y abre el diálogo de compartir
//     (para guardarlo en Drive, enviarlo por WhatsApp, etc.).
//   - Web/Electron: descarga por blob (<a download>).
// Importar: <input type="file"> en todas las plataformas (el WebView de Android
//   también abre el selector de archivos).
import { sg, ss, KEYS } from "./storage.js";
import { traducir } from "./i18n.jsx";

// Categorías seleccionables al exportar. El usuario decide qué incluir. Las
// claves de API son SENSIBLES y van desmarcadas por defecto (llevan tu cuenta de
// Google): solo deberías incluirlas si el archivo se queda en tus manos.
export const CATEGORIAS = [
  { id: "perfil",     claves: [KEYS.PERFIL, KEYS.OBJETIVOS] },
  { id: "comidas",    claves: [KEYS.COMIDAS, KEYS.COMIDAS_FIJAS] },
  { id: "entrenador", claves: [KEYS.CHATS, KEYS.CHAT, KEYS.RESUMENES, KEYS.MEMORIA] },
  { id: "ajustes",    claves: [KEYS.MODELO, KEYS.NOTIF, KEYS.NOTIF_COACH, KEYS.IDIOMA, KEYS.ICONO, KEYS.OPTIM] },
  { id: "claves",     claves: [KEYS.APIKEYS, KEYS.APIKEY], sensible: true },
];

// Todas las claves que puede contener un backup (para restaurar todo lo presente).
const TODAS_CLAVES = CATEGORIAS.flatMap((c) => c.claves);

// Selección por defecto: todo salvo las claves de API (sensibles).
export function seleccionPorDefecto() {
  const s = {};
  for (const c of CATEGORIAS) s[c.id] = !c.sensible;
  return s;
}

const FIRMA = "NutriAI";

const esNativo = () =>
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

// Reúne los datos de las categorías seleccionadas en un objeto serializable.
export async function construirBackup(seleccion) {
  const sel = seleccion || seleccionPorDefecto();
  const datos = {};
  for (const cat of CATEGORIAS) {
    if (!sel[cat.id]) continue;
    for (const k of cat.claves) datos[k] = await sg(k);
  }
  return { app: FIRMA, version: 2, exportadoEn: new Date().toISOString(), datos };
}

// Escribe cada clave presente en el backup. Devuelve un resumen de lo restaurado.
export async function restaurarBackup(obj) {
  if (!obj || obj.app !== FIRMA || typeof obj.datos !== "object" || obj.datos === null) {
    throw new Error(traducir("backup.no_valido"));
  }
  const d = obj.datos;
  const restauradas = [];
  for (const k of TODAS_CLAVES) {
    if (k in d && d[k] != null) { await ss(k, d[k]); restauradas.push(k); }
  }
  if (restauradas.length === 0) {
    throw new Error(traducir("backup.sin_datos"));
  }
  return restauradas;
}

const nombreArchivo = () => `nutriai-backup-${new Date().toISOString().slice(0, 10)}.json`;

// ── Exportar ─────────────────────────────────────────────────────────────────
export async function exportarBackup(seleccion) {
  const json = JSON.stringify(await construirBackup(seleccion), null, 2);
  const nombre = nombreArchivo();

  if (esNativo()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const escrito = await Filesystem.writeFile({
      path: nombre, data: json, directory: Directory.Cache, encoding: Encoding.UTF8,
    });
    await Share.share({
      title: traducir("backup.share_title"),
      text: traducir("backup.share_text"),
      url: escrito.uri,
      dialogTitle: traducir("backup.share_dialog"),
    });
    return { via: "share", nombre };
  }

  // Web / Electron: descarga por blob.
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  return { via: "download", nombre };
}

// ── Importar ─────────────────────────────────────────────────────────────────
// Lee y parsea el archivo, pero NO escribe nada todavía: devuelve el objeto para
// que la UI pida confirmación antes de reemplazar los datos actuales.
export async function leerArchivoBackup(file) {
  const texto = await file.text();
  let obj;
  try { obj = JSON.parse(texto); }
  catch { throw new Error(traducir("backup.no_json")); }
  if (!obj || obj.app !== FIRMA) {
    throw new Error(traducir("backup.no_parece"));
  }
  return obj;
}
