import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { T } from "./theme.js";
import { calcTargets, edadDesdeFecha } from "./lib/nutrition.js";
import { sg, ss, hoy, limpiarComidasAntiguas, KEYS } from "./lib/storage.js";
import { getApiKey, migrarModeloAuto } from "./lib/apiKey.js";
import { getCoachNoLeido, marcarCoachNoLeido, marcarResumenPendiente, crearChatSobreResumen } from "./lib/coach.js";
import { autoAnadirFrecuentes } from "./lib/comidasFijas.js";
import { comprobarActualizacion } from "./lib/actualizacion.js";
import { useT, traducir } from "./lib/i18n.jsx";
import { BackContext } from "./lib/back.jsx";
import { inicializarNotif, arranqueNotif, programarCumple, estadoCoachNotif } from "./lib/notificaciones.js";
import NavInferior from "./components/screens/NavInferior.jsx";

// Web/APK: no existe el puente de Electron, así que cada usuario trae su propia
// clave de Gemini. En Electron la clave va incrustada y no hace falta el gate.
const esWeb = typeof window !== "undefined" && !window.nutriai;

// ¿App nativa Android? (para el paso de optimización del onboarding, que sugiere
// inicio automático + batería sin restricciones — conceptos solo de Android.)
const esAndroid = typeof window !== "undefined" &&
  window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === "android";

// Lazy-load de todas las pantallas: cada una se descarga como un chunk aparte,
// reduciendo el bundle inicial.
const PantallaBienvenida    = lazy(() => import("./components/screens/PantallaBienvenida.jsx"));
const PantallaConexion      = lazy(() => import("./components/screens/PantallaConexion.jsx"));
const PantallaOptimizacion  = lazy(() => import("./components/screens/PantallaOptimizacion.jsx"));
const PantallaCuenta        = lazy(() => import("./components/screens/PantallaCuenta.jsx"));
const PantallaAjustes       = lazy(() => import("./components/screens/PantallaAjustes.jsx"));
const PantallaPerfil        = lazy(() => import("./components/screens/PantallaPerfil.jsx"));
const PantallaInicio        = lazy(() => import("./components/screens/PantallaInicio.jsx"));
const PantallaAnalizar      = lazy(() => import("./components/screens/PantallaAnalizar.jsx"));
const PantallaClarificacion = lazy(() => import("./components/screens/PantallaClarificacion.jsx"));
const PantallaResultado     = lazy(() => import("./components/screens/PantallaResultado.jsx"));
const PantallaRegistro      = lazy(() => import("./components/screens/PantallaRegistro.jsx"));
const PantallaCrear         = lazy(() => import("./components/screens/PantallaCrear.jsx"));
const PantallaChat          = lazy(() => import("./components/screens/PantallaChat.jsx"));
const PantallaNotificaciones = lazy(() => import("./components/screens/PantallaNotificaciones.jsx"));
const PantallaComidasFijas  = lazy(() => import("./components/screens/PantallaComidasFijas.jsx"));
const PantallaPreparando    = lazy(() => import("./components/screens/PantallaPreparando.jsx"));
const MenuLateral           = lazy(() => import("./components/screens/MenuLateral.jsx"));

function Cargando({ texto }) {
  const t = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 99, border: `3px solid ${T.accentBdr}`, borderTopColor: T.accent, animation: "spin .8s linear infinite" }} />
      <div style={{ color: T.muted, fontSize: 14 }}>{texto ?? t("app.cargando")}</div>
    </div>
  );
}

export default function App() {
  const [pantalla, setPantalla] = useState("cargando");
  const [perfil, setPerfil] = useState(null);
  const [objetivos, setObjetivos] = useState(null);
  const [comidas, setComidas] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [datosImagen, setDatosImagen] = useState(null);
  const [tipoComida, setTipoComida] = useState(null);   // tipo elegido al analizar
  const [chatConvId, setChatConvId] = useState(null);   // conversación a abrir al entrar al chat
  // A qué pantalla volver desde el Resultado: "analyze" (foto/texto) — Crear ya no pasa por aquí.
  const [origenResultado, setOrigenResultado] = useState("analyze");
  // Web/APK: ¿hay clave de Gemini configurada? En Electron siempre true.
  const [claveOk, setClaveOk] = useState(!esWeb);
  // La pantalla de conexión se reutiliza como ajustes (cabecera compacta,
  // opción de borrar). true = abierta desde ajustes; false = onboarding.
  const [conexionAjustes, setConexionAjustes] = useState(false);
  // Menú lateral (hamburguesa) y punto rojo del entrenador (mensajes sin leer).
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [coachNoLeido, setCoachNoLeido] = useState(false);
  // ¿Estamos en el flujo de alta (onboarding)? Orden: perfil → conexión →
  // preparar entrenador → optimización → panel. Lo usamos para encadenar pasos.
  const [enOnboarding, setEnOnboarding] = useState(false);
  // Aviso de actualización (consulta a GitHub al arrancar).
  const [actualizacion, setActualizacion] = useState(null);
  const [actuDescartada, setActuDescartada] = useState(false);

  const abrirConexion = (ajustes = false) => { setConexionAjustes(ajustes); setPantalla("conexion"); };

  // Navegación desde el menú lateral: cierra el menú y va al destino.
  const navegarMenu = (destino) => {
    setMenuAbierto(false);
    if (destino === "conexion") return abrirConexion(true);
    if (destino === "chat") setChatConvId(null);   // desde el menú, abre la lista
    setPantalla(destino);   // "chat" | "ajustes" | "comidasfijas"
  };

  // Desde el buzón de Notificaciones: hablar con el entrenador sobre un resumen.
  const hablarSobreResumen = async (resumen) => {
    const conv = await crearChatSobreResumen(resumen);
    setChatConvId(conv.id);
    setPantalla("chat");
  };

  // Tras reanudar/arrancar: si el entrenador dejó su resumen diario (o tocaron
  // la notificación), enciende el punto rojo, marca el resumen pendiente y —si
  // fue por tocar la notificación— abre el chat directamente.
  // `hayPerfil` evita navegar al chat si el usuario aún está en el onboarding
  // (sin perfil): solo encendemos el punto rojo/resumen, sin cambiar de pantalla.
  const revisarCoachNotif = useCallback(async (hayPerfil) => {
    const { pendiente, abrirChat } = await estadoCoachNotif();
    if (pendiente) {
      await marcarCoachNoLeido();
      await marcarResumenPendiente(true);
      setCoachNoLeido(true);
    }
    // El botón "Ver resumen" de la notificación abre el buzón de Notificaciones,
    // que es donde se genera y aparece el resumen del día.
    if (abrirChat && hayPerfil) setPantalla("notificaciones");
  }, []);

  // Comidas frecuentes: añade automáticamente las que tocan hoy (franjas ya
  // empezadas y no añadidas aún). Se llama al arrancar y al volver a primer plano.
  const revisarFrecuentes = useCallback(async () => {
    const nuevas = await autoAnadirFrecuentes();
    if (!nuevas.length) return;
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    await ss(KEYS.COMIDAS, [...todas, ...nuevas]);
    setComidas((prev) => [...prev, ...nuevas]);
  }, []);

  // ── Atrás de Android: se comporta como el botón "Volver" ──
  // Las pantallas con sub-vistas (Crear, Ajustes) registran un interceptor con
  // useAtras; si lo manejan devuelven true. Si no, se navega según la pantalla.
  const interceptores = useRef([]);
  const registrarAtras = useCallback((fn) => {
    interceptores.current.push(fn);
    return () => {
      const i = interceptores.current.indexOf(fn);
      if (i >= 0) interceptores.current.splice(i, 1);
    };
  }, []);
  const pantallaRef = useRef(pantalla);               pantallaRef.current = pantalla;
  const perfilRef = useRef(perfil);                   perfilRef.current = perfil;
  const origenRef = useRef(origenResultado);          origenRef.current = origenResultado;
  const conexionAjustesRef = useRef(conexionAjustes); conexionAjustesRef.current = conexionAjustes;
  const enOnboardingRef = useRef(enOnboarding);       enOnboardingRef.current = enOnboarding;

  useEffect(() => {
    (async () => {
      await migrarModeloAuto();   // mueve modelos por defecto antiguos a "auto"
      let p = await sg(KEYS.PERFIL);
      let t = await sg(KEYS.OBJETIVOS);
      // Limpieza automática: comidas con más de 90 días
      const recientes = await limpiarComidasAntiguas();
      const comidasHoy = recientes.filter(m => new Date(m.createdAt).toDateString() === hoy());

      const hayClave = esWeb ? !!(await getApiKey()) : true;
      setClaveOk(hayClave);

      if (p && t) {
        // La edad se deriva de la fecha de nacimiento: se actualiza sola (p. ej.
        // el día del cumpleaños) y con ella se recalculan los objetivos.
        if (p.birthDate) {
          const e = edadDesdeFecha(p.birthDate);
          if (e != null && e !== p.age) {
            p = { ...p, age: e };
            t = calcTargets(p);
            await ss(KEYS.PERFIL, p);
            await ss(KEYS.OBJETIVOS, t);
          }
          programarCumple(p.birthDate);   // (re)programa la notificación de cumpleaños
        }
        setPerfil(p); setObjetivos(t); setComidas(comidasHoy);
        // Perfil listo pero sin clave (p. ej. tras cambiar de móvil): pedirla antes.
        setPantalla(hayClave ? "dashboard" : "conexion");
      } else {
        setPantalla("bienvenida");
      }
      // Al final de la carga (para ganar la carrera con la pantalla inicial):
      // si se abrió tocando la notificación del entrenador, ir al chat.
      await revisarCoachNotif(!!(p && t));
      if (p && t) await revisarFrecuentes();   // comidas frecuentes de hoy
    })();
  }, [revisarCoachNotif, revisarFrecuentes]);

  // Aviso de actualización: comprobar una vez al arrancar (solo Android).
  useEffect(() => { comprobarActualizacion().then(setActualizacion); }, []);

  // Punto rojo del entrenador: se refresca al volver al panel (p. ej. tras salir
  // del chat, que ya marcó como leído) y al arrancar.
  useEffect(() => {
    if (pantalla === "dashboard") { getCoachNoLeido().then(setCoachNoLeido); setEnOnboarding(false); }
  }, [pantalla]);

  // Si una llamada a Gemini falla por clave inválida/revocada, gemini-client.js
  // dispara este evento y volvemos a la pantalla de conexión.
  useEffect(() => {
    if (!esWeb) return;
    const alFallarClave = () => { setClaveOk(false); abrirConexion(false); };
    window.addEventListener("nutriai:clave-invalida", alFallarClave);
    return () => window.removeEventListener("nutriai:clave-invalida", alFallarClave);
  }, []);

  // Botón/gesto atrás de Android: primero deja que la pantalla cierre sus
  // sub-vistas (interceptores); si nadie lo maneja, navega según la pantalla.
  useEffect(() => {
    let quitar;
    (async () => {
      if (!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.())) return;
      const { App: CapApp } = await import("@capacitor/app");
      const handle = await CapApp.addListener("backButton", () => {
        const stack = interceptores.current;
        for (let i = stack.length - 1; i >= 0; i--) {
          try { if (stack[i]()) return; } catch { /* ignorar */ }
        }
        const p = pantallaRef.current;
        if (p === "dashboard" || p === "bienvenida" || p === "cargando") { CapApp.exitApp(); return; }
        if (["analyze", "crear", "summary", "cuenta", "ajustes", "chat", "notificaciones", "comidasfijas"].includes(p)) { setPantalla("dashboard"); return; }
        if (p === "clarificacion") { setPantalla("analyze"); return; }
        if (p === "resultado") { setPantalla(origenRef.current); return; }
        if (p === "optimizacion") { setPantalla("dashboard"); return; }
        if (p === "perfil" || p === "profile_edit") { setPantalla(enOnboardingRef.current ? "bienvenida" : (perfilRef.current ? "cuenta" : "bienvenida")); return; }
        if (p === "conexion") { setPantalla(conexionAjustesRef.current ? "ajustes" : (enOnboardingRef.current ? "perfil" : (perfilRef.current ? "dashboard" : "bienvenida"))); return; }
      });
      quitar = () => handle.remove();
    })();
    return () => { if (quitar) quitar(); };
  }, []);

  // Recordatorios: en el primer arranque pide permiso (si nunca se respondió) y
  // programa; además, cada vez que la app vuelve a primer plano se reprograma
  // (robustez: sobreviven a cerrar/abrir la app; el reinicio del móvil lo cubre
  // el receptor de arranque del plugin).
  useEffect(() => {
    arranqueNotif();
    // El arranque en frío por notificación lo maneja el efecto de carga inicial
    // (para navegar al chat en el orden correcto). Aquí solo el ciclo de vida.
    let quitar;
    (async () => {
      if (!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.())) return;
      const { App: CapApp } = await import("@capacitor/app");
      const handle = await CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) { inicializarNotif(); revisarCoachNotif(!!perfilRef.current); getCoachNoLeido().then(setCoachNoLeido); if (perfilRef.current) revisarFrecuentes(); }
      });
      quitar = () => handle.remove();
    })();
    return () => { if (quitar) quitar(); };
  }, [revisarCoachNotif, revisarFrecuentes]);

  const guardarPerfil = async p => {
    const t = calcTargets(p);
    setPerfil(p); setObjetivos(t);
    await ss(KEYS.PERFIL, p);
    await ss(KEYS.OBJETIVOS, t);
    if (p.birthDate) programarCumple(p.birthDate);   // notificación de cumpleaños
    // Onboarding: tras el perfil toca conectar la IA (web/APK). En edición
    // (fuera del onboarding) o escritorio, directo al panel.
    if (enOnboarding) {
      if (esWeb && !claveOk) return setPantalla("conexion");
      if (esWeb) return setPantalla("preparando");           // ya hay clave
      return setPantalla(esAndroid ? "optimizacion" : "dashboard");
    }
    setPantalla("dashboard");
  };

  // Tras importar una copia de seguridad: recarga todo desde el almacenamiento
  // (que la importación acaba de sobrescribir) y vuelve al panel.
  const recargarTrasImportar = async () => {
    const p = await sg(KEYS.PERFIL);
    const t = await sg(KEYS.OBJETIVOS);
    const recientes = await limpiarComidasAntiguas();
    const comidasHoy = recientes.filter(m => new Date(m.createdAt).toDateString() === hoy());
    if (p) setPerfil(p);
    if (t) setObjetivos(t);
    setComidas(comidasHoy);
    if (esWeb) setClaveOk(!!(await getApiKey()));
    inicializarNotif();   // reprograma recordatorios según la config restaurada
    setPantalla("dashboard");
  };

  const guardarComida = async comida => {
    // El tipo de comida puede venir en el propio objeto (comida fija) o del
    // selector del análisis (tipoComida). El del objeto tiene prioridad.
    const c = { ...comida, mealType: comida.mealType || tipoComida || null };
    const nuevas = [...comidas, c];
    setComidas(nuevas);
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    const pasadas = todas.filter(m => new Date(m.createdAt).toDateString() !== hoy());
    await ss(KEYS.COMIDAS, [...pasadas, ...nuevas]);
    setAnalisis(null); setTipoComida(null); setPantalla("dashboard");
  };

  const eliminarComida = async id => {
    const nuevas = comidas.filter(m => m.id !== id);
    setComidas(nuevas);
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    await ss(KEYS.COMIDAS, todas.filter(m => m.id !== id));
  };

  const reiniciarDia = async () => {
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    await ss(KEYS.COMIDAS, todas.filter(m => new Date(m.createdAt).toDateString() !== hoy()));
    setComidas([]);
  };

  // Guarda la valoración de saciedad de una comida (hoy en memoria + histórico persistido)
  const manejarFeedback = async (id, valor) => {
    setComidas(prev => prev.map(m => m.id === id ? { ...m, satiety: valor } : m));
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    await ss(KEYS.COMIDAS, todas.map(m => m.id === id ? { ...m, satiety: valor } : m));
  };

  const navegar = s => {
    if (s === "analyze") { setAnalisis(null); setDatosImagen(null); setTipoComida(null); }
    setPantalla(s);
  };

  const mostrarNav = perfil &&
    !["bienvenida", "perfil", "profile_edit", "cargando", "clarificacion", "conexion", "optimizacion", "cuenta", "ajustes", "chat", "notificaciones", "comidasfijas", "preparando"].includes(pantalla);

  const renderPantalla = () => {
    if (pantalla === "cargando") return <Cargando />;
    if (pantalla === "bienvenida") return (
      <PantallaBienvenida onEmpezar={() => { setEnOnboarding(true); setPantalla("perfil"); }} />
    );
    if (pantalla === "conexion") return (
      <PantallaConexion
        modoAjustes={conexionAjustes}
        onListo={() => {
          setClaveOk(true);
          if (conexionAjustes) return setPantalla("ajustes");
          // Onboarding: tras conectar la IA, el entrenador se prepara con el perfil.
          if (enOnboarding) return setPantalla("preparando");
          return setPantalla("dashboard");   // re-añadir clave (el perfil ya existe)
        }}
        onVolver={conexionAjustes ? () => setPantalla("ajustes") : (enOnboarding ? () => setPantalla("perfil") : (perfil ? () => setPantalla("dashboard") : () => setPantalla("bienvenida")))}
      />
    );
    if (pantalla === "optimizacion") return (
      <PantallaOptimizacion onContinuar={() => setPantalla("dashboard")} />
    );
    if (pantalla === "perfil" || pantalla === "profile_edit") return (
      <PantallaPerfil
        existente={perfil}
        onGuardar={guardarPerfil}
        onVolver={() => setPantalla(perfil ? "cuenta" : "bienvenida")}
      />
    );
    if (pantalla === "cuenta") return (
      <PantallaCuenta
        perfil={perfil} objetivos={objetivos}
        onEditar={() => setPantalla("profile_edit")}
        onVolver={() => setPantalla("dashboard")}
        onDatosImportados={recargarTrasImportar}
      />
    );
    if (pantalla === "ajustes") return (
      <PantallaAjustes
        onVolver={() => setPantalla("dashboard")}
        onConexion={esWeb ? () => abrirConexion(true) : undefined}
      />
    );
    if (pantalla === "dashboard") return (
      <PantallaInicio
        perfil={perfil} objetivos={objetivos} comidas={comidas}
        onAnalizar={() => setPantalla("analyze")}
        onEliminarComida={eliminarComida}
        onReiniciarDia={reiniciarDia}
        onNotificaciones={() => setPantalla("notificaciones")}
        onMenu={() => setMenuAbierto(true)}
        coachNoLeido={coachNoLeido}
        onFeedback={manejarFeedback}
      />
    );
    if (pantalla === "comidasfijas") return (
      <PantallaComidasFijas onVolver={() => setPantalla("dashboard")} />
    );
    if (pantalla === "chat") return (
      <PantallaChat
        perfil={perfil} objetivos={objetivos} comidas={comidas}
        convInicial={chatConvId}
        onVolver={() => setPantalla("dashboard")}
      />
    );
    if (pantalla === "notificaciones") return (
      <PantallaNotificaciones
        perfil={perfil} objetivos={objetivos} comidas={comidas}
        onHablar={hablarSobreResumen}
        onVolver={() => setPantalla("dashboard")}
      />
    );
    if (pantalla === "preparando") return (
      <PantallaPreparando
        perfil={perfil} objetivos={objetivos}
        onContinuar={() => setPantalla(esAndroid ? "optimizacion" : "dashboard")}
      />
    );
    if (pantalla === "analyze") return (
      <PantallaAnalizar
        perfil={perfil}
        onVolver={() => setPantalla("dashboard")}
        onResultado={(res, b64, mime, nota, macros, tipo) => {
          setAnalisis(res);
          setDatosImagen({ b64, mime, notaOriginal: nota, macrosUsuario: macros });
          setTipoComida(tipo ?? null);
          setOrigenResultado("analyze");
          setPantalla("resultado");
        }}
        onClarificacion={(res, b64, mime, nota, macros, tipo) => {
          setAnalisis(res);
          setDatosImagen({ b64, mime, notaOriginal: nota, macrosUsuario: macros });
          setTipoComida(tipo ?? null);
          setOrigenResultado("analyze");
          setPantalla("clarificacion");
        }}
      />
    );
    if (pantalla === "crear") return (
      <PantallaCrear
        perfil={perfil}
        onVolver={() => setPantalla("dashboard")}
        onGuardarComida={guardarComida}
      />
    );
    if (pantalla === "clarificacion") return (
      <PantallaClarificacion
        analisisInicial={analisis}
        datosImagen={datosImagen}
        onResultado={res => { setAnalisis(res); setDatosImagen(null); setPantalla("resultado"); }}
        onVolver={() => setPantalla("analyze")}
      />
    );
    if (pantalla === "resultado") return (
      <PantallaResultado
        analisis={analisis}
        datosImagen={datosImagen}
        onReanalizar={nuevoAnalisis => setAnalisis(nuevoAnalisis)}
        onGuardar={() => guardarComida(analisis)}
        onNuevaComida={() => { setDatosImagen(null); setPantalla(origenResultado); }}
        onVolver={() => setPantalla(origenResultado)}
      />
    );
    if (pantalla === "summary") return (
      <PantallaRegistro comidas={comidas} objetivos={objetivos} onEliminar={eliminarComida} onFeedback={manejarFeedback} />
    );
    return null;
  };

  return (
    <BackContext.Provider value={registrarAtras}>
      <div style={{
        maxWidth: 430, margin: "0 auto", minHeight: "100vh",
        background: T.bg, position: "relative",
        fontFamily: "'DM Sans', sans-serif", color: T.text,
      }}>
        {actualizacion && !actuDescartada && pantalla !== "cargando" && (
          <div style={{ position: "sticky", top: 0, zIndex: 300, background: T.accent, color: "#06080F", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>{traducir("actualizar.titulo")}{actualizacion.version ? ` (v${actualizacion.version})` : ""}</div>
              <div style={{ fontSize: 12, opacity: .85, lineHeight: 1.4 }}>{actualizacion.mensaje || traducir("actualizar.sub")}</div>
            </div>
            <button onClick={() => { try { window.open(actualizacion.url, "_system"); } catch { /* no-op */ } }}
              style={{ flexShrink: 0, background: "#06080F", color: T.accent, border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {traducir("actualizar.boton")}
            </button>
            <button onClick={() => setActuDescartada(true)} aria-label={traducir("actualizar.cerrar")}
              style={{ flexShrink: 0, background: "transparent", color: "#06080F", border: "none", cursor: "pointer", padding: 4, display: "flex", fontWeight: 800 }}>
              ✕
            </button>
          </div>
        )}
        <Suspense fallback={<Cargando />}>
          {renderPantalla()}
        </Suspense>
        {mostrarNav && <NavInferior pantalla={pantalla} setPantalla={navegar} />}
        <Suspense fallback={null}>
          <MenuLateral
            abierto={menuAbierto}
            onCerrar={() => setMenuAbierto(false)}
            onNavegar={navegarMenu}
          />
        </Suspense>
      </div>
    </BackContext.Provider>
  );
}
