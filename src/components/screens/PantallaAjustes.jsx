import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Globe, User, History, Code2, Check,
  ChevronDown, ChevronUp, KeyRound, Smartphone, Bell, Trash2, Plus, Heart, Dumbbell,
} from "lucide-react";
import { T } from "../../theme.js";
import { useIdioma, useT, IDIOMAS, traducir } from "../../lib/i18n.jsx";
import { useAtras } from "../../lib/back.jsx";
import { ICONOS, ICONO_POR_DEFECTO, getIconoActual, cambiarIcono, soportaCambioIcono } from "../../lib/appIcon.js";
import {
  soportaNotificaciones, getConfigNotif, setConfigNotif, reprogramar,
  permisoConcedido, pedirPermiso, abrirAjustesNotif,
  getConfigCoach, setConfigCoach, reprogramarCoach,
} from "../../lib/notificaciones.js";
import OptimizacionAndroid from "../ui/OptimizacionAndroid.jsx";

export const VERSION_APP = "1.5.0";
const URL_PORTFOLIO = "https://l0p3z26.github.io/portfolio";
const URL_GITHUB = "https://github.com/l0p3z26/NutriAI";
// Enlace de donaciones (PayPal.Me del autor).
const URL_PAYPAL = "https://paypal.me/DiegoL0pez";

const VERSIONES = [
  { v: "1.5.0", tituloKey: "hist.1_5_0.titulo", cuerpoKey: "hist.1_5_0.cuerpo", nuevo: true },
  { v: "1.4.1", tituloKey: "hist.1_4_1.titulo", cuerpoKey: "hist.1_4_1.cuerpo" },
  { v: "1.4.0", tituloKey: "hist.1_4_0.titulo", cuerpoKey: "hist.1_4_0.cuerpo" },
  { v: "1.3.0", tituloKey: "hist.1_3_0.titulo", cuerpoKey: "hist.1_3_0.cuerpo" },
  { v: "1.2.0", tituloKey: "hist.1_2_0.titulo", cuerpoKey: "hist.1_2_0.cuerpo" },
  { v: "1.1.0", tituloKey: "hist.1_1_0.titulo", cuerpoKey: "hist.1_1_0.cuerpo" },
  { v: "1.0.1", tituloKey: "hist.1_0_1.titulo", cuerpoKey: "hist.1_0_1.cuerpo" },
  { v: "1.0.0", tituloKey: "hist.1_0_0.titulo", cuerpoKey: "hist.1_0_0.cuerpo" },
];

const abrirEnlace = (url) => {
  try { window.open(url, "_system"); } catch { /* no-op */ }
};

function Fila({ icono, titulo, sub, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: "14px 16px", cursor: "pointer", textAlign: "left", marginBottom: 10,
      }}>
      <div style={{ color: T.accent, flexShrink: 0, display: "flex" }}>{icono}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text }}>{titulo}</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{sub}</div>
      </div>
      <ChevronRight size={18} color={T.dim} style={{ flexShrink: 0 }} />
    </button>
  );
}

function TituloSeccion({ children }) {
  return <div style={{ fontSize: 13, color: T.accent, fontWeight: 700, margin: "8px 0 10px", paddingLeft: 2 }}>{children}</div>;
}

function Cabecera({ titulo, onVolver }) {
  return (
    <div style={{ padding: "20px 20px 4px", display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={onVolver} aria-label={traducir("comun.volver")}
        style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer", padding: 0 }}>
        <ChevronLeft size={18} />
      </button>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>{titulo}</h2>
    </div>
  );
}

export default function PantallaAjustes({ onVolver, onConexion }) {
  const t = useT();
  const { idioma, setIdioma } = useIdioma();
  const [vista, setVista] = useState("menu"); // "menu" | "idioma" | "historial"
  const [abierta, setAbierta] = useState("1.0.0");
  // Nº de build (versionCode) para poder distinguir qué APK está instalado.
  const [build, setBuild] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        if (window.Capacitor?.isNativePlatform?.()) {
          const { App } = await import("@capacitor/app");
          const info = await App.getInfo();
          if (info?.build) setBuild(info.build);
        }
      } catch { /* no-op */ }
    })();
  }, []);

  // Selector de icono (solo Android): desplegable al final.
  const mostrarIconos = soportaCambioIcono();
  const [iconoActual, setIconoActual] = useState(null);
  const [iconoAbierto, setIconoAbierto] = useState(false);
  const [cambiandoIcono, setCambiandoIcono] = useState(false);
  const [iconoMsg, setIconoMsg] = useState(null);

  // Notificaciones (solo Android).
  const mostrarNotif = soportaNotificaciones();
  const [notifCfg, setNotifCfg] = useState(null);
  const [notifPermiso, setNotifPermiso] = useState(true);
  const [nuevaH, setNuevaH] = useState("");   // hora escrita (HH)
  const [nuevaM, setNuevaM] = useState("");   // minuto escrito (MM)
  const minutoRef = useRef(null);             // para saltar auto de HH a MM

  // Resumen diario del entrenador (notificación propia).
  const [coachCfg, setCoachCfg] = useState(null);
  const [coachH, setCoachH] = useState("");
  const [coachM, setCoachM] = useState("");
  const coachMinRef = useRef(null);

  // Cargamos siempre el icono activo para que el logo de esta pantalla coincida
  // con el icono elegido por el usuario (aunque el selector no se muestre).
  useEffect(() => { getIconoActual().then(setIconoActual); }, []);

  useEffect(() => {
    if (!mostrarNotif) return;
    (async () => {
      const cfg = await getConfigNotif();
      setNotifCfg(cfg);
      setNotifPermiso(await permisoConcedido());
      const cc = await getConfigCoach();
      setCoachCfg(cc);
      setCoachH(String(cc.h).padStart(2, "0"));
      setCoachM(String(cc.m).padStart(2, "0"));
    })();
  }, [mostrarNotif]);

  // Aplica y persiste la config del resumen diario del entrenador.
  const aplicarCoach = async (nueva) => {
    setCoachCfg(nueva);
    await setConfigCoach(nueva);
    await reprogramarCoach(nueva);
  };

  const toggleCoach = async () => {
    if (!coachCfg) return;
    const activar = !coachCfg.activado;
    if (activar && !notifPermiso) {
      const ok = await pedirPermiso();
      setNotifPermiso(ok);
      if (!ok) return;
    }
    aplicarCoach({ ...coachCfg, activado: activar });
  };

  const guardarHoraCoach = () => {
    if (!coachCfg) return;
    const h = parseInt(coachH, 10), m = parseInt(coachM, 10);
    if (!(Number.isInteger(h) && h >= 0 && h <= 23 && Number.isInteger(m) && m >= 0 && m <= 59)) return;
    aplicarCoach({ ...coachCfg, h, m });
  };


  const abrirAjustesAndroid = async () => { await abrirAjustesNotif(); };

  // Aplica una config nueva: estado + persistencia + reprogramación real.
  const aplicarNotif = async (nueva) => {
    setNotifCfg(nueva);
    await setConfigNotif(nueva);
    await reprogramar(nueva);
  };

  const toggleNotif = async () => {
    if (!notifCfg) return;
    const activar = !notifCfg.activadas;
    if (activar && !notifPermiso) {
      const ok = await pedirPermiso();
      setNotifPermiso(ok);
      if (!ok) return;
    }
    aplicarNotif({ ...notifCfg, activadas: activar });
  };

  const permitirNotif = async () => {
    const ok = await pedirPermiso();
    setNotifPermiso(ok);
    if (ok && notifCfg) reprogramar(notifCfg);
  };

  // La hora se ESCRIBE (no con reloj): dos campos numéricos HH y MM.
  const soloDig = (v) => v.replace(/\D/g, "").slice(0, 2);
  const horaEscritaValida = () => {
    const h = parseInt(nuevaH, 10), m = parseInt(nuevaM, 10);
    return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const anadirHora = async () => {
    if (!notifCfg || !horaEscritaValida()) return;
    const h = parseInt(nuevaH, 10), m = parseInt(nuevaM, 10);
    if (notifCfg.horas.some((x) => x.h === h && x.m === m)) { setNuevaH(""); setNuevaM(""); return; }
    // Asegura el permiso antes de programar (si nunca se pidió, muestra el diálogo).
    if (!notifPermiso) {
      const ok = await pedirPermiso();
      setNotifPermiso(ok);
    }
    const horas = [...notifCfg.horas, { h, m }].sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m));
    setNuevaH(""); setNuevaM("");
    aplicarNotif({ ...notifCfg, horas });
  };

  const quitarHora = (h, m) =>
    aplicarNotif({ ...notifCfg, horas: notifCfg.horas.filter((x) => !(x.h === h && x.m === m)) });

  const fmtHora = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  // Logo de la cabecera = preview del icono activo (Clásico / Hoja).
  const logoSrc = ICONOS.find((i) => i.id === (iconoActual || ICONO_POR_DEFECTO))?.preview || "icon-preview-default.png";

  // Atrás de Android: cierra la sub-vista (idioma/historial) antes de salir.
  useAtras(() => { if (vista !== "menu") { setVista("menu"); return true; } return false; });

  const elegirIcono = async (id) => {
    if (id === iconoActual || cambiandoIcono) return;
    setIconoMsg(null); setCambiandoIcono(true);
    try {
      await cambiarIcono(id);
      setIconoActual(id);
      // Reprograma para que el icono de las notificaciones coincida con el nuevo.
      if (notifCfg?.activadas) reprogramar(notifCfg);
      setIconoMsg({ tipo: "ok", texto: t("ajustes.icono.ok") });
    } catch {
      setIconoMsg({ tipo: "error", texto: t("ajustes.icono.error") });
    } finally { setCambiandoIcono(false); }
  };

  const volver = () => (vista === "menu" ? onVolver() : setVista("menu"));

  // ── Sub-vista: idioma ──
  if (vista === "idioma") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
        <Cabecera titulo={t("idioma.titulo")} onVolver={volver} />
        <p style={{ fontSize: 13, color: T.muted, padding: "6px 20px 12px" }}>{t("idioma.sub")}</p>
        <div style={{ padding: "0 20px" }}>
          {IDIOMAS.map((i) => {
            const activo = i.code === idioma;
            return (
              <button key={i.code} onClick={() => setIdioma(i.code)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: T.surf, border: `1px solid ${activo ? T.accent : T.border}`,
                  borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: 10,
                }}>
                <span style={{ flex: 1, textAlign: "left", fontSize: 15.5, fontWeight: activo ? 700 : 500, color: activo ? T.accent : T.text }}>{i.nombre}</span>
                {activo && <Check size={18} color={T.accent} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sub-vista: historial ──
  if (vista === "historial") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
        <Cabecera titulo={t("hist.titulo")} onVolver={volver} />
        <div style={{ flex: 1, padding: "12px 20px 32px", overflowY: "auto" }}>
          {VERSIONES.map((ver) => {
            const desplegada = abierta === ver.v;
            return (
              <div key={ver.v}
                style={{ background: desplegada ? T.accentBg : T.surf, border: `1px solid ${desplegada ? T.accentBdr : T.border}`, borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
                <button onClick={() => setAbierta(desplegada ? null : ver.v)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", padding: "14px 16px", textAlign: "left" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, background: T.s2, borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>v{ver.v}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>{t(ver.tituloKey)}</span>
                  {ver.nuevo && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 6, padding: "3px 7px", letterSpacing: .5 }}>{t("hist.nuevo")}</span>
                  )}
                  {desplegada ? <ChevronUp size={18} color={T.muted} /> : <ChevronDown size={18} color={T.muted} />}
                </button>
                {desplegada && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.border}`, marginTop: 2, paddingTop: 12 }}>
                    <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>{t(ver.cuerpoKey)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sub-vista: notificaciones ──
  if (vista === "notificaciones" && notifCfg) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
        <Cabecera titulo={t("notif.titulo")} onVolver={volver} />
        <div style={{ flex: 1, padding: "6px 20px 32px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>{t("notif.sub")}</p>

          {!notifPermiso && (
            <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.warn, marginBottom: 4 }}>{t("notif.permiso_titulo")}</div>
              <div style={{ fontSize: 13, color: T.warn, opacity: .9, lineHeight: 1.5, marginBottom: 12 }}>{t("notif.permiso_texto")}</div>
              <button onClick={permitirNotif}
                style={{ background: T.warn, color: "#06080F", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("notif.permiso_boton")}
              </button>
            </div>
          )}

          {/* Interruptor general */}
          <button onClick={toggleNotif}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: 18 }}>
            <div style={{ color: T.accent, display: "flex" }}><Bell size={22} /></div>
            <div style={{ flex: 1, textAlign: "left", fontSize: 15.5, fontWeight: 700, color: T.text }}>{t("notif.activar")}</div>
            <div style={{ width: 46, height: 27, borderRadius: 99, background: notifCfg.activadas ? T.accent : T.s3, border: `1px solid ${notifCfg.activadas ? T.accent : T.border}`, position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: notifCfg.activadas ? 21 : 2, width: 21, height: 21, borderRadius: 99, background: notifCfg.activadas ? "#06080F" : T.muted, transition: "left .2s" }} />
            </div>
          </button>

          {notifCfg.activadas && (
            <>
              <TituloSeccion>{t("notif.horas")}</TituloSeccion>
              {notifCfg.horas.length === 0 ? (
                <div style={{ fontSize: 13, color: T.muted, padding: "6px 2px 12px" }}>{t("notif.sin_horas")}</div>
              ) : (
                notifCfg.horas.map(({ h, m }) => (
                  <div key={`${h}:${m}`}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
                    <Bell size={16} color={T.muted} />
                    <div style={{ flex: 1, fontSize: 17, fontWeight: 700, color: T.text, fontFamily: "'Sora',sans-serif" }}>{fmtHora(h, m)}</div>
                    <button onClick={() => quitarHora(h, m)} aria-label={t("notif.eliminar")}
                      style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, color: T.danger, cursor: "pointer", padding: "6px 8px", display: "flex" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <input type="text" inputMode="numeric" value={nuevaH} maxLength={2} placeholder="HH" aria-label="HH"
                  onChange={(e) => { const d = soloDig(e.target.value); setNuevaH(d); if (d.length === 2) minutoRef.current?.focus(); }}
                  style={{ width: 58, textAlign: "center", padding: "11px 8px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "'Sora',sans-serif" }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: T.muted }}>:</span>
                <input ref={minutoRef} type="text" inputMode="numeric" value={nuevaM} maxLength={2} placeholder="MM" aria-label="MM"
                  onChange={(e) => setNuevaM(soloDig(e.target.value))}
                  style={{ width: 58, textAlign: "center", padding: "11px 8px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "'Sora',sans-serif" }} />
                <button onClick={anadirHora} disabled={!horaEscritaValida()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: horaEscritaValida() ? T.accent : T.s3, color: horaEscritaValida() ? "#06080F" : T.muted, border: "none", borderRadius: 10, padding: "11px 12px", fontSize: 14, fontWeight: 700, cursor: horaEscritaValida() ? "pointer" : "default", fontFamily: "inherit" }}>
                  <Plus size={16} /> {t("notif.anadir")}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: T.dim, marginTop: 8 }}>{t("notif.hora_ayuda")}</p>
            </>
          )}

          {/* Abrir ajustes de notificación de Android (para conceder permiso) */}
          <button onClick={abrirAjustesAndroid}
            style={{ width: "100%", marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.s2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 12, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Smartphone size={15} /> {t("notif.abrir_ajustes")}
          </button>

          {/* Resumen diario del entrenador personal */}
          {coachCfg && (
            <div style={{ marginTop: 24 }}>
              <TituloSeccion>{t("notif.coach_seccion")}</TituloSeccion>
              <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, margin: "0 0 12px" }}>{t("notif.coach_sub")}</p>

              <button onClick={toggleCoach}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: 12 }}>
                <div style={{ color: T.accent, display: "flex" }}><Dumbbell size={22} /></div>
                <div style={{ flex: 1, textAlign: "left", fontSize: 15.5, fontWeight: 700, color: T.text }}>{t("notif.coach_activar")}</div>
                <div style={{ width: 46, height: 27, borderRadius: 99, background: coachCfg.activado ? T.accent : T.s3, border: `1px solid ${coachCfg.activado ? T.accent : T.border}`, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: coachCfg.activado ? 21 : 2, width: 21, height: 21, borderRadius: 99, background: coachCfg.activado ? "#06080F" : T.muted, transition: "left .2s" }} />
                </div>
              </button>

              {coachCfg.activado && (
                <>
                  <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>{t("notif.coach_hora")}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="text" inputMode="numeric" value={coachH} maxLength={2} placeholder="HH" aria-label="HH"
                      onChange={(e) => { const d = soloDig(e.target.value); setCoachH(d); if (d.length === 2) coachMinRef.current?.focus(); }}
                      onBlur={guardarHoraCoach}
                      style={{ width: 58, textAlign: "center", padding: "11px 8px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "'Sora',sans-serif" }} />
                    <span style={{ fontSize: 18, fontWeight: 800, color: T.muted }}>:</span>
                    <input ref={coachMinRef} type="text" inputMode="numeric" value={coachM} maxLength={2} placeholder="MM" aria-label="MM"
                      onChange={(e) => setCoachM(soloDig(e.target.value))}
                      onBlur={guardarHoraCoach}
                      style={{ width: 58, textAlign: "center", padding: "11px 8px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "'Sora',sans-serif" }} />
                    <button onClick={guardarHoraCoach}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: T.accent, color: "#06080F", border: "none", borderRadius: 10, padding: "11px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Check size={16} /> {t("notif.coach_guardar")}
                    </button>
                  </div>
                </>
              )}

            </div>
          )}

          {/* Optimización del sistema: inicio automático + batería sin restricciones */}
          <div style={{ marginTop: 24 }}>
            <TituloSeccion>{t("optim.seccion")}</TituloSeccion>
            <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, margin: "0 0 12px" }}>{t("optim.seccion_sub")}</p>
            <OptimizacionAndroid />
          </div>
        </div>
      </div>
    );
  }

  // ── Vista principal ──
  const rango = `${VERSIONES[VERSIONES.length - 1].v} - ${VERSIONES[0].v}`;
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <Cabecera titulo={t("ajustes.titulo")} onVolver={volver} />

      <div style={{ flex: 1, padding: "8px 20px 32px", overflowY: "auto" }}>
        {/* Cabecera de la app */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0 22px" }}>
          <img src={logoSrc} alt="NutriAI" width={92} height={92}
            style={{ borderRadius: 22, boxShadow: `0 0 40px ${T.accent}22`, marginBottom: 14 }} />
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: T.text }}>NutriAI</div>
          <div style={{ fontSize: 15, color: T.accent, fontWeight: 600, marginTop: 2 }}>{t("ajustes.por")} l0p3z.26</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>{t("ajustes.version")} {VERSION_APP}{build ? ` (build ${build})` : ""}</div>
        </div>

        {/* Configuración */}
        <TituloSeccion>{t("ajustes.config")}</TituloSeccion>
        {onConexion && (
          <Fila icono={<KeyRound size={22} />} titulo={t("ajustes.ia")} sub={t("ajustes.ia.sub")} onClick={onConexion} />
        )}
        <Fila icono={<Globe size={22} />} titulo={t("ajustes.idioma")} sub={t("ajustes.idioma.sub")} onClick={() => setVista("idioma")} />
        {mostrarNotif && (
          <Fila icono={<Bell size={22} />} titulo={t("ajustes.notif")} sub={t("ajustes.notif.sub")} onClick={() => setVista("notificaciones")} />
        )}

        {/* Sobre la aplicación */}
        <TituloSeccion>{t("ajustes.sobre")}</TituloSeccion>
        <Fila icono={<User size={22} />}    titulo={t("ajustes.dev")}       sub={t("ajustes.dev.sub")}    onClick={() => abrirEnlace(URL_PORTFOLIO)} />
        <Fila icono={<Heart size={22} />}   titulo={t("ajustes.donar")}     sub={t("ajustes.donar.sub")}  onClick={() => abrirEnlace(URL_PAYPAL)} />
        <Fila icono={<History size={22} />} titulo={t("ajustes.historial")} sub={rango}                   onClick={() => setVista("historial")} />
        <Fila icono={<Code2 size={22} />}   titulo={t("ajustes.fuente")}    sub={t("ajustes.fuente.sub")} onClick={() => abrirEnlace(URL_GITHUB)} />

        {/* Icono de la app (desplegable, abajo del todo) — solo Android */}
        {mostrarIconos && (
          <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 14, marginTop: 8, overflow: "hidden" }}>
            <button onClick={() => setIconoAbierto((v) => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", cursor: "pointer", padding: "14px 16px", textAlign: "left" }}>
              <div style={{ color: T.accent, flexShrink: 0, display: "flex" }}><Smartphone size={22} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text }}>{t("ajustes.icono")}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{t("ajustes.icono.sub")}</div>
              </div>
              {iconoAbierto ? <ChevronDown size={18} color={T.muted} /> : <ChevronRight size={18} color={T.muted} />}
            </button>
            {iconoAbierto && (
              <div style={{ padding: "4px 16px 16px", borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                  {ICONOS.map((ic) => {
                    const activo = ic.id === iconoActual;
                    return (
                      <button key={ic.id} onClick={() => elegirIcono(ic.id)} disabled={cambiandoIcono}
                        style={{
                          flex: 1, background: T.s2, border: `2px solid ${activo ? T.accent : T.border}`,
                          borderRadius: 14, padding: 12, cursor: cambiandoIcono ? "wait" : "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative",
                        }}>
                        <img src={ic.preview} alt={ic.nombre} width={60} height={60} style={{ borderRadius: 15 }} />
                        <span style={{ fontSize: 13, color: activo ? T.accent : T.muted, fontWeight: activo ? 700 : 500 }}>{ic.nombre}</span>
                        {activo && (
                          <div style={{ position: "absolute", top: 8, right: 8, background: T.accent, borderRadius: 99, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={13} color="#06080F" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {iconoMsg && (
                  <div style={{
                    display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12,
                    background: iconoMsg.tipo === "ok" ? T.accentBg : T.dangerBg,
                    border: `1px solid ${iconoMsg.tipo === "ok" ? T.accentBdr : T.danger + "44"}`,
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div style={{ fontSize: 13, color: iconoMsg.tipo === "ok" ? T.accent : T.danger, lineHeight: 1.5 }}>{iconoMsg.texto}</div>
                  </div>
                )}
                <p style={{ fontSize: 11.5, color: T.dim, marginTop: 10, lineHeight: 1.5 }}>{t("ajustes.icono.aviso")}</p>
              </div>
            )}
          </div>
        )}

        {/* Contacto con el desarrollador (abajo del todo) */}
        <p onClick={() => abrirEnlace(URL_PORTFOLIO)}
          style={{ fontSize: 12.5, color: T.muted, textAlign: "center", lineHeight: 1.6, margin: "24px 6px 6px", cursor: "pointer" }}>
          {t("ajustes.contacto")}
        </p>
      </div>
    </div>
  );
}
