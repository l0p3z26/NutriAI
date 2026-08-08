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

const CLAVES = [KEYS.PERFIL, KEYS.OBJETIVOS, KEYS.COMIDAS, KEYS.APIKEY, KEYS.MODELO, KEYS.NOTIF];
const FIRMA = "NutriAI";

const esNativo = () =>
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

// Reúne todos los datos guardados en un único objeto serializable.
export async function construirBackup() {
  const datos = {};
  for (const k of CLAVES) datos[k] = await sg(k);
  return { app: FIRMA, version: 1, exportadoEn: new Date().toISOString(), datos };
}

// Escribe cada clave presente en el backup. Devuelve un resumen de lo restaurado.
export async function restaurarBackup(obj) {
  if (!obj || obj.app !== FIRMA || typeof obj.datos !== "object" || obj.datos === null) {
    throw new Error(traducir("backup.no_valido"));
  }
  const d = obj.datos;
  const restauradas = [];
  for (const k of CLAVES) {
    if (k in d && d[k] != null) { await ss(k, d[k]); restauradas.push(k); }
  }
  if (restauradas.length === 0) {
    throw new Error(traducir("backup.sin_datos"));
  }
  return restauradas;
}

const nombreArchivo = () => `nutriai-backup-${new Date().toISOString().slice(0, 10)}.json`;

// ── Exportar ─────────────────────────────────────────────────────────────────
export async function exportarBackup() {
  const json = JSON.stringify(await construirBackup(), null, 2);
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
