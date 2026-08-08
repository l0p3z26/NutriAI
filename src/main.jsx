import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { IdiomaProvider } from "./lib/i18n.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <IdiomaProvider>
        <App />
      </IdiomaProvider>
    </ErrorBoundary>
  </StrictMode>
);

// ── Handoff del splash ───────────────────────────────────────────────────────
// El splash nativo (Android) y el splash HTML (index.html) muestran el mismo
// icono sobre #06080F. Cuando React ya ha pintado su primer frame, ocultamos el
// nativo y desvanecemos el HTML: la transición al app es continua, sin negros.
async function ocultarSplashNativo() {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* Plugin no disponible (web/Electron): no hay splash nativo que ocultar. */
  }
}

function retirarSplashHTML() {
  const splash = document.getElementById("nutriai-splash");
  if (!splash) return;
  splash.classList.add("oculto");
  setTimeout(() => splash.remove(), 400); // tras la transición de opacidad
}

// Doble rAF: garantiza que React haya confirmado el primer render antes de retirar.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    ocultarSplashNativo();
    retirarSplashHTML();
  })
);
