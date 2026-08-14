import { useEffect } from "react";
import { X, Dumbbell, Settings, ChevronRight, Utensils } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { useAtras } from "../../lib/back.jsx";

// Menú lateral (hamburguesa ☰). Se desliza desde la derecha por encima de todo.
// Contiene los destinos que no están en la barra inferior: chat del entrenador y
// ajustes (la configuración de IA vive dentro de Ajustes). La barra inferior se
// mantiene igual.
export default function MenuLateral({ abierto, onCerrar, onNavegar }) {
  const t = useT();

  // Atrás de Android: si el menú está abierto, primero lo cierra.
  useAtras(() => { if (abierto) { onCerrar(); return true; } return false; });

  // Evita el scroll del fondo mientras el menú está abierto.
  useEffect(() => {
    if (!abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [abierto]);

  const items = [
    { id: "chat", icono: <Dumbbell size={20} />, titulo: t("menu.chat"), sub: t("menu.chat.sub") },
    { id: "comidasfijas", icono: <Utensils size={20} />, titulo: t("menu.frecuentes"), sub: t("menu.frecuentes.sub") },
    { id: "ajustes", icono: <Settings size={20} />, titulo: t("menu.ajustes"), sub: t("menu.ajustes.sub") },
  ];

  return (
    <>
      {/* Fondo oscuro */}
      <div onClick={onCerrar}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,.55)",
          opacity: abierto ? 1 : 0, pointerEvents: abierto ? "auto" : "none",
          transition: "opacity .25s",
        }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "82%", maxWidth: 320,
        background: T.surf, borderLeft: `1px solid ${T.border}`,
        boxShadow: "-12px 0 40px rgba(0,0,0,.45)",
        transform: abierto ? "translateX(0)" : "translateX(100%)",
        transition: "transform .28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Cabecera del menú */}
        <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: T.text }}>NutriAI</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{t("menu.titulo")}</div>
          </div>
          <button onClick={onCerrar} aria-label={t("menu.cerrar")}
            style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Destinos */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
          {items.map((it) => (
            <button key={it.id} onClick={() => onNavegar(it.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                background: T.s2, border: `1px solid ${T.border}`, borderRadius: 14,
                padding: "14px 16px", cursor: "pointer", textAlign: "left", marginBottom: 10,
              }}>
              <div style={{ color: T.accent, flexShrink: 0, display: "flex", position: "relative" }}>
                {it.icono}
                {it.punto && (
                  <span style={{ position: "absolute", top: -4, right: -4, width: 9, height: 9, borderRadius: 99, background: T.danger, border: `2px solid ${T.s2}` }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text }}>{it.titulo}</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{it.sub}</div>
              </div>
              <ChevronRight size={18} color={T.dim} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
