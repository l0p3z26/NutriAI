import { T } from "../../theme.js";

export default function Tarjeta({ children, sx = {} }) {
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 18, ...sx }}>
      {children}
    </div>
  );
}
