import { Component } from "react";
import { T } from "../theme.js";
import { traducir } from "../lib/i18n.jsx";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[NutriAI] Error no controlado:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: T.bg, color: T.text, padding: 24, textAlign: "center",
          fontFamily: "'DM Sans',sans-serif",
        }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {traducir("error.titulo")}
          </h1>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 24, maxWidth: 320 }}>
            {traducir("error.cuerpo")}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: T.accent, color: "#06080F", border: "none",
              borderRadius: 12, padding: "13px 24px", fontWeight: 700,
              fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            }}>
            {traducir("error.reiniciar")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
