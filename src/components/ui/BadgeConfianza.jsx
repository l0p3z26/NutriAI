import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";

export default function BadgeConfianza({ nivel }) {
  const t = useT();
  const m = {
    high:   { bg: T.accentBg, c: T.accent, l: t("conf.alta") },
    medium: { bg: T.warnBg,   c: T.warn,   l: t("conf.media") },
    low:    { bg: T.dangerBg, c: T.danger, l: t("conf.baja") },
  };
  const { bg, c, l } = m[nivel] ?? m.low;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, background: bg, color: c, fontSize: 11, fontWeight: 700 }}>
      {l}
    </span>
  );
}
