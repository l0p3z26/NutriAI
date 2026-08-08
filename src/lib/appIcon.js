// ═══════════════════════════════════════════════════════
// ICONO DEL LANZADOR (solo Android)
// ═══════════════════════════════════════════════════════
// Cambia el icono de la app entre los alias declarados en AndroidManifest
// (IconDefault, IconLeaf) mediante el plugin nativo AppIconPlugin.java.
// El cambio es por dispositivo: solo afecta al móvil del usuario que elige.
// En web/Electron no hay icono de lanzador, así que el selector no se muestra.
import { registerPlugin, Capacitor } from "@capacitor/core";
import { sg, ss, KEYS } from "./storage.js";

const AppIcon = registerPlugin("AppIcon");

// id → debe coincidir con el android:name del <activity-alias> del manifest.
export const ICONOS = [
  { id: "IconDefault", nombre: "Clásico", preview: "icon-preview-default.png" },
  { id: "IconLeaf",    nombre: "Hoja",    preview: "icon-preview-leaf.png" },
];

export const ICONO_POR_DEFECTO = "IconDefault";

// ¿Se puede cambiar el icono aquí? Solo en Android nativo.
export function soportaCambioIcono() {
  return (
    typeof Capacitor !== "undefined" &&
    Capacitor.isNativePlatform?.() &&
    Capacitor.getPlatform?.() === "android"
  );
}

export async function getIconoActual() {
  return (await sg(KEYS.ICONO)) || ICONO_POR_DEFECTO;
}

export async function cambiarIcono(id) {
  if (!ICONOS.some((i) => i.id === id)) throw new Error("Icono desconocido.");
  await AppIcon.setIcon({ name: id });   // habilita el alias, desactiva los demás
  await ss(KEYS.ICONO, id);
}
