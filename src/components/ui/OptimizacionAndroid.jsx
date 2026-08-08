import { useState, useEffect, useRef } from "react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import {
  abrirInicioAutomatico, abrirAjustesBateria,
  bateriaSinRestricciones, getInicioMarcado, setInicioMarcado,
} from "../../lib/notificaciones.js";

// Dos tarjetas (Inicio automático + Batería sin restricciones). Cada una muestra
// su estado (Pendiente de activar / Activado) y un botón que abre la ruta del
// sistema. La BATERÍA se detecta de verdad (isIgnoringBatteryOptimizations); el
// INICIO AUTOMÁTICO no es detectable por ninguna API, así que se marca como
// activado cuando el usuario vuelve de su pantalla de ajustes.
// `onEstado({ inicio, bateria })` informa al padre (para habilitar "Continuar").
export default function OptimizacionAndroid({ onEstado }) {
  const t = useT();
  const [inicio, setInicio] = useState(false);
  const [bateria, setBateria] = useState(false);
  const visitandoInicio = useRef(false);

  const refrescar = async () => {
    if (visitandoInicio.current) { await setInicioMarcado(true); visitandoInicio.current = false; }
    setInicio(await getInicioMarcado());
    setBateria(await bateriaSinRestricciones());
  };

  useEffect(() => {
    refrescar();
    let quitar;
    (async () => {
      if (!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.())) return;
      const { App } = await import("@capacitor/app");
      const h = await App.addListener("appStateChange", ({ isActive }) => { if (isActive) refrescar(); });
      quitar = () => h.remove();
    })();
    return () => { if (quitar) quitar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { onEstado?.({ inicio, bateria }); }, [inicio, bateria, onEstado]);

  const pulsarInicio = async () => { visitandoInicio.current = true; await abrirInicioAutomatico(); };
  const pulsarBateria = async () => { await abrirAjustesBateria(); };

  const items = [
    { emoji: "🚀", titulo: t("optim.inicio_titulo"), texto: t("optim.inicio_texto"), hecho: inicio, accion: pulsarInicio },
    { emoji: "🔋", titulo: t("optim.bateria_titulo"), texto: t("optim.bateria_texto"), hecho: bateria, accion: pulsarBateria },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it) => (
        <div key={it.titulo}
          style={{ background: T.surf, border: `1px solid ${it.hecho ? T.accentBdr : T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{it.emoji}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>{it.titulo}</span>
            <span style={{
              fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: "4px 9px", whiteSpace: "nowrap",
              background: it.hecho ? T.accentBg : T.s2,
              border: `1px solid ${it.hecho ? T.accentBdr : T.border}`,
              color: it.hecho ? T.accent : T.muted,
            }}>
              {it.hecho ? t("optim.activado") : t("optim.pendiente")}
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, margin: "0 0 12px" }}>{it.texto}</p>
          <button onClick={() => it.accion()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              width: "100%", borderRadius: 10, padding: "10px", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              background: it.hecho ? T.accent : "transparent",
              color: it.hecho ? "#06080F" : T.text,
              border: it.hecho ? "none" : `1px solid ${T.border}`,
            }}>
            {it.hecho ? `✓ ${t("optim.activado")}` : t("optim.activar")}
          </button>
        </div>
      ))}
    </div>
  );
}
