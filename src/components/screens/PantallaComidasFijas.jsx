import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Check, Trash2, Pencil, Plus, Camera, Upload, X, Zap, Sparkles } from "lucide-react";
import { T } from "../../theme.js";
import { useT, traducir } from "../../lib/i18n.jsx";
import { useAtras } from "../../lib/back.jsx";
import { analizarIA } from "../../lib/ai.js";
import { traducirError } from "../../lib/apiKey.js";
import { comprimirImagen } from "../../lib/image.js";
import { FRANJAS_FRECUENTES, fmtFranja, getComidasFijas, setComidaFija, borrarComidaFija } from "../../lib/comidasFijas.js";

// Gestión de "comidas frecuentes" por franja. El usuario define, p. ej., su
// desayuno habitual una vez (a mano o CON IA: foto/texto) y la app lo añade solo
// cada día dentro de su franja horaria (a la hora de inicio), sin volver a gastar IA.
export default function PantallaComidasFijas({ onVolver }) {
  const t = useT();
  const [fijas, setFijas] = useState({});
  const [editando, setEditando] = useState(null);   // id de tipo en edición
  const [form, setForm] = useState({ mealName: "", caloriesKcal: "", proteinG: "", carbohydratesG: "", fatG: "" });

  // Análisis por IA (para rellenar el formulario a partir de foto/texto).
  const [aiDesc, setAiDesc] = useState("");
  const [aiPrev, setAiPrev] = useState(null);
  const [aiB64, setAiB64] = useState(null);
  const [aiMime, setAiMime] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [errorIA, setErrorIA] = useState(null);
  const galeriaRef = useRef(null);
  const camaraRef = useRef(null);

  useAtras(() => { if (editando) { cerrarEditor(); return true; } onVolver(); return true; });

  useEffect(() => { getComidasFijas().then(setFijas); }, []);

  const resetAI = () => { setAiDesc(""); setAiPrev(null); setAiB64(null); setAiMime(null); setErrorIA(null); setAnalizando(false); };
  const cerrarEditor = () => { setEditando(null); resetAI(); };

  const abrirEditor = (tipo) => {
    resetAI();
    const f = fijas[tipo];
    setForm(f
      ? { mealName: f.mealName || "", caloriesKcal: String(f.caloriesKcal ?? ""), proteinG: String(f.proteinG ?? ""), carbohydratesG: String(f.carbohydratesG ?? ""), fatG: String(f.fatG ?? "") }
      : { mealName: "", caloriesKcal: "", proteinG: "", carbohydratesG: "", fatG: "" });
    setEditando(tipo);
  };

  const manejarFoto = async (file) => {
    if (!file) return;
    setErrorIA(null);
    try {
      const { dataUrl, base64, mime } = await comprimirImagen(file);
      setAiPrev(dataUrl); setAiB64(base64); setAiMime(mime);
    } catch (e) { setErrorIA(e?.message || traducir("fijas.ia_err")); }
  };

  const puedeAnalizar = !!aiB64 || aiDesc.trim().length > 0;
  const analizarConIA = async () => {
    if (!puedeAnalizar || analizando) return;
    setAnalizando(true); setErrorIA(null);
    try {
      const res = await analizarIA(aiB64, aiMime, aiDesc.trim(), null);
      setForm({
        mealName: res.mealName || aiDesc.trim().slice(0, 60),
        caloriesKcal: String(Math.round(res.caloriesKcal || 0)),
        proteinG: String(Math.round(res.proteinG || 0)),
        carbohydratesG: String(Math.round(res.carbohydratesG || 0)),
        fatG: String(Math.round(res.fatG || 0)),
      });
    } catch (e) { setErrorIA(traducirError(e)); }
    finally { setAnalizando(false); }
  };

  const num = (v) => v.replace(/[^\d]/g, "");
  const valido = form.mealName.trim() && form.caloriesKcal !== "";

  const guardar = async () => {
    if (!valido) return;
    const plantilla = {
      mealName: form.mealName.trim(),
      caloriesKcal: Number(form.caloriesKcal) || 0,
      proteinG: Number(form.proteinG) || 0,
      carbohydratesG: Number(form.carbohydratesG) || 0,
      fatG: Number(form.fatG) || 0,
    };
    await setComidaFija(editando, plantilla);
    setFijas(await getComidasFijas());
    cerrarEditor();
  };

  const quitar = async (tipo) => {
    if (!window.confirm(traducir("fijas.borrar_confirm"))) return;
    await borrarComidaFija(tipo);
    setFijas(await getComidasFijas());
  };

  const campo = (clave, etiqueta, ancho) => (
    <div style={{ flex: ancho || 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{etiqueta}</div>
      <input type="text" inputMode="numeric" value={form[clave]}
        onChange={(e) => setForm((f) => ({ ...f, [clave]: num(e.target.value) }))}
        style={{ width: "100%", padding: "10px 12px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 15, fontWeight: 700, outline: "none", fontFamily: "'Sora',sans-serif", textAlign: "center" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 4px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onVolver} aria-label={traducir("comun.volver")}
          style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>{t("fijas.titulo")}</h2>
      </div>
      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, padding: "6px 20px 12px" }}>{t("fijas.sub")}</p>

      <div style={{ flex: 1, padding: "6px 16px 32px", overflowY: "auto" }}>
        {FRANJAS_FRECUENTES.map((slot) => {
          const { id, emoji } = slot;
          const f = fijas[id];
          const enEdicion = editando === id;
          return (
            <div key={id} style={{ background: T.surf, border: `1px solid ${enEdicion ? T.accentBdr : T.border}`, borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 22 }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {t(`frec.slot.${id}`)}
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 6px" }}>{fmtFranja(slot)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: f ? T.accent : T.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f ? `${f.mealName} · ${f.caloriesKcal} kcal` : t("fijas.sin_config")}
                  </div>
                </div>
                {f && !enEdicion && (
                  <button onClick={() => quitar(id)} aria-label={t("fijas.quitar")}
                    style={{ flexShrink: 0, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9, background: T.dangerBg, border: `1px solid ${T.danger}33`, color: T.danger, cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                )}
                {!enEdicion && (
                  <button onClick={() => abrirEditor(id)}
                    style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, background: T.s2, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                    {f ? <Pencil size={14} /> : <Plus size={14} />}{f ? t("fijas.editar") : t("fijas.configurar")}
                  </button>
                )}
              </div>

              {enEdicion && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.border}` }}>
                  {/* Analizar con IA (foto/texto) → rellena el formulario de abajo */}
                  <div style={{ marginTop: 12, background: T.s2, border: `1px dashed ${T.accentBdr}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Sparkles size={14} /> {t("fijas.ia_titulo")}
                    </div>
                    {aiPrev && (
                      <div style={{ position: "relative", marginBottom: 8 }}>
                        <img src={aiPrev} alt="" style={{ width: "100%", borderRadius: 10, maxHeight: 160, objectFit: "cover", display: "block" }} />
                        <button onClick={() => { setAiPrev(null); setAiB64(null); setAiMime(null); }}
                          style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.7)", border: "none", borderRadius: 8, color: "#fff", padding: "4px 6px", cursor: "pointer", display: "flex" }}>
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    <textarea value={aiDesc} onChange={(e) => setAiDesc(e.target.value)} rows={2} placeholder={t("fijas.ia_ph")}
                      style={{ width: "100%", padding: "10px 12px", background: T.surf, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13.5, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => camaraRef.current?.click()}
                        style={{ boxSizing: "border-box", flex: 1, minWidth: 0, height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: T.surf, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "0 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        <Camera size={14} /> {t("analizar.camara")}
                      </button>
                      <button onClick={() => galeriaRef.current?.click()}
                        style={{ boxSizing: "border-box", flex: 1, minWidth: 0, height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: T.surf, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "0 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        <Upload size={14} /> {t("analizar.galeria")}
                      </button>
                    </div>
                    <button onClick={analizarConIA} disabled={!puedeAnalizar || analizando}
                      style={{ boxSizing: "border-box", width: "100%", height: 42, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: puedeAnalizar && !analizando ? T.accent : T.s3, color: puedeAnalizar && !analizando ? "#06080F" : T.muted, border: "none", borderRadius: 9, padding: "0 12px", fontSize: 14, fontWeight: 700, cursor: puedeAnalizar && !analizando ? "pointer" : "default", fontFamily: "inherit" }}>
                      {analizando
                        ? <span style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid #06080F", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                        : <Zap size={14} />}
                      {analizando ? t("fijas.ia_analizando") : t("fijas.ia_analizar")}
                    </button>
                    {errorIA && (
                      <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 9, padding: "8px 10px", marginTop: 8, fontSize: 12, color: T.danger, lineHeight: 1.45 }}>{errorIA}</div>
                    )}
                    <input ref={galeriaRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => manejarFoto(e.target.files[0])} />
                    <input ref={camaraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => manejarFoto(e.target.files[0])} />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{t("fijas.nombre")}</div>
                    <input type="text" value={form.mealName} placeholder={t("fijas.nombre_ph")}
                      onChange={(e) => setForm((f) => ({ ...f, mealName: e.target.value }))}
                      style={{ width: "100%", padding: "11px 13px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {campo("caloriesKcal", t("fijas.kcal"))}
                    {campo("proteinG", "P (g)")}
                    {campo("carbohydratesG", "C (g)")}
                    {campo("fatG", "G (g)")}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={guardar} disabled={!valido}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: valido ? T.accent : T.s3, color: valido ? "#06080F" : T.muted, border: "none", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700, cursor: valido ? "pointer" : "default", fontFamily: "inherit" }}>
                      <Check size={16} /> {t("fijas.guardar")}
                    </button>
                    <button onClick={cerrarEditor}
                      style={{ background: T.s2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {t("fijas.cancelar")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
