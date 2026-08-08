// Puente seguro entre el renderer (React) y el proceso principal.
// contextIsolation está activo, así que esta es la ÚNICA superficie que ve
// el renderer: nunca tiene acceso a Node, a fs, ni a la API key de Gemini.
// Se mantiene en CommonJS (.cjs) a propósito: Electron carga los scripts de
// preload de forma más predecible en CJS aunque el resto del proyecto sea ESM.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nutriai", {
  storageGet: (key) => ipcRenderer.invoke("storage:get", key),
  storageSet: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  analizarComida: (payload) => ipcRenderer.invoke("ai:analizarComida", payload),
  analizarDespensa: (payload) => ipcRenderer.invoke("ai:analizarDespensa", payload),
  crearComida: (payload) => ipcRenderer.invoke("ai:crearComida", payload),
});
