import { T } from "../../theme.js";

export default function Selector({ etiqueta, v, set, opciones }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {etiqueta && <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 5 }}>{etiqueta}</div>}
      <select value={v} onChange={e => set(e.target.value)}
        style={{
          width: "100%", padding: "11px 13px",
          background: T.s2, border: `1px solid ${T.border}`,
          borderRadius: 10, color: T.text, fontSize: 15,
          outline: "none", fontFamily: "inherit", appearance: "none", cursor: "pointer",
        }}>
        {opciones.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
