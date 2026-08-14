import { useState, useEffect } from "react";
import { Dumbbell, Check } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { prepararEntrenador } from "../../lib/coach.js";

// Onboarding honesto: tras crear el perfil, el entrenador se "prepara" con esos
// datos (construye su ficha inicial y deja un saludo). NO es un entrenamiento de
// modelo (eso no existe con Gemini): es configurar tu asesor con tu perfil.
// Si falla (sin clave/cuota/red), igualmente se puede continuar: la ficha se irá
// construyendo con el uso.
export default function PantallaPreparando({ perfil, objetivos, onContinuar }) {
  const t = useT();
  const [estado, setEstado] = useState("cargando"); // "cargando" | "listo" | "error"

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await prepararEntrenador({ perfil, objetivos });
        if (vivo) setEstado("listo");
      } catch {
        if (vivo) setEstado("error");
      }
    })();
    return () => { vivo = false; };
  }, []);

  const terminado = estado !== "cargando";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
      {/* Icono / spinner */}
      <div style={{ position: "relative", width: 96, height: 96, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!terminado && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 99, border: `3px solid ${T.accentBdr}`, borderTopColor: T.accent, animation: "spin .9s linear infinite" }} />
        )}
        <div style={{
          width: 76, height: 76, borderRadius: 24,
          background: estado === "listo" ? T.accentBg : T.s2,
          border: `1px solid ${estado === "listo" ? T.accentBdr : T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {estado === "listo" ? <Check size={38} color={T.accent} /> : <Dumbbell size={34} color={T.accent} />}
        </div>
      </div>

      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 12, lineHeight: 1.25 }}>
        {estado === "cargando" ? t("preparando.titulo") : t("preparando.listo_titulo")}
      </h2>
      <p style={{ fontSize: 14.5, color: T.muted, lineHeight: 1.6, maxWidth: 340, marginBottom: 32 }}>
        {estado === "cargando"
          ? t("preparando.sub")
          : estado === "listo"
            ? t("preparando.listo_sub")
            : t("preparando.error_sub")}
      </p>

      <button onClick={onContinuar} disabled={!terminado}
        style={{
          width: "100%", maxWidth: 340, padding: "15px 20px", borderRadius: 14, border: "none",
          background: terminado ? T.accent : T.s3,
          color: terminado ? "#06080F" : T.muted,
          fontSize: 16, fontWeight: 700, fontFamily: "inherit",
          cursor: terminado ? "pointer" : "default",
        }}>
        {terminado ? t("preparando.continuar") : t("preparando.espera")}
      </button>
    </div>
  );
}
