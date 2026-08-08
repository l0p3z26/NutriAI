import { T } from "../../theme.js";

export default function Boton({ children, onClick, variante = "primario", disabled, sx = {}, icono, ariaLabel }) {
  const s = {
    primario: { background: T.accent,   color: "#06080F", fontWeight: 700 },
    ghost:    { background: T.s2,       color: T.text,    border: `1px solid ${T.border}` },
    peligro:  { background: T.dangerBg, color: T.danger,  border: `1px solid ${T.danger}44` },
    outline:  { background: "transparent", color: T.accent, border: `1px solid ${T.accentBdr}` },
    aviso:    { background: T.warnBg,   color: T.warn,    border: `1px solid ${T.warn}44` },
  }[variante] ?? {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: "100%", padding: "13px", borderRadius: 12, border: "none",
        fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1, fontFamily: "inherit",
        transition: "opacity .2s, transform .1s", letterSpacing: .2,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        touchAction: "manipulation",
        ...s, ...sx,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {icono}{children}
    </button>
  );
}
