import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { T } from "./theme.js";
import { calcTargets, edadDesdeFecha } from "./lib/nutrition.js";
import { sg, ss, hoy, limpiarComidasAntiguas, KEYS } from "./lib/storage.js";
import { getApiKey } from "./lib/apiKey.js";
import { useT } from "./lib/i18n.jsx";
import { BackContext } from "./lib/back.jsx";
import { inicializarNotif, arranqueNotif, programarCumple } from "./lib/notificaciones.js";
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
  // A qué pantalla volver desde el Resultado: "analyze" (foto/texto) — Crear ya no pasa por aquí.
  const [origenResultado, setOrigenResultado] = useState("analyze");
  // Web/APK: ¿hay clave de Gemini configurada? En Electron siempre true.
  const [claveOk, setClaveOk] = useState(!esWeb);
  // La pantalla de conexión se reutiliza como ajustes (cabecera compacta,
  // opción de borrar). true = abierta desde ajustes; false = onboarding.
  const [conexionAjustes, setConexionAjustes] = useState(false);

  const abrirConexion = (ajustes = false) => { setConexionAjustes(ajustes); setPantalla("conexion"); };

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

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

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
        if (["analyze", "crear", "summary", "cuenta", "ajustes"].includes(p)) { setPantalla("dashboard"); return; }
        if (p === "clarificacion") { setPantalla("analyze"); return; }
        if (p === "resultado") { setPantalla(origenRef.current); return; }
        if (p === "optimizacion") { setPantalla("perfil"); return; }
        if (p === "perfil" || p === "profile_edit") { setPantalla(perfilRef.current ? "cuenta" : "bienvenida"); return; }
        if (p === "conexion") { setPantalla(conexionAjustesRef.current ? "ajustes" : (perfilRef.current ? "dashboard" : "bienvenida")); return; }
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
    let quitar;
    (async () => {
      if (!(typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.())) return;
      const { App: CapApp } = await import("@capacitor/app");
      const handle = await CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) inicializarNotif();
      });
      quitar = () => handle.remove();
    })();
    return () => { if (quitar) quitar(); };
  }, []);

  const guardarPerfil = async p => {
    const t = calcTargets(p);
    setPerfil(p); setObjetivos(t);
    await ss(KEYS.PERFIL, p);
    await ss(KEYS.OBJETIVOS, t);
    if (p.birthDate) programarCumple(p.birthDate);   // notificación de cumpleaños
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
    const nuevas = [...comidas, comida];
    setComidas(nuevas);
    const todas = (await sg(KEYS.COMIDAS)) ?? [];
    const pasadas = todas.filter(m => new Date(m.createdAt).toDateString() !== hoy());
    await ss(KEYS.COMIDAS, [...pasadas, ...nuevas]);
    setAnalisis(null); setPantalla("dashboard");
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
    if (s === "analyze") { setAnalisis(null); setDatosImagen(null); }
    setPantalla(s);
  };

  const mostrarNav = perfil &&
    !["bienvenida", "perfil", "profile_edit", "cargando", "clarificacion", "conexion", "optimizacion", "cuenta", "ajustes"].includes(pantalla);

  const renderPantalla = () => {
    if (pantalla === "cargando") return <Cargando />;
    if (pantalla === "bienvenida") return (
      <PantallaBienvenida onEmpezar={() => (esWeb && !claveOk) ? abrirConexion(false) : setPantalla("perfil")} />
    );
    if (pantalla === "conexion") return (
      <PantallaConexion
        modoAjustes={conexionAjustes}
        onListo={() => {
          setClaveOk(true);
          if (conexionAjustes) return setPantalla("ajustes");
          if (perfil) return setPantalla("dashboard");
          // Onboarding en Android: sugerimos optimización antes de crear el perfil.
          return setPantalla(esAndroid ? "optimizacion" : "perfil");
        }}
        onVolver={conexionAjustes ? () => setPantalla("ajustes") : (perfil ? () => setPantalla("dashboard") : () => setPantalla("bienvenida"))}
      />
    );
    if (pantalla === "optimizacion") return (
      <PantallaOptimizacion onContinuar={() => setPantalla("perfil")} />
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
        onAjustes={() => setPantalla("ajustes")}
        onFeedback={manejarFeedback}
      />
    );
    if (pantalla === "analyze") return (
      <PantallaAnalizar
        perfil={perfil}
        onVolver={() => setPantalla("dashboard")}
        onResultado={(res, b64, mime, nota, macros) => {
          setAnalisis(res);
          setDatosImagen({ b64, mime, notaOriginal: nota, macrosUsuario: macros });
          setOrigenResultado("analyze");
          setPantalla("resultado");
        }}
        onClarificacion={(res, b64, mime, nota, macros) => {
          setAnalisis(res);
          setDatosImagen({ b64, mime, notaOriginal: nota, macrosUsuario: macros });
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
        <Suspense fallback={<Cargando />}>
          {renderPantalla()}
        </Suspense>
        {mostrarNav && <NavInferior pantalla={pantalla} setPantalla={navegar} />}
      </div>
    </BackContext.Provider>
  );
}
