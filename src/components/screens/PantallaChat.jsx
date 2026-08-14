import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Send, Trash2, Dumbbell, Plus, MessageSquare } from "lucide-react";
import { T } from "../../theme.js";
import { useT, useIdioma, traducir } from "../../lib/i18n.jsx";
import { useAtras } from "../../lib/back.jsx";
import { traducirError } from "../../lib/apiKey.js";
import {
  getConversaciones, crearConversacion, borrarConversacion, enviarMensajeCoach,
} from "../../lib/coach.js";

// Chat con el entrenador con HISTORIAL de conversaciones (tipo lista). Dos vistas
// en la misma pantalla: la lista de conversaciones y una conversación abierta.
// El contexto (perfil, macros de hoy, ficha aprendida) lo inyecta coach.js en
// cada mensaje; la memoria del entrenador es común a todas las conversaciones.
export default function PantallaChat({ perfil, objetivos, comidas, convInicial, onVolver }) {
  const t = useT();
  const { locale } = useIdioma();
  const [convs, setConvs] = useState([]);
  const [activa, setActiva] = useState(null);   // conversación abierta (objeto) o null → lista
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const finRef = useRef(null);
  const inputRef = useRef(null);

  const recargar = useCallback(async () => setConvs(await getConversaciones()), []);

  // Atrás: si hay una conversación abierta, vuelve a la lista; si no, sale.
  useAtras(() => { if (activa) { setActiva(null); return true; } onVolver(); return true; });

  // Al abrir: cargar las conversaciones. (Los resúmenes/avisos del entrenador
  // están en el apartado de Notificaciones ✉️, que es un sitio aparte.)
  useEffect(() => {
    (async () => {
      const l = await getConversaciones();
      setConvs(l);
      // Si venimos del buzón ("hablar sobre el día"), abrir esa conversación.
      if (convInicial) {
        const c = l.find((x) => x.id === convInicial);
        if (c) setActiva(c);
      }
      setCargando(false);
    })();
  }, []);

  const irAlFinal = useCallback(() => { finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, []);
  useEffect(() => { if (activa) irAlFinal(); }, [activa, enviando, irAlFinal]);

  const abrirNueva = async () => {
    setError(null);
    const conv = await crearConversacion();
    await recargar();
    setActiva(conv);
  };

  const borrar = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm(traducir("chat.borrar_confirm"))) return;
    await borrarConversacion(id);
    await recargar();
    if (activa?.id === id) setActiva(null);
  };

  const enviar = async () => {
    const msg = texto.trim();
    if (!msg || enviando || !activa) return;
    setError(null);
    setTexto("");
    // Optimista: pinta el mensaje del usuario al momento.
    setActiva((c) => ({ ...c, mensajes: [...c.mensajes, { rol: "user", texto: msg, ts: Date.now() }] }));
    setEnviando(true);
    try {
      const { conversacion } = await enviarMensajeCoach(activa.id, msg, { perfil, objetivos, comidasHoy: comidas });
      setActiva(conversacion);
      await recargar();
    } catch (e) {
      setError(traducirError(e));
      const fresca = (await getConversaciones()).find((c) => c.id === activa.id);
      if (fresca) setActiva(fresca);
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  const alTeclado = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } };

  const spinner = (
    <span style={{ width: 14, height: 14, borderRadius: 99, border: `2px solid ${T.accentBdr}`, borderTopColor: T.accent, display: "inline-block", animation: "spin .8s linear infinite" }} />
  );

  const cabeceraBtn = (onClick, aria, icono) => (
    <button onClick={onClick} aria-label={aria}
      style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer", padding: 0 }}>
      {icono}
    </button>
  );

  // ── VISTA LISTA ──────────────────────────────────────────────────────────
  if (!activa) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}`, background: T.surf, position: "sticky", top: 0, zIndex: 10 }}>
          {cabeceraBtn(onVolver, traducir("comun.volver"), <ChevronLeft size={18} />)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, display: "flex", alignItems: "center", gap: 7 }}>
              <Dumbbell size={17} color={T.accent} /> {t("chat.titulo")}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{t("chat.sub")}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>
          <button onClick={abrirNueva}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.accent, color: "#06080F", border: "none", borderRadius: 14, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}>
            <Plus size={18} /> {t("chat.nueva")}
          </button>

          {cargando ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>{spinner}</div>
          ) : convs.length === 0 ? (
            <div style={{ textAlign: "center", color: T.muted, padding: "36px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: T.accentBg, border: `1px solid ${T.accentBdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Dumbbell size={30} color={T.accent} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("chat.vacio_titulo")}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>{t("chat.vacio_sub")}</div>
            </div>
          ) : (
            convs.map((c) => {
              const ultimo = c.mensajes[c.mensajes.length - 1];
              return (
                <button key={c.id} onClick={() => { setError(null); setActiva(c); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14, padding: "13px 14px", cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: T.s2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent }}>
                    <MessageSquare size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.titulo}</div>
                    <div style={{ fontSize: 12.5, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                      {ultimo ? ultimo.texto : t("chat.vacia")}
                    </div>
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>
                      {new Date(c.actualizado).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <span onClick={(e) => borrar(c.id, e)} role="button" aria-label={t("chat.borrar")}
                    style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.danger}33`, color: T.danger, cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── VISTA CONVERSACIÓN ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}`, background: T.surf, position: "sticky", top: 0, zIndex: 10 }}>
        {cabeceraBtn(() => setActiva(null), traducir("comun.volver"), <ChevronLeft size={18} />)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activa.titulo}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{t("chat.sub")}</div>
        </div>
        {cabeceraBtn(() => borrar(activa.id), t("chat.borrar"), <Trash2 size={16} />)}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {activa.mensajes.map((m, i) => {
          const mio = m.rol === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: mio ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px", borderRadius: 16,
                borderBottomRightRadius: mio ? 4 : 16, borderBottomLeftRadius: mio ? 16 : 4,
                background: mio ? T.accent : T.surf,
                border: mio ? "none" : `1px solid ${T.border}`,
                color: mio ? "#06080F" : T.text,
                fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.texto}
              </div>
            </div>
          );
        })}

        {enviando && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: 16, borderBottomLeftRadius: 4, background: T.surf, border: `1px solid ${T.border}`, color: T.muted, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              {spinner} {t("chat.pensando")}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: T.danger, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, background: T.surf, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea ref={inputRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclado}
          rows={1} placeholder={t("chat.placeholder")} disabled={enviando}
          style={{
            flex: 1, resize: "none", maxHeight: 120, minHeight: 44,
            background: T.s2, border: `1px solid ${T.border}`, borderRadius: 14,
            color: T.text, fontSize: 15, padding: "12px 14px", outline: "none",
            fontFamily: "inherit", lineHeight: 1.4,
          }} />
        <button onClick={enviar} disabled={enviando || !texto.trim()} aria-label={t("chat.enviar")}
          style={{
            width: 44, height: 44, flexShrink: 0, borderRadius: 14, border: "none",
            background: texto.trim() && !enviando ? T.accent : T.s3,
            color: texto.trim() && !enviando ? "#06080F" : T.muted,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: texto.trim() && !enviando ? "pointer" : "default",
          }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
