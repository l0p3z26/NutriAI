import { T, fmt } from "../../theme.js";
import Barra from "./Barra.jsx";

export default function ChipMacro({ etiqueta, consumido, objetivo, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", marginBottom: 3 }}>{etiqueta}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1 }}>
        {fmt(consumido)}<span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>g</span>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>{fmt(objetivo)}g objetivo</div>
      <Barra v={consumido} m={objetivo} color={color} h={4} />
    </div>
  );
}
