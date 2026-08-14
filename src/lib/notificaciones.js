// ═══════════════════════════════════════════════════════
// NOTIFICACIONES / RECORDATORIOS (solo Android)
// ═══════════════════════════════════════════════════════
// Recordatorios locales (sin servidor) para no olvidar registrar las comidas.
//
// IMPORTANTE (vc20): se abandonó @capacitor/local-notifications porque sus
// llamadas se QUELGAN en el WebView de algunos dispositivos (el diagnóstico A/B
// lo confirmó: la vía nativa NotificationCompat funcionaba al instante mientras
// las llamadas del plugin no respondían nunca). Ahora todo va por nuestro plugin
// nativo propio `Recordatorios` (AlarmManager + NotificationCompat + arranque
// tras reinicio), que controlamos por completo.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { sg, ss, KEYS } from "./storage.js";
import { traducir } from "./i18n.jsx";
import { getIconoActual } from "./appIcon.js";

// Plugin nativo para abrir pantallas de ajustes del sistema (Android).
const Sistema = registerPlugin("Sistema");
// Plugin nativo propio de recordatorios.
const Recordatorios = registerPlugin("Recordatorios");

// Vienen activadas por defecto a estas horas.
export const HORAS_POR_DEFECTO = [
  { h: 9, m: 30 }, { h: 14, m: 0 }, { h: 21, m: 30 },
];

export function soportaNotificaciones() {
  return (
    typeof Capacitor !== "undefined" &&
    Capacitor.isNativePlatform?.() &&
    Capacitor.getPlatform?.() === "android"
  );
}

// Abre los ajustes de notificación de NutriAI en Android (permiso / batería).
export async function abrirAjustesNotif() {
  try { await Sistema.abrirAjustesNotificaciones(); return true; }
  catch {
    try { await Sistema.abrirAjustesApp(); return true; } catch { return false; }
  }
}

// Abre la pantalla de "inicio automático / autostart" del fabricante.
export async function abrirInicioAutomatico() {
  try { await Sistema.abrirInicioAutomatico(); return true; } catch { return false; }
}

// Abre el diálogo de "batería sin restricciones" (ignorar optimización).
export async function abrirAjustesBateria() {
  try { await Sistema.abrirAjustesBateria(); return true; } catch { return false; }
}

// Detección REAL de "batería sin restricciones" (isIgnoringBatteryOptimizations).
export async function bateriaSinRestricciones() {
  if (!soportaNotificaciones()) return false;
  try { return !!(await Sistema.estadoBateria()).ignorando; } catch { return false; }
}

// El "inicio automático" NO se puede detectar en Android (no hay API pública),
// así que guardamos que el usuario ya pasó por su pantalla de ajustes.
export async function getInicioMarcado() {
  const g = await sg(KEYS.OPTIM);
  return !!(g && g.inicioHecho);
}
export async function setInicioMarcado(v) {
  const g = (await sg(KEYS.OPTIM)) || {};
  await ss(KEYS.OPTIM, { ...g, inicioHecho: !!v });
}

// ── Mensajes e icono (se calculan en JS, en el idioma actual) ─────────────────
// Los 3 mensajes por franja horaria (mañana / mediodía / noche). Se pasan al
// plugin nativo, que elige el correcto según la hora al disparar la alarma.
function mensajesActuales() {
  const fr = ["manana", "mediodia", "noche"];
  const msg = {};
  for (const f of fr) {
    msg[f] = { t: traducir(`notif.msg.${f}.titulo`), b: traducir(`notif.msg.${f}.cuerpo`) };
  }
  return msg;
}

// Icono pequeño de la notificación = el icono de app elegido en Ajustes.
async function iconoNotif() {
  try {
    const id = await getIconoActual();
    return id === "IconLeaf" ? "ic_stat_leaf" : "ic_stat_default";
  } catch { return "ic_stat_default"; }
}

// ── Config persistida (localStorage) ──────────────────────────────────────────
export async function getConfigNotif() {
  const g = await sg(KEYS.NOTIF);
  if (!g || typeof g !== "object") {
    return { activadas: true, horas: HORAS_POR_DEFECTO.map((x) => ({ ...x })) };
  }
  return {
    activadas: g.activadas !== false,
    horas: Array.isArray(g.horas) ? g.horas : HORAS_POR_DEFECTO.map((x) => ({ ...x })),
  };
}

export async function setConfigNotif(config) {
  await ss(KEYS.NOTIF, config);
}

// ── Permiso del sistema ──────────────────────────────────────────────────────
export async function permisoConcedido() {
  if (!soportaNotificaciones()) return false;
  try { return (await Recordatorios.checkPermiso()).display === "granted"; }
  catch { return false; }
}

export async function pedirPermiso() {
  if (!soportaNotificaciones()) return false;
  try { return (await Recordatorios.pedirPermiso()).display === "granted"; }
  catch { return false; }
}

// ── Programación ──────────────────────────────────────────────────────────────
// Reconcilia las alarmas del sistema con la config. El plugin nativo cancela lo
// anterior y programa lo nuevo de forma atómica, así que es seguro llamarlo a
// menudo (al abrir, al volver a primer plano, al cambiar el icono, etc.).
export async function reprogramar(config) {
  if (!soportaNotificaciones()) return;
  const cfg = config || (await getConfigNotif());
  const icono = await iconoNotif();
  const msg = mensajesActuales();
  try {
    if (!cfg.activadas || !(cfg.horas || []).length) {
      await Recordatorios.cancelar({ icono, msg });
    } else {
      await Recordatorios.programar({ horas: cfg.horas, icono, msg });
    }
  } catch { /* no-op */ }
}

export async function cancelarTodas() {
  if (!soportaNotificaciones()) return;
  try { await Recordatorios.cancelar({ icono: await iconoNotif(), msg: mensajesActuales() }); }
  catch { /* no-op */ }
}

// Notificación de PRUEBA inmediata (verifica permiso + canal + entrega).
// Devuelve { estado, error? }: "no_soportado" | "sin_permiso" | "programada" | "error".
export async function enviarPrueba() {
  if (!soportaNotificaciones()) return { estado: "no_soportado" };
  try {
    if (!(await permisoConcedido())) {
      const ok = await pedirPermiso();
      if (!ok) return { estado: "sin_permiso" };
    }
    await Recordatorios.probar({
      icono: await iconoNotif(),
      titulo: traducir("notif.prueba.titulo"),
      cuerpo: traducir("notif.prueba.cuerpo"),
    });
    return { estado: "programada" };
  } catch (e) {
    return { estado: "error", error: e?.message || String(e) };
  }
}

// ── Cumpleaños ────────────────────────────────────────────────────────────────
// Programa una notificación anual personalizada el día del cumpleaños. La fecha
// de nacimiento NO se envía a ningún sitio: aquí solo derivamos mes/día/edad y se
// lo pasamos al plugin nativo (que la guarda en el dispositivo).
export async function programarCumple(birthDate) {
  if (!soportaNotificaciones() || !birthDate) return;
  const d = new Date(`${birthDate}T00:00:00`);
  if (isNaN(d.getTime())) return;
  const mes = d.getMonth() + 1, dia = d.getDate();
  // Edad que cumplirá en el PRÓXIMO cumpleaños.
  const hoy = new Date();
  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let prox = new Date(hoy.getFullYear(), mes - 1, dia);
  if (prox < hoy0) prox = new Date(hoy.getFullYear() + 1, mes - 1, dia);
  const edad = prox.getFullYear() - d.getFullYear();
  try {
    await Recordatorios.programarCumple({
      mes, dia, hora: 9,
      icono: await iconoNotif(),
      titulo: traducir("notif.cumple.titulo"),
      cuerpo: traducir("notif.cumple.cuerpo", { edad }),
    });
  } catch { /* no-op */ }
}

export async function cancelarCumple() {
  if (!soportaNotificaciones()) return;
  try { await Recordatorios.cancelarCumple(); } catch { /* no-op */ }
}

// ── Entrenador personal: resumen diario ───────────────────────────────────────
// Config propia (independiente de los recordatorios de comidas). Viene activada
// por defecto a las 21:00: cada día, a esa hora, el entrenador avisa de que tiene
// un resumen para el usuario. El resumen se genera al abrir el chat (coach.js).
export const HORA_COACH_POR_DEFECTO = { h: 21, m: 0 };

export async function getConfigCoach() {
  const g = await sg(KEYS.NOTIF_COACH);
  if (!g || typeof g !== "object") return { activado: true, ...HORA_COACH_POR_DEFECTO };
  return {
    activado: g.activado !== false,
    h: Number.isInteger(g.h) ? g.h : HORA_COACH_POR_DEFECTO.h,
    m: Number.isInteger(g.m) ? g.m : HORA_COACH_POR_DEFECTO.m,
  };
}

export async function setConfigCoach(cfg) { await ss(KEYS.NOTIF_COACH, cfg); }

// (Re)programa la notificación diaria del entrenador según su config.
export async function reprogramarCoach(config) {
  if (!soportaNotificaciones()) return;
  const c = config || (await getConfigCoach());
  try {
    await Recordatorios.programarCoach({
      activado: c.activado,
      h: c.h, m: c.m,
      icono: await iconoNotif(),
      titulo: traducir("notif.coach.titulo"),
      cuerpo: traducir("notif.coach.cuerpo"),
      boton: traducir("notif.coach.boton"),
    });
  } catch { /* no-op */ }
}

// Lee y CONSUME los flags nativos del entrenador tras reanudar la app.
export async function estadoCoachNotif() {
  if (!soportaNotificaciones()) return { pendiente: false, abrirChat: false };
  try {
    const r = await Recordatorios.estadoCoach();
    return { pendiente: !!r.pendiente, abrirChat: !!r.abrirChat };
  } catch { return { pendiente: false, abrirChat: false }; }
}

// Reconcilia con la config guardada. NO pide permiso (para no molestar al
// reanudar la app o tras restaurar una copia).
export async function inicializarNotif() {
  if (!soportaNotificaciones()) return;
  await reprogramar();
  await reprogramarCoach();
}

// Arranque de la app: si nunca se respondió al permiso, muéstralo (1ª vez), y
// luego programa los recordatorios según la config.
export async function arranqueNotif() {
  if (!soportaNotificaciones()) return;
  const cfg = await getConfigNotif();
  try {
    let ok = await permisoConcedido();
    if (!ok) ok = await pedirPermiso();
    if (ok) {
      await reprogramar(cfg);        // reprogramar() ya cancela si están desactivadas
      await reprogramarCoach();      // el resumen del entrenador es independiente
    } else {
      await cancelarTodas();
    }
  } catch { /* no-op */ }
}

// ── Diagnóstico (panel de Ajustes) ────────────────────────────────────────────
export const BUILD_TAG = "b22";

export function diagnosticoBase() {
  return {
    build: BUILD_TAG,
    plataforma: (typeof Capacitor !== "undefined" && Capacitor.getPlatform?.()) || "?",
    nativo: !!(typeof Capacitor !== "undefined" && Capacitor.isNativePlatform?.()),
    soportado: soportaNotificaciones(),
    permiso: "…",
    programadas: -1,
    error: null,
  };
}

export async function diagnosticoNotif() {
  const info = diagnosticoBase();
  info.permiso = "—";
  if (!info.soportado) { info.error = "soportaNotificaciones() = false"; return info; }
  try { info.permiso = (await Recordatorios.checkPermiso()).display; }
  catch (e) { info.error = e?.message || String(e); }
  try {
    const cfg = await getConfigNotif();
    info.programadas = cfg.activadas ? (cfg.horas || []).length : 0;
  } catch { /* no-op */ }
  return info;
}
