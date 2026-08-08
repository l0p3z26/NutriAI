import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Store from "electron-store";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// El .env vive junto al proyecto en desarrollo, y junto al ejecutable
// (carpeta "resources") una vez empaquetado con electron-builder
// (ver "extraResources" en package.json > build).
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

// Importado dinámicamente DESPUÉS de dotenv.config(): gemini.js solo lee
// process.env dentro de funciones (nunca a nivel de módulo), así que el
// orden aquí es por claridad, no por necesidad estricta.
const gemini = await import("./gemini.js");

const store = new Store({ name: "nutriai-data" });

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 900,
    minWidth: 380,
    minHeight: 640,
    backgroundColor: "#06080F",
    show: false, // se muestra en "ready-to-show" para no ver una ventana vacía
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Aparece solo cuando el primer frame (el splash de index.html) está listo.
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Cualquier enlace externo se abre en el navegador del sistema, nunca
  // dentro de la propia ventana de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  loadApp();
}

function loadApp(intentos = 0) {
  if (!app.isPackaged) {
    const devUrl = "http://localhost:5173";
    mainWindow.loadURL(devUrl).catch(() => {
      // Vite todavía no ha arrancado; reintenta unas cuantas veces antes de rendirse.
      if (intentos < 40) setTimeout(() => loadApp(intentos + 1), 300);
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// ═══════════════════════════════════════════════════════
// IPC: almacenamiento local (electron-store → JSON en disco del usuario)
// ═══════════════════════════════════════════════════════
ipcMain.handle("storage:get", (_e, key) => {
  const value = store.get(key);
  return value === undefined ? null : value;
});

ipcMain.handle("storage:set", (_e, key, value) => {
  store.set(key, value);
  return true;
});

// ═══════════════════════════════════════════════════════
// IPC: análisis con Gemini (el fetch real y la API key viven solo aquí)
// ═══════════════════════════════════════════════════════
ipcMain.handle("ai:analizarComida", (_e, payload) => gemini.analizarComida(payload));
ipcMain.handle("ai:analizarDespensa", (_e, payload) => gemini.analizarDespensa(payload));
ipcMain.handle("ai:crearComida", (_e, payload) => gemini.crearComida(payload));

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
