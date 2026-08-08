import { useState, useRef } from "react";
import { Camera, ChevronLeft, AlertCircle, Upload, X, Zap } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { analizarIA } from "../../lib/ai.js";
import { comprimirImagen } from "../../lib/image.js";
import Boton from "../ui/Boton.jsx";
import PreguntaCalorias from "../ui/PreguntaCalorias.jsx";

export default function PantallaAnalizar({ onVolver, onResultado, onClarificacion }) {
  const t = useT();
  const [modo, setModo] = useState("foto");             // "foto" | "texto"
  const [prevista, setPrevista] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState(null);
  const [nota, setNota] = useState("");
  const [descripcion, setDescripcion] = useState("");   // modo texto
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [sabeCalorias, setSabeCalorias] = useState(null);
  const [caloriasInput, setCaloriasInput] = useState("");
  const [proteinasInput, setProteinasInput] = useState("");
  const [carbosInput, setCarbosInput] = useState("");
  const [grasasInput, setGrasasInput] = useState("");
  const galeriaRef = useRef(null);
  const camaraRef = useRef(null);

  const cambiarModo = (m) => {
    setModo(m);
    setError(null);
    if (m !== "foto")  { setPrevista(null); setB64(null); setMime(null); }
    if (m !== "texto") { setDescripcion(""); }
  };

  const manejarArchivo = async f => {
    if (!f) return;
    setError(null);
    try {
      const { dataUrl, base64, mime: m } = await comprimirImagen(f);
      setPrevista(dataUrl); setB64(base64); setMime(m);
    } catch (e) {
      setError(e?.message || t("analizar.err_imagen"));
    }
  };

  const analizar = async () => {
    if (modo === "foto" && !b64) return;
    if (modo === "texto" && !descripcion.trim()) return;

    setCargando(true); setError(null);
    try {
      // Construir objeto macros con los campos que el usuario rellenó
      const macrosUsuario = sabeCalorias === true ? {
        ...(caloriasInput  !== "" ? { calorias:  Number(caloriasInput)  } : {}),
        ...(proteinasInput !== "" ? { proteinas: Number(proteinasInput) } : {}),
        ...(carbosInput    !== "" ? { carbos:    Number(carbosInput)    } : {}),
        ...(grasasInput    !== "" ? { grasas:    Number(grasasInput)    } : {}),
      } : null;
      const macrosFinal = (macrosUsuario && Object.keys(macrosUsuario).length > 0)
        ? macrosUsuario : null;

      // MODO TEXTO con los 4 macros completos → sin llamada a la IA
      if (modo === "texto") {
        const todosCubiertos =
          macrosFinal?.calorias  != null && macrosFinal?.proteinas != null &&
          macrosFinal?.carbos    != null && macrosFinal?.grasas    != null;

        if (todosCubiertos) {
          const res = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            createdAt: new Date().toISOString(),
            userNote: descripcion,
            mealName: descripcion.trim().slice(0, 80) || t("data.comida_manual"),
            summary: t("data.manual_summary"),
            caloriesKcal:   macrosFinal.calorias,
            proteinG:       macrosFinal.proteinas,
            carbohydratesG: macrosFinal.carbos,
            fatG:           macrosFinal.grasas,
            fiberG: null, sugarG: null, sodiumMg: null,
            confidence: "high",
            detectedFoods: [{ name: descripcion.trim().slice(0, 80), estimated_amount: "manual", confidence: "high" }],
            uncertaintyNotes: [],
            accuracyTips: [],
            healthNotes: [t("data.manual_health")],
          };
          onResultado(res, null, null, descripcion, macrosFinal);
          return;
        }
      }

      // MODO FOTO o MODO TEXTO con macros incompletos → llamar a la IA
      const b64Final   = modo === "foto" ? b64 : null;
      const mimeActual = modo === "foto" ? mime : null;
      const notaFinal  = modo === "foto" ? nota : descripcion;

      const res = await analizarIA(b64Final, mimeActual, notaFinal, macrosFinal);
      if (res.confidence === "low") {
        onClarificacion(res, b64Final, mimeActual, notaFinal, macrosFinal);
      } else {
        onResultado(res, b64Final, mimeActual, notaFinal, macrosFinal);
      }
    } catch (e) {
      const msg = e?.message || String(e) || t("analizar.err_generico");
      console.error("[NutriAI] Error en analizar:", msg, e);
      setError(msg || t("analizar.err_generico"));
    } finally {
      setCargando(false);
    }
  };

  const puedeAnalizar = modo === "foto" ? !!b64 : descripcion.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onVolver} aria-label={t("comun.volver")} style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>{t("analizar.titulo")}</h2>
          <div style={{ fontSize: 12, color: T.muted }}>
            {modo === "foto" ? t("analizar.sub_foto") : t("analizar.sub_texto")}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* ── Selector de modo ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: T.s2, borderRadius: 12, padding: 4 }}>
          {[
            { id: "foto",  label: t("analizar.tab_foto") },
            { id: "texto", label: t("analizar.tab_texto") },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => cambiarModo(id)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                background: modo === id ? T.accent : "transparent",
                color: modo === id ? "#06080F" : T.muted,
                fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                fontFamily: "inherit", transition: "all .2s", whiteSpace: "nowrap",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Zona de entrada según modo ── */}
        {modo === "foto" ? (
          <>
            {!prevista ? (
              <div style={{
                border: `2px dashed ${T.border}`, borderRadius: 16,
                padding: "32px 20px 24px", textAlign: "center",
                background: T.surf, marginBottom: 12,
              }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>{t("analizar.add_foto")}</div>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>{t("analizar.formatos")}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => camaraRef.current?.click()}
                    style={{ background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 10, padding: "10px 20px", fontSize: 13, color: T.accent, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <Camera size={15} />{t("analizar.camara")}
                  </button>
                  <button onClick={() => galeriaRef.current?.click()}
                    style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 20px", fontSize: 13, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <Upload size={15} />{t("analizar.galeria")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 16 }}>
                <img src={prevista} alt={t("analizar.alt_comida")} style={{ width: "100%", borderRadius: 16, maxHeight: 280, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                  <button onClick={() => camaraRef.current?.click()}
                    style={{ background: "rgba(0,0,0,.75)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                    <Camera size={12} />{t("analizar.camara")}
                  </button>
                  <button onClick={() => galeriaRef.current?.click()}
                    style={{ background: "rgba(0,0,0,.75)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                    <Upload size={12} />{t("analizar.galeria")}
                  </button>
                  <button onClick={() => { setPrevista(null); setB64(null); setMime(null); }}
                    aria-label={t("analizar.quitar_foto")}
                    style={{ background: "rgba(0,0,0,.75)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "5px 8px", display: "flex", alignItems: "center" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            <input ref={galeriaRef} type="file" accept="image/*"
              style={{ display: "none" }} onChange={e => manejarArchivo(e.target.files[0])} />
            <input ref={camaraRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }} onChange={e => manejarArchivo(e.target.files[0])} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 5 }}>{t("analizar.detalles")}</div>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder={t("analizar.detalles_ph")}
                rows={3}
                style={{ width: "100%", padding: "11px 13px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", transition: "border .2s", lineHeight: 1.55 }}
                onFocus={e => { e.target.style.borderColor = T.accent; }}
                onBlur={e => { e.target.style.borderColor = T.border; }}
              />
              <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
                {t("analizar.detalles_ej")}
              </div>
            </div>
          </>
        ) : (
          /* ── MODO TEXTO ── */
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 6 }}>{t("analizar.desc_label")}</div>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder={t("analizar.desc_ph")}
              rows={5}
              style={{ width: "100%", padding: "11px 13px", background: T.s2, border: `1px solid ${T.accentBdr}`, borderRadius: 10, color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", transition: "border .2s", lineHeight: 1.6 }}
              onFocus={e => { e.target.style.borderColor = T.accent; }}
              onBlur={e => { e.target.style.borderColor = T.accentBdr; }}
            />
            <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
              {t("analizar.desc_ej")}
            </div>
          </div>
        )}

        <PreguntaCalorias
          sabeCalorias={sabeCalorias}
          setSabeCalorias={setSabeCalorias}
          caloriasInput={caloriasInput}
          setCaloriasInput={setCaloriasInput}
          proteinasInput={proteinasInput}
          setProteinasInput={setProteinasInput}
          carbosInput={carbosInput}
          setCarbosInput={setCarbosInput}
          grasasInput={grasasInput}
          setGrasasInput={setGrasasInput}
        />

        <Boton onClick={analizar} disabled={!puedeAnalizar || cargando} icono={cargando ? null : <Zap size={15} />}>
          {cargando ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid #06080F", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
              {t("analizar.analizando")}
            </span>
          ) : t("analizar.analizar_ia")}
        </Boton>

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", gap: 8 }}>
            <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, color: T.danger, fontWeight: 600, marginBottom: 2 }}>{t("analizar.err_titulo")}</div>
              <div style={{ fontSize: 12, color: T.danger, opacity: .85 }}>{error}</div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: T.dim, marginTop: 10 }}>
          {t("analizar.footer")}
        </p>
      </div>
    </div>
  );
}
