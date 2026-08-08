import { useState } from "react";
import { Activity, Zap, Globe, ChevronDown, Check } from "lucide-react";
import { T } from "../../theme.js";
import Boton from "../ui/Boton.jsx";
import { useIdioma, useT, IDIOMAS } from "../../lib/i18n.jsx";

export default function PantallaBienvenida({ onEmpezar }) {
  const t = useT();
  const { idioma, setIdioma } = useIdioma();
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const idiomaActual = IDIOMAS.find((i) => i.code === idioma)?.nombre || "Español";

  const features = [
    { emoji: "📸", key: "bienvenida.f1" },
    { emoji: "🎯", key: "bienvenida.f2" },
    { emoji: "📊", key: "bienvenida.f3" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.bg, padding: 24 }}>
      {/* Selector de idioma (botón que abre la lista) */}
      <div style={{ paddingTop: 6, display: "flex", justifyContent: "flex-end", position: "relative" }}>
        <button onClick={() => setSelectorAbierto((v) => !v)} aria-label={t("bienvenida.idioma")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: T.s2, border: `1px solid ${T.border}`, borderRadius: 99,
            padding: "7px 12px", cursor: "pointer", fontFamily: "inherit",
            color: T.text, fontSize: 13, fontWeight: 600,
          }}>
          <Globe size={15} color={T.accent} />
          {idiomaActual}
          <ChevronDown size={14} color={T.muted} style={{ transform: selectorAbierto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>

        {selectorAbierto && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: 6, minWidth: 190, boxShadow: "0 12px 32px rgba(0,0,0,.4)",
          }}>
            {IDIOMAS.map((i) => {
              const activo = i.code === idioma;
              return (
                <button key={i.code} onClick={() => { setIdioma(i.code); setSelectorAbierto(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    background: activo ? T.accentBg : "transparent", border: "none",
                    borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit",
                    color: activo ? T.accent : T.text, fontSize: 14, fontWeight: activo ? 700 : 500,
                    textAlign: "left",
                  }}>
                  <span style={{ flex: 1 }}>{i.nombre}</span>
                  {activo && <Check size={16} color={T.accent} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: `linear-gradient(135deg, ${T.accent}, ${T.carb})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28, boxShadow: `0 0 50px ${T.accent}40`,
        }}>
          <Activity size={36} color="#06080F" />
        </div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 5, textTransform: "uppercase", marginBottom: 14 }}>
          NutriAI
        </div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 34, fontWeight: 800, color: T.text, lineHeight: 1.15, marginBottom: 16, maxWidth: 300 }}>
          {t("bienvenida.titulo")}
        </h1>
        <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.65, maxWidth: 310, marginBottom: 36 }}>
          {t("bienvenida.sub")}
        </p>
        {features.map(f => (
          <div key={f.key} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 20px", background: T.surf,
            border: `1px solid ${T.border}`, borderRadius: 40,
            marginBottom: 10, width: "100%", maxWidth: 280,
          }}>
            <span style={{ fontSize: 18 }}>{f.emoji}</span>
            <span style={{ fontSize: 14, color: T.muted }}>{t(f.key)}</span>
          </div>
        ))}
      </div>
      <div style={{ paddingBottom: 40 }}>
        <Boton onClick={onEmpezar} icono={<Zap size={16} />}>{t("bienvenida.boton")}</Boton>
        <p style={{ textAlign: "center", fontSize: 11, color: T.dim, marginTop: 12 }}>
          {t("bienvenida.local")}
        </p>
      </div>
    </div>
  );
}
