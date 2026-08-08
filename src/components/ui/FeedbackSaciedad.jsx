import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";

export default function FeedbackSaciedad({ valor, onSeleccionar }) {
  const t = useT();
  const opciones = [
    { id: "hambre", label: t("saciedad.hambre") },
    { id: "normal", label: t("saciedad.normal") },
    { id: "bien",   label: t("saciedad.bien") },
    { id: "lleno",  label: t("saciedad.lleno") },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10.5, color: T.dim, marginBottom: 4 }}>{t("saciedad.pregunta")}</div>
      <div style={{ display: "flex", gap: 4 }}>
        {opciones.map(o => (
          <button key={o.id} onClick={() => onSeleccionar(o.id)}
            style={{
              flex: 1, padding: "5px 2px", borderRadius: 7, fontSize: 10, fontWeight: 600,
              border: `1px solid ${valor === o.id ? T.accent : T.border}`,
              background: valor === o.id ? T.accentBg : T.s3,
              color: valor === o.id ? T.accent : T.muted,
              cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
