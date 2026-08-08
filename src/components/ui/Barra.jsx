import { T, pct } from "../../theme.js";

export default function Barra({ v, m, color, h = 6 }) {
  return (
    <div style={{ background: T.s3, borderRadius: 99, height: h, overflow: "hidden" }}>
      <div style={{ width: `${pct(v, m)}%`, height: "100%", borderRadius: 99, background: color, transition: "width .55s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}
