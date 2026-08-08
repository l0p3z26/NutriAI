import { useState } from "react";
import {
  ChevronLeft, Plus, Trash2, AlertCircle, CheckCircle, Target, Edit3, Zap,
} from "lucide-react";
import { T, fmt } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { analizarIA } from "../../lib/ai.js";
import Boton from "../ui/Boton.jsx";
import Tarjeta from "../ui/Tarjeta.jsx";
import BadgeConfianza from "../ui/BadgeConfianza.jsx";

export default function PantallaResultado({ analisis: a, datosImagen, onReanalizar, onGuardar, onNuevaComida, onVolver }) {
  const t = useT();
  const [alimentos, setAlimentos] = useState(a?.detectedFoods ?? []);
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCantidad, setEditCantidad] = useState("");
  const [reanalizando, setReanalizando] = useState(false);
  const [errorRe, setErrorRe] = useState(null);
  const [snapshot] = useState(() => JSON.stringify(a?.detectedFoods ?? []));

  const modificado = JSON.stringify(alimentos) !== snapshot;

  const abrirEditor = (i) => {
    setEditandoIdx(i);
    setEditNombre(alimentos[i]?.name ?? "");
    setEditCantidad(alimentos[i]?.estimated_amount ?? "");
    setErrorRe(null);
  };

  const confirmarEdicion = () => {
    if (editandoIdx === null) return;
    setAlimentos(prev => prev.map((f, i) => i === editandoIdx ? {
      ...f,
      name: editNombre.trim() || f.name,
      estimated_amount: editCantidad.trim() || f.estimated_amount,
    } : f));
    setEditandoIdx(null);
  };

  const eliminarAlimento = (i) => {
    setAlimentos(prev => prev.filter((_, idx) => idx !== i));
    setEditandoIdx(null);
  };

  const reanalizar = async () => {
    if (!datosImagen?.b64) return;
    setReanalizando(true); setErrorRe(null);
    try {
      const listaCorregida = alimentos
        .map(f => `${f.name}${f.estimated_amount ? ` (${f.estimated_amount})` : ""}`)
        .join(", ");
      const notaCombinada = [
        datosImagen.notaOriginal,
        `Corrección del usuario sobre los alimentos: ${listaCorregida}`,
      ].filter(Boolean).join(". ");

      const res = await analizarIA(
        datosImagen.b64, datosImagen.mime,
        notaCombinada,
        datosImagen.macrosUsuario ?? null
      );
      // Mantener la lista corregida por el usuario
      res.detectedFoods = alimentos;
      onReanalizar(res);
    } catch (e) {
      setErrorRe(e.message || t("resultado.err_re"));
    } finally {
      setReanalizando(false);
    }
  };

  if (!a) return null;

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    background: T.bg, border: `1px solid ${T.accentBdr}`,
    borderRadius: 8, color: T.text, fontSize: 13,
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 100, overflowY: "auto" }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onVolver} aria-label={t("comun.volver")} style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.mealName}
          </h2>
          <div style={{ marginTop: 4 }}><BadgeConfianza nivel={a.confidence} /></div>
        </div>
      </div>

      <div style={{ padding: "16px 14px 0" }}>
        {a.summary && (
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.65, marginBottom: 14 }}>{a.summary}</p>
        )}

        <Tarjeta sx={{ marginBottom: 12, background: `linear-gradient(135deg, ${T.accentBg} 0%, ${T.surf} 100%)`, border: `1px solid ${T.accentBdr}` }}>
          <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{t("resultado.total_cal")}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 60, fontWeight: 800, color: T.accent, lineHeight: 1 }}>{fmt(a.caloriesKcal)}</div>
            <div style={{ fontSize: 14, color: T.muted }}>kcal</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            {[
              { l: t("macro.proteina"), v: a.proteinG,       c: T.prot },
              { l: t("macro.carbos"),   v: a.carbohydratesG, c: T.carb },
              { l: t("macro.grasa"),    v: a.fatG,            c: T.fat  },
            ].map(m => (
              <div key={m.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: m.c, lineHeight: 1 }}>
                  {fmt(m.v)}<span style={{ fontSize: 12, fontWeight: 400, color: T.muted }}>g</span>
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </Tarjeta>

        {(a.fiberG || a.sugarG || a.sodiumMg) && (
          <Tarjeta sx={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{t("resultado.info_extra")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {a.fiberG   != null && <div style={{ background: T.s3, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}><span style={{ color: T.muted }}>{t("resultado.fibra")} </span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(a.fiberG)}g</span></div>}
              {a.sugarG   != null && <div style={{ background: T.s3, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}><span style={{ color: T.muted }}>{t("resultado.azucar")} </span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(a.sugarG)}g</span></div>}
              {a.sodiumMg != null && <div style={{ background: T.s3, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}><span style={{ color: T.muted }}>{t("resultado.sodio")} </span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(a.sodiumMg)}mg</span></div>}
            </div>
          </Tarjeta>
        )}

        {/* Alimentos detectados — editables */}
        {alimentos.length > 0 && (
          <Tarjeta sx={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8 }}>
                {t("resultado.detectados")}
              </div>
              <div style={{ fontSize: 11, color: T.dim }}>{t("resultado.pulsa_edit")}</div>
            </div>

            {alimentos.map((f, i) => (
              <div key={i} style={{
                borderBottom: i < alimentos.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                {editandoIdx === i ? (
                  <div style={{ padding: "10px 0 12px" }}>
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginBottom: 4 }}>{t("resultado.edit_nombre")}</div>
                    <input
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      placeholder={f.name}
                      style={{ ...inputStyle, marginBottom: 8 }}
                      onFocus={e => { e.target.style.borderColor = T.accent; }}
                      onBlur={e => { e.target.style.borderColor = T.accentBdr; }}
                    />
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginBottom: 4 }}>{t("resultado.edit_cant")}</div>
                    <input
                      value={editCantidad}
                      onChange={e => setEditCantidad(e.target.value)}
                      placeholder={f.estimated_amount || t("resultado.cant_ph")}
                      style={{ ...inputStyle, marginBottom: 10 }}
                      onFocus={e => { e.target.style.borderColor = T.accent; }}
                      onBlur={e => { e.target.style.borderColor = T.accentBdr; }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={confirmarEdicion}
                        style={{ flex: 2, padding: "8px", background: T.accent, border: "none", borderRadius: 8, color: "#06080F", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        {t("resultado.confirmar")}
                      </button>
                      <button onClick={() => setEditandoIdx(null)}
                        style={{ flex: 1, padding: "8px", background: T.s3, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        {t("resultado.cancelar")}
                      </button>
                      <button onClick={() => eliminarAlimento(i)}
                        aria-label={t("resultado.elim_alim")}
                        style={{ padding: "8px 10px", background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, color: T.danger, cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{f.name}</span>
                      {f.estimated_amount && (
                        <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>{f.estimated_amount}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <BadgeConfianza nivel={f.confidence} />
                      <button onClick={() => abrirEditor(i)}
                        aria-label={t("resultado.edit_alim")}
                        style={{ background: T.s3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, cursor: "pointer", padding: "4px 7px", display: "flex", alignItems: "center" }}>
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Botón reanalizar — solo aparece cuando hay cambios */}
            {modificado && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                {errorRe && (
                  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: T.danger }}>
                    {errorRe}
                  </div>
                )}
                <Boton
                  onClick={reanalizar}
                  disabled={reanalizando || (!datosImagen?.b64 && !datosImagen?.notaOriginal)}
                  icono={reanalizando ? null : <Zap size={14} />}>
                  {reanalizando ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 13, height: 13, borderRadius: 99, border: "2px solid #06080F", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                      {t("resultado.reanalizando")}
                    </span>
                  ) : t("resultado.reanalizar")}
                </Boton>
              </div>
            )}
          </Tarjeta>
        )}

        {a.uncertaintyNotes?.length > 0 && (
          <div style={{ background: T.warnBg, border: `1px solid ${T.warn}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <AlertCircle size={14} color={T.warn} />
              <span style={{ fontSize: 11, color: T.warn, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{t("resultado.notas_inc")}</span>
            </div>
            {a.uncertaintyNotes.map((n, i) => (
              <div key={i} style={{ fontSize: 13, color: T.warn, opacity: .85, marginBottom: i < a.uncertaintyNotes.length - 1 ? 4 : 0 }}>{"•"} {n}</div>
            ))}
          </div>
        )}

        {a.accuracyTips?.length > 0 && (
          <Tarjeta sx={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Target size={14} color={T.accent} />
              <span style={{ fontSize: 11, color: T.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{t("resultado.consejos")}</span>
            </div>
            {a.accuracyTips.map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: T.muted, marginBottom: i < a.accuracyTips.length - 1 ? 4 : 0 }}>{"•"} {tip}</div>
            ))}
          </Tarjeta>
        )}

        {a.healthNotes?.length > 0 && (
          <Tarjeta sx={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <CheckCircle size={14} color={T.carb} />
              <span style={{ fontSize: 11, color: T.carb, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{t("resultado.notas_salud")}</span>
            </div>
            {a.healthNotes.map((n, i) => (
              <div key={i} style={{ fontSize: 13, color: T.muted, marginBottom: i < a.healthNotes.length - 1 ? 4 : 0 }}>{"•"} {n}</div>
            ))}
          </Tarjeta>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Boton onClick={onGuardar} sx={{ flex: 2 }} icono={<Plus size={15} />}>{t("resultado.guardar")}</Boton>
          <Boton onClick={onNuevaComida} variante="ghost" sx={{ flex: 1 }}>{t("resultado.nueva")}</Boton>
        </div>
      </div>
    </div>
  );
}
