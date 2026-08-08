import { T } from "../../theme.js";

export default function Campo({ etiqueta, v, set, tipo = "text", placeholder, min, max, step, pista }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {etiqueta && <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 5 }}>{etiqueta}</div>}
      <input
        type={tipo} value={v}
        onChange={e => set(e.target.value)}
        placeholder={placeholder} min={min} max={max} step={step}
        style={{
          width: "100%", padding: "11px 13px",
          background: T.s2, border: `1px solid ${T.border}`,
          borderRadius: 10, color: T.text, fontSize: 15,
          outline: "none", fontFamily: "inherit", transition: "border .2s",
        }}
        onFocus={e => { e.target.style.borderColor = T.accent; }}
        onBlur={e => { e.target.style.borderColor = T.border; }}
      />
      {pista && <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{pista}</div>}
    </div>
  );
}
