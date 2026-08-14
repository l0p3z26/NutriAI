import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, MessageCircle, Bell, Dumbbell } from "lucide-react";
import { T } from "../../theme.js";
import { useT, useIdioma, traducir } from "../../lib/i18n.jsx";
import { useAtras } from "../../lib/back.jsx";
import { traducirError } from "../../lib/apiKey.js";
import {
  getResumenes, borrarResumen, marcarCoachLeido,
  hayResumenPendiente, generarResumenDiario,
} from "../../lib/coach.js";

// Apartado de NOTIFICACIONES del entrenador (icono ✉️). Muestra los avisos y
// resúmenes que el entrenador envía (proactivos). Es de SOLO LECTURA: aquí no se
// crean conversaciones (eso es el Chat, un apartado aparte).
export default function PantallaNotificaciones({ perfil, objetivos, comidas, onHablar, onVolver }) {
  const t = useT();
  const { locale } = useIdioma();
  const [resumenes, setResumenes] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useAtras(() => { onVolver(); return true; });

  // Al abrir: marcar leído (apaga el punto rojo) y, si la notificación diaria
  // dejó un resumen pendiente, generarlo ahora y añadirlo al buzón.
  useEffect(() => {
    (async () => {
      marcarCoachLeido();
      setResumenes(await getResumenes());
      if (await hayResumenPendiente()) {
        setGenerando(true);
        try {
          await generarResumenDiario({ perfil, objetivos, comidasHoy: comidas });
          setResumenes(await getResumenes());
        } catch (e) {
          setError(traducirError(e));
        } finally { setGenerando(false); }
      }
      setCargando(false);
    })();
  }, []);

  const borrar = async (id) => {
    if (!window.confirm(traducir("buzon.borrar_confirm"))) return;
    await borrarResumen(id);
    setResumenes(await getResumenes());
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}`, background: T.surf, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onVolver} aria-label={traducir("comun.volver")}
          style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, display: "flex", alignItems: "center", gap: 7 }}>
            <MessageCircle size={17} color={T.accent} /> {t("buzon.titulo")}
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{t("buzon.sub")}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
        {generando && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12, color: T.muted, fontSize: 13.5 }}>
            <span style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${T.accentBdr}`, borderTopColor: T.accent, display: "inline-block", animation: "spin .8s linear infinite" }} />
            {t("buzon.generando")}
          </div>
        )}

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: T.danger, lineHeight: 1.5, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {cargando ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
            <span style={{ width: 20, height: 20, borderRadius: 99, border: `2px solid ${T.accentBdr}`, borderTopColor: T.accent, display: "inline-block", animation: "spin .8s linear infinite" }} />
          </div>
        ) : resumenes.length === 0 && !generando ? (
          <div style={{ textAlign: "center", color: T.muted, padding: "44px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: T.accentBg, border: `1px solid ${T.accentBdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Bell size={28} color={T.accent} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("buzon.vacio_titulo")}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>{t("buzon.vacio_sub")}</div>
          </div>
        ) : (
          resumenes.map((r) => (
            <div key={r.id} style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: T.accentBg, border: `1px solid ${T.accentBdr}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent }}>
                  <MessageCircle size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text }}>{t("buzon.resumen")}</div>
                  <div style={{ fontSize: 11.5, color: T.dim }}>{new Date(r.ts).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</div>
                </div>
                <button onClick={() => borrar(r.id)} aria-label={t("buzon.borrar")}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.danger}33`, color: T.danger, cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
              <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.texto}</div>
              {onHablar && (
                <button onClick={() => onHablar(r)}
                  style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.accentBg, border: `1px solid ${T.accentBdr}`, color: T.accent, borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <Dumbbell size={16} /> {t("buzon.hablar")}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
