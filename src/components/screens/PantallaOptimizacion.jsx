import { useState } from "react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import OptimizacionAndroid from "../ui/OptimizacionAndroid.jsx";

// Paso de onboarding (solo Android), tras conectar la IA: sugiere activar el
// inicio automático y la batería sin restricciones. "Continuar" solo se habilita
// (y se pone verde) cuando AMBAS están activadas; mientras tanto muestra
// "Esperando a la activación". "Activar más tarde" continúa igualmente.
export default function PantallaOptimizacion({ onContinuar }) {
  const t = useT();
  const [estado, setEstado] = useState({ inicio: false, bateria: false });
  const ambas = estado.inicio && estado.bateria;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(36px,7vh,56px) 22px 8px" }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, background: T.accentBg, border: `1px solid ${T.accentBdr}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 16,
        }}>⚙️</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, fontFamily: "'Sora',sans-serif", margin: "0 0 8px" }}>
          {t("optim.titulo")}
        </h1>
        <p style={{ fontSize: 14.5, color: T.muted, lineHeight: 1.6, margin: "0 0 22px" }}>
          {t("optim.sub")}
        </p>
        <OptimizacionAndroid onEstado={setEstado} />
      </div>

      <div style={{ padding: "12px 22px 26px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
        <button onClick={ambas ? onContinuar : undefined} disabled={!ambas}
          style={{
            width: "100%", borderRadius: 12, padding: "14px", fontSize: 15.5, fontWeight: 800,
            fontFamily: "inherit", border: "none", marginBottom: 10,
            background: ambas ? T.accent : T.s3,
            color: ambas ? "#06080F" : T.muted,
            cursor: ambas ? "pointer" : "default",
            transition: "background .2s, color .2s",
          }}>
          {ambas ? t("optim.continuar") : t("optim.esperando")}
        </button>
        <button onClick={onContinuar}
          style={{
            width: "100%", background: "transparent", color: T.muted, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "12px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
          {t("optim.mas_tarde")}
        </button>
      </div>
    </div>
  );
}
