// ═══════════════════════════════════════════════════════
// TOKENS DE DISEÑO
// ═══════════════════════════════════════════════════════
export const T = {
  bg: "#06080F", surf: "#0C1220", s2: "#111A2C", s3: "#172236",
  border: "#1C2B42", accent: "#1BE5B0",
  accentBg: "rgba(27,229,176,.1)", accentBdr: "rgba(27,229,176,.25)",
  prot: "#FF8547", protBg: "rgba(255,133,71,.1)",
  carb: "#8A79F5", carbBg: "rgba(138,121,245,.1)",
  fat: "#FFD166", fatBg: "rgba(255,209,102,.1)",
  text: "#E2EAF5", muted: "#56728F", dim: "#243040",
  danger: "#FF4767", dangerBg: "rgba(255,71,103,.1)",
  warn: "#FFB703", warnBg: "rgba(255,183,3,.1)",
  r: 16,
};

export const pct = (v, m) => Math.min(100, Math.max(0, (v / Math.max(m, 1)) * 100));
export const fmt = (n) => (Number.isFinite(n) ? Math.round(n) : 0);
