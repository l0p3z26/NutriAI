import { useState } from "react";
import { ChevronLeft, AlertCircle, Zap } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { analizarIA } from "../../lib/ai.js";
import Boton from "../ui/Boton.jsx";
import Tarjeta from "../ui/Tarjeta.jsx";
import PreguntaCalorias from "../ui/PreguntaCalorias.jsx";

export default function PantallaClarificacion({ analisisInicial, datosImagen, onResultado, onVolver }) {
  const t = useT();
  const [clarificacion, setClarificacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const { b64, mime, notaOriginal, macrosUsuario: macrosPrevios } = datosImagen;
  // Pre-rellenar si el usuario ya introdujo valores en la pantalla anterior
  const tienePrevios = macrosPrevios != null && Object.keys(macrosPrevios).length > 0;
  const [sabeCalorias, setSabeCalorias] = useState(tienePrevios ? true : null);
  const [caloriasInput,  setCaloriasInput]  = useState(macrosPrevios?.calorias  != null ? String(macrosPrevios.calorias)  : "");
  const [proteinasInput, setProteinasInput] = useState(macrosPrevios?.proteinas != null ? String(macrosPrevios.proteinas) : "");
  const [carbosInput,    setCarbosInput]    = useState(macrosPrevios?.carbos    != null ? String(macrosPrevios.carbos)    : "");
  const [grasasInput,    setGrasasInput]    = useState(macrosPrevios?.grasas    != null ? String(macrosPrevios.grasas)    : "");

  const reanalizar = async () => {
    setCargando(true); setError(null);
    const macrosUsuario = sabeCalorias === true ? {
      ...(caloriasInput  !== "" ? { calorias:  Number(caloriasInput)  } : {}),
      ...(proteinasInput !== "" ? { proteinas: Number(proteinasInput) } : {}),
      ...(carbosInput    !== "" ? { carbos:    Number(carbosInput)    } : {}),
      ...(grasasInput    !== "" ? { grasas:    Number(grasasInput)    } : {}),
    } : null;
    const macrosFinal = (macrosUsuario && Object.keys(macrosUsuario).length > 0) ? macrosUsuario : null;
    try {
      const alimentosInciertos = analisisInicial.detectedFoods
        .filter(f => f.confidence === "low")
        .map(f => f.name)
        .join(", ");

      const notaCombinada = [
        notaOriginal,
        clarificacion,
        alimentosInciertos ? `La IA no estaba segura sobre: ${alimentosInciertos}` : "",
      ].filter(Boolean).join(". ");

      const res = await analizarIA(b64, mime, notaCombinada, macrosFinal);
      onResultado(res);
    } catch (e) {
      setError(e.message || t("clarif.err"));
    } finally {
      setCargando(false);
    }
  };

  const usarEstimacionActual = () => onResultado(analisisInicial);

  const inciertos = analisisInicial.detectedFoods.filter(f => f.confidence === "low");
  const notas = analisisInicial.uncertaintyNotes;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onVolver} aria-label={t("comun.volver")} style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>{t("clarif.titulo")}</h2>
          <div style={{ fontSize: 12, color: T.muted }}>{t("clarif.sub")}</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Banner de aviso */}
        <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10 }}>
          <AlertCircle size={18} color={T.warn} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.warn, marginBottom: 4 }}>
              {t("clarif.conf_baja")}
            </div>
            <div style={{ fontSize: 12, color: T.warn, opacity: .85, lineHeight: 1.55 }}>
              {t("clarif.mejora")}
            </div>
          </div>
        </div>

        {/* Alimentos con baja confianza */}
        {inciertos.length > 0 && (
          <Tarjeta sx={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
              {t("clarif.inciertos")}
            </div>
            {inciertos.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: i < inciertos.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 99, background: T.danger, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{f.name}</div>
                  {f.estimated_amount && <div style={{ fontSize: 11, color: T.muted }}>{f.estimated_amount}</div>}
                </div>
              </div>
            ))}
          </Tarjeta>
        )}

        {/* Notas de incertidumbre de la IA */}
        {notas.length > 0 && (
          <Tarjeta sx={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
              {t("clarif.pregunta")}
            </div>
            {notas.map((n, i) => (
              <div key={i} style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginBottom: i < notas.length - 1 ? 6 : 0 }}>
                {"•"} {n}
              </div>
            ))}
          </Tarjeta>
        )}

        {/* Valores nutricionales - pre-rellenado si ya se respondió antes */}
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

        {/* Campo de clarificacion */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 6 }}>
            {t("clarif.aclaracion")}
          </div>
          <textarea
            value={clarificacion}
            onChange={e => setClarificacion(e.target.value)}
            placeholder={t("clarif.aclaracion_ph")}
            rows={4}
            style={{
              width: "100%", padding: "11px 13px",
              background: T.s2, border: `1px solid ${T.accentBdr}`,
              borderRadius: 10, color: T.text, fontSize: 14,
              outline: "none", fontFamily: "inherit", resize: "vertical",
              transition: "border .2s", lineHeight: 1.55,
            }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e => { e.target.style.borderColor = T.accentBdr; }}
          />
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
            {t("clarif.aclaracion_ej")}
          </div>
        </div>

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8 }}>
            <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: T.danger }}>{error}</div>
          </div>
        )}

        <Boton
          onClick={reanalizar}
          disabled={!clarificacion.trim() || cargando}
          icono={cargando ? null : <Zap size={15} />}
          sx={{ marginBottom: 10 }}>
          {cargando ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid #06080F", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
              {t("clarif.reanalizando")}
            </span>
          ) : t("clarif.reanalizar")}
        </Boton>

        <Boton onClick={usarEstimacionActual} variante="ghost">
          {t("clarif.usar_actual")}
        </Boton>

        <p style={{ textAlign: "center", fontSize: 11, color: T.dim, marginTop: 12 }}>
          {t("clarif.footer")}
        </p>
      </div>
    </div>
  );
}
