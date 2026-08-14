import { useState, useEffect } from "react";
import { KeyRound, ExternalLink, CheckCircle2, AlertCircle, ChevronLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import Boton from "../ui/Boton.jsx";
import Selector from "../ui/Selector.jsx";
import {
  getApiKey, setApiKey, getModelo, setModelo,
  getApiKeys, addApiKey, removeApiKey, estadoClave,
  validarClaveYModelo, MODELOS_GEMINI, MODELO_PERSONALIZADO, MODELO_POR_DEFECTO,
} from "../../lib/apiKey.js";

const URL_AISTUDIO = "https://aistudio.google.com/apikey";

// Enmascara una clave dejando ver solo los últimos 4 caracteres.
const enmascarar = (k) => (k && k.length > 8 ? `${"•".repeat(k.length - 4)}${k.slice(-4)}` : k);

// ¿El modelo guardado es uno de la lista, o uno escrito a mano?
const esDeLista = (m) => MODELOS_GEMINI.some((o) => o.v === m && o.v !== MODELO_PERSONALIZADO);

export default function PantallaConexion({ onListo, onVolver, modoAjustes = false }) {
  const t = useT();
  const [clave, setClave] = useState("");
  const [claveGuardada, setClaveGuardada] = useState("");   // la que ya estaba (para no re-pedirla)
  const [verClave, setVerClave] = useState(false);
  const [opcionModelo, setOpcionModelo] = useState(MODELO_POR_DEFECTO); // valor del desplegable
  const [modeloManual, setModeloManual] = useState("");                 // ID a mano si "Otro"
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cargado, setCargado] = useState(false);
  const [claves, setClaves] = useState([]);   // lista completa (modo ajustes)

  const recargarClaves = async () => setClaves(await getApiKeys());

  // Precarga: en modo ajustes (o si el usuario ya tenía clave) rellenamos estado.
  useEffect(() => {
    (async () => {
      const [k, m] = [await getApiKey(), await getModelo()];
      setClaveGuardada(k);
      if (esDeLista(m)) { setOpcionModelo(m); }
      else { setOpcionModelo(MODELO_PERSONALIZADO); setModeloManual(m); }
      await recargarClaves();
      setCargado(true);
    })();
  }, []);

  const modeloElegido = opcionModelo === MODELO_PERSONALIZADO ? modeloManual.trim() : opcionModelo;
  // En ajustes, si el usuario no reescribe la clave, se reutiliza la guardada.
  const claveEfectiva = clave.trim() || claveGuardada;

  const validarYContinuar = async () => {
    setError(""); setOkMsg("");
    if (opcionModelo === MODELO_PERSONALIZADO && !modeloManual.trim()) {
      setError(t("conexion.err_modelo")); return;
    }

    // Onboarding: valida una clave para empezar y continúa.
    if (!modoAjustes) {
      if (!claveEfectiva) { setError(t("conexion.err_clave")); return; }
      setValidando(true);
      const res = await validarClaveYModelo({ apiKey: claveEfectiva, modelo: modeloElegido });
      if (!res.ok) { setError(res.error); setValidando(false); return; }
      await addApiKey(claveEfectiva);
      await setModelo(modeloElegido);
      setValidando(false);
      onListo?.();
      return;
    }

    // Ajustes: guarda el modelo y AÑADE la clave escrita (si hay) a la lista.
    await setModelo(modeloElegido);
    const nueva = clave.trim();
    if (!nueva) { await recargarClaves(); setOkMsg(t("conexion.modelo_guardado")); return; }
    setValidando(true);
    const res = await validarClaveYModelo({ apiKey: nueva, modelo: modeloElegido });
    if (!res.ok) { setError(res.error); setValidando(false); return; }
    await addApiKey(nueva);
    await recargarClaves();
    setClave(""); setValidando(false);
    setOkMsg(t("conexion.clave_anadida"));
  };

  const quitarClave = async (key) => {
    await removeApiKey(key);
    await recargarClaves();
  };

  if (!cargado) return null;

  const tieneClave = !!claveGuardada;
  const placeholderClave = (!modoAjustes && tieneClave && !clave) ? enmascarar(claveGuardada) : "AIza…";

  // Etiquetas de modelo traducidas (los nombres de producto se mantienen; solo
  // se traduce el sufijo "(recomendado)" y la opción "Otro").
  const opcionesModelo = MODELOS_GEMINI.map((o) => {
    if (o.v === MODELO_PERSONALIZADO) return { v: o.v, l: t("conexion.modelo_otro") };
    // Para el modelo por defecto: nombre real (de MODELOS_GEMINI) + "(recomendado)"
    // traducido. Antes estaba fijado a "Gemini 3.5 Flash", que quedó obsoleto.
    if (o.v === MODELO_POR_DEFECTO) {
      const base = o.l.replace(/\s*\([^)]*\)\s*$/, "");
      return { v: o.v, l: `${base} (${t("conexion.recomendado")})` };
    }
    return { v: o.v, l: o.l };
  });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      {/* Cabecera */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        {onVolver && (
          <button onClick={onVolver} aria-label={t("comun.volver")}
            style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            {modoAjustes ? t("conexion.kicker_aj") : t("conexion.kicker")}
          </div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>
            {modoAjustes ? t("conexion.titulo_aj") : t("conexion.titulo")}
          </h2>
        </div>
      </div>

      <div style={{ flex: 1, padding: "16px 20px 4px", overflowY: "auto" }}>
        {/* Icono + intro */}
        {!modoAjustes && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: `linear-gradient(135deg, ${T.accent}, ${T.carb})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14, boxShadow: `0 0 40px ${T.accent}40`,
            }}>
              <KeyRound size={28} color="#06080F" />
            </div>
            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, maxWidth: 320 }}>
              {t("conexion.intro")}
            </p>
          </div>
        )}

        {/* Tutorial paso a paso */}
        <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 12 }}>
            {t("conexion.tutorial")}
          </div>
          {[
            t("conexion.paso1"),
            t("conexion.paso2"),
            t("conexion.paso3"),
            t("conexion.paso4"),
          ].map((paso, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 10 : 0, alignItems: "flex-start" }}>
              <div style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: 99,
                background: T.accentBg, border: `1px solid ${T.accentBdr}`, color: T.accent,
                fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</div>
              <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.5, paddingTop: 1 }}>{paso}</div>
            </div>
          ))}
          <a href={URL_AISTUDIO} target="_blank" rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 14, padding: "11px", borderRadius: 12,
              background: "transparent", border: `1px solid ${T.accentBdr}`, color: T.accent,
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
            <ExternalLink size={15} /> {t("conexion.abrir")}
          </a>
        </div>

        {/* Aviso: solo Gemini */}
        <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8 }}>
          <AlertCircle size={16} color={T.warn} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: T.warn, lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: t("conexion.aviso") }} />
        </div>

        {/* Lista de claves (modo ajustes): estado + rotación automática */}
        {modoAjustes && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>
              {t("conexion.claves_titulo")}
            </div>
            {claves.length === 0 ? (
              <div style={{ fontSize: 13, color: T.dim, padding: "2px 2px 4px" }}>{t("conexion.sin_claves")}</div>
            ) : claves.map((k) => {
              const est = estadoClave(k);
              const col = est === "activa" ? T.accent : est === "agotada" ? T.warn : T.danger;
              const bg = est === "activa" ? T.accentBg : est === "agotada" ? T.warnBg : T.dangerBg;
              return (
                <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 10, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                  <KeyRound size={15} color={T.muted} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.text, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enmascarar(k.key)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col, background: bg, border: `1px solid ${col}44`, borderRadius: 7, padding: "3px 7px", flexShrink: 0 }}>{t(`conexion.estado.${est}`)}</span>
                  <button onClick={() => quitarClave(k.key)} aria-label={t("conexion.quitar")}
                    style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, color: T.danger, cursor: "pointer", padding: "5px 7px", display: "flex", flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2, lineHeight: 1.5 }}>{t("conexion.claves_nota")}</div>
          </div>
        )}

        {/* Campo clave */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 5 }}>{modoAjustes ? t("conexion.anadir_otra") : t("conexion.clave_label")}</div>
          <div style={{ position: "relative" }}>
            <input
              type={verClave ? "text" : "password"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder={placeholderClave}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              style={{
                width: "100%", padding: "11px 42px 11px 13px",
                background: T.s2, border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.text, fontSize: 15,
                outline: "none", fontFamily: "inherit",
              }}
              onFocus={(e) => { e.target.style.borderColor = T.accent; }}
              onBlur={(e) => { e.target.style.borderColor = T.border; }}
            />
            <button onClick={() => setVerClave((v) => !v)} aria-label={verClave ? t("conexion.ocultar") : t("conexion.ver")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}>
              {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!modoAjustes && tieneClave && !clave && (
            <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
              {t("conexion.ya_clave")}
            </div>
          )}
        </div>

        {/* Desplegable de modelo (se guarda solo al elegir uno de la lista) */}
        <Selector
          etiqueta={t("conexion.modelo_label")}
          v={opcionModelo}
          set={(v) => { setOpcionModelo(v); if (v !== MODELO_PERSONALIZADO) setModelo(v); }}
          opciones={opcionesModelo}
        />
        {opcionModelo === MODELO_PERSONALIZADO && (
          <div style={{ marginBottom: 14, marginTop: -4 }}>
            <input
              type="text" value={modeloManual}
              onChange={(e) => setModeloManual(e.target.value)}
              placeholder={t("conexion.modelo_ph")}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              style={{
                width: "100%", padding: "11px 13px",
                background: T.s2, border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.text, fontSize: 15, outline: "none", fontFamily: "inherit",
              }}
              onFocus={(e) => { e.target.style.borderColor = T.accent; }}
              onBlur={(e) => { e.target.style.borderColor = T.border; }}
            />
            <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
              {t("conexion.modelo_nota")}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8 }}>
            <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.danger, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}
        {/* Éxito (modo ajustes) */}
        {okMsg && (
          <div style={{ background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8 }}>
            <CheckCircle2 size={16} color={T.accent} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.accent, lineHeight: 1.5 }}>{okMsg}</div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ padding: "8px 20px 28px" }}>
        <Boton
          onClick={validarYContinuar}
          disabled={validando}
          icono={validando ? undefined : <CheckCircle2 size={16} />}
        >
          {validando ? t("conexion.validando") : (modoAjustes ? t("conexion.anadir_clave") : t("conexion.continuar"))}
        </Boton>
        <p style={{ textAlign: "center", fontSize: 11, color: T.dim, marginTop: 12, lineHeight: 1.5 }}>
          {t("conexion.privacidad")}
        </p>
      </div>
    </div>
  );
}
