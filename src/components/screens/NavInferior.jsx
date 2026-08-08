import { Home, Camera, List, User, ChefHat } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";

export default function NavInferior({ pantalla, setPantalla }) {
  const t = useT();
  const tabs = [
    { id: "dashboard", Icono: Home,   etiqueta: t("nav.inicio")   },
    { id: "analyze",   Icono: Camera, etiqueta: t("nav.analizar") },
    { id: "crear",     Icono: ChefHat, etiqueta: t("nav.crear")   },
    { id: "summary",   Icono: List,   etiqueta: t("nav.registro") },
    { id: "cuenta",    Icono: User,   etiqueta: t("nav.perfil")   },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: T.surf, borderTop: `1px solid ${T.border}`,
      display: "flex", zIndex: 100,
    }}>
      {tabs.map(({ id, Icono, etiqueta }) => {
        const activo = pantalla === id || (id === "cuenta" && pantalla === "profile_edit");
        return (
          <button key={id} onClick={() => setPantalla(id)}
            style={{
              flex: 1, padding: "10px 0 8px",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: activo ? T.accent : T.muted, transition: "color .2s",
              position: "relative",
            }}>
            {activo && (
              <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: T.accent, borderRadius: "0 0 2px 2px" }} />
            )}
            <Icono size={20} />
            <span style={{ fontSize: 10, fontFamily: "inherit" }}>{etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
