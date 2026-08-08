// ═══════════════════════════════════════════════════════
// BOTÓN / GESTO "ATRÁS" DE ANDROID
// ═══════════════════════════════════════════════════════
// El gesto de retroceso del móvil debe comportarse como el botón "Volver" de la
// app: retrocede una pantalla (o cierra una sub-vista) en vez de salir de golpe.
//
// App.jsx escucha el evento `backButton` de @capacitor/app y, antes de aplicar la
// navegación por defecto (según la pantalla actual), da la oportunidad a la
// pantalla visible de "interceptar" el atrás para cerrar primero sus sub-vistas
// (p. ej. en Crear: detalle → ideas → formulario; en Ajustes: idioma → menú).
//
// Uso en una pantalla con sub-vistas:
//   useAtras(() => { if (subVista) { cerrarSubVista(); return true; } return false; });
// Devolver `true` = "yo me encargo" (no navegues). `false` = deja el atrás global.
import { createContext, useContext, useEffect, useRef } from "react";

// Valor = función registrar(fn) → devuelve una función para desregistrar.
export const BackContext = createContext(null);

export function useAtras(handler) {
  const registrar = useContext(BackContext);
  const ref = useRef(handler);
  ref.current = handler;   // mantener siempre la versión más reciente
  useEffect(() => {
    if (!registrar) return;
    return registrar(() => ref.current());
  }, [registrar]);
}
