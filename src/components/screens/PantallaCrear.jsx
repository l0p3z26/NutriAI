import { useState, useRef } from "react";
import { ChevronLeft, AlertCircle, ChefHat, Camera, Upload, X, Plus } from "lucide-react";
import { T, fmt } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { crearComidaIA, analizarDespensaIA } from "../../lib/ai.js";
import { comprimirImagen } from "../../lib/image.js";
import { useAtras } from "../../lib/back.jsx";
import Boton from "../ui/Boton.jsx";
import Tarjeta from "../ui/Tarjeta.jsx";
import Selector from "../ui/Selector.jsx";
import BadgeConfianza from "../ui/BadgeConfianza.jsx";

// `id` es el valor estable (en español) que se guarda en las exclusiones y se
// envía a la IA; `k` es la clave i18n solo para mostrar la etiqueta traducida.
const CATEGORIAS_INGREDIENTES = [
  { id: "Lácteos",       k: "crear.ing.lacteos",      ocultarEn: ["vegan"] },
  { id: "Marisco",       k: "crear.ing.marisco",      ocultarEn: ["vegan", "vegetarian"] },
  { id: "Cerdo",         k: "crear.ing.cerdo",        ocultarEn: ["vegan", "vegetarian"] },
  { id: "Ternera",       k: "crear.ing.ternera",      ocultarEn: ["vegan", "vegetarian"] },
  { id: "Pollo",         k: "crear.ing.pollo",        ocultarEn: ["vegan", "vegetarian"] },
  { id: "Pescado",       k: "crear.ing.pescado",      ocultarEn: ["vegan", "vegetarian"] },
  { id: "Huevo",         k: "crear.ing.huevo",        ocultarEn: ["vegan"] },
  { id: "Gluten",        k: "crear.ing.gluten" },
  { id: "Picante",       k: "crear.ing.picante" },
  { id: "Frutos secos",  k: "crear.ing.frutos_secos" },
  { id: "Legumbres",     k: "crear.ing.legumbres" },
  { id: "Setas",         k: "crear.ing.setas" },
];

// Sugiere el tipo de comida por defecto según la hora del día.
function tipoComidaPorHora() {
  const h = new Date().getHours();
  return h < 12 ? "desayuno" : h < 19 ? "comida" : "cena";
}

// Control segmentado (mismo estilo que el selector de modo de Analizar).
function Segmentado({ etiqueta, valor, onCambio, opciones }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 8 }}>{etiqueta}</div>
      <div style={{ display: "flex", gap: 6, background: T.s2, borderRadius: 12, padding: 4 }}>
        {opciones.map(o => (
          <button key={o.id} onClick={() => onCambio(o.id)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
              background: valor === o.id ? T.accent : "transparent",
              color: valor === o.id ? "#06080F" : T.muted,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", transition: "all .2s",
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Cabecera({ titulo, sub, onVolver, t }) {
  return (
    <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
      <button onClick={onVolver} aria-label={t("comun.volver")} style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
        <ChevronLeft size={18} />
      </button>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titulo}</h2>
        {sub && <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function PantallaCrear({ perfil, onVolver, onGuardarComida }) {
  const t = useT();
  const [modo, setModo] = useState("pref");      // "pref" | "despensa"
  const [vista, setVista] = useState("form");    // "form" | "opciones" | "detalle"
  const [tipoComida, setTipoComida] = useState(tipoComidaPorHora());
  const [intensidad, setIntensidad] = useState("ligera");
  const [dietType, setDietType] = useState(perfil?.dietPreference || "none");
  const [exclusiones, setExclusiones] = useState([]);
  const [itemsDespensa, setItemsDespensa] = useState("");
  const [prevDespensa, setPrevDespensa] = useState(null);
  const [b64Despensa, setB64Despensa] = useState(null);
  const [mimeDespensa, setMimeDespensa] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const galeriaRef = useRef(null);
  const camaraRef = useRef(null);

  // Atrás de Android: cierra sub-vistas antes de salir al dashboard.
  useAtras(() => {
    if (vista === "detalle") { setSeleccionada(null); setVista("opciones"); return true; }
    if (vista === "opciones") { setVista("form"); return true; }
    return false;
  });

  const OPCIONES_DIETA = [
    { v: "none",         l: t("dieta.none_crear") },
    { v: "high_protein", l: t("dieta.high_protein") },
    { v: "low_carb",     l: t("dieta.low_carb") },
    { v: "vegetarian",   l: t("dieta.vegetarian") },
    { v: "vegan",        l: t("dieta.vegan") },
    { v: "other",        l: t("dieta.other") },
  ];
  const TIPOS_COMIDA = [
    { id: "desayuno", label: t("crear.desayuno") },
    { id: "comida",   label: t("crear.comida") },
    { id: "cena",     label: t("crear.cena") },
  ];
  const INTENSIDADES = [
    { id: "ligera", label: t("crear.ligera") },
    { id: "pesada", label: t("crear.pesada") },
  ];

  const categoriasVisibles = CATEGORIAS_INGREDIENTES.filter(c => !c.ocultarEn?.includes(dietType));
  const cambiarDieta = (v) => { setDietType(v); setExclusiones([]); };
  const toggleExclusion = (id) =>
    setExclusiones(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const manejarFotoDespensa = async (f) => {
    if (!f) return;
    setError(null);
    try {
      const { dataUrl, base64, mime } = await comprimirImagen(f);
      setPrevDespensa(dataUrl); setB64Despensa(base64); setMimeDespensa(mime);
    } catch (e) {
      setError(e?.message || t("analizar.err_imagen"));
    }
  };

  const generar = async () => {
    setError(null);
    if (modo === "despensa" && !itemsDespensa.trim() && !b64Despensa) {
      setError(t("crear.despensa_vacia")); return;
    }
    setCargando(true);
    try {
      const ideas = modo === "despensa"
        ? await analizarDespensaIA(itemsDespensa, b64Despensa, mimeDespensa, perfil)
        : await crearComidaIA({ dietType, exclusiones, tipoComida, intensidad, entrenamiento: perfil?.trainingType });
      if (!ideas || ideas.length === 0) { setError(t("crear.err")); return; }
      setOpciones(ideas);
      setSeleccionada(null);
      setVista("opciones");
    } catch (e) {
      setError(e?.message || t("crear.err"));
    } finally {
      setCargando(false);
    }
  };

  const abrirDetalle = (idea) => { setSeleccionada(idea); setVista("detalle"); };
  const guardar = () => { if (seleccionada) onGuardarComida({ ...seleccionada, createdAt: new Date().toISOString() }); };

  // ── Vista 3: DETALLE de la receta seleccionada ──
  if (vista === "detalle" && seleccionada) {
    const a = seleccionada;
    return (
      <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 100, overflowY: "auto" }}>
        <Cabecera titulo={a.mealName} onVolver={() => { setSeleccionada(null); setVista("opciones"); }} t={t} />
        <div style={{ marginTop: 8, padding: "0 16px" }}><BadgeConfianza nivel={a.confidence} /></div>

        <div style={{ padding: "12px 14px 0" }}>
          {a.summary && <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>{a.summary}</p>}

          {/* Macros */}
          <Tarjeta sx={{ marginBottom: 14, background: `linear-gradient(135deg, ${T.accentBg} 0%, ${T.surf} 100%)`, border: `1px solid ${T.accentBdr}` }}>
            <div style={{ textAlign: "center", padding: "6px 0 12px" }}>
              <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{t("resultado.total_cal")}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 52, fontWeight: 800, color: T.accent, lineHeight: 1 }}>{fmt(a.caloriesKcal)}</div>
              <div style={{ fontSize: 14, color: T.muted }}>kcal</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              {[
                { l: t("macro.proteina"), v: a.proteinG,       c: T.prot },
                { l: t("macro.carbos"),   v: a.carbohydratesG, c: T.carb },
                { l: t("macro.grasa"),    v: a.fatG,           c: T.fat  },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: m.c, lineHeight: 1 }}>
                    {fmt(m.v)}<span style={{ fontSize: 12, fontWeight: 400, color: T.muted }}>g</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </Tarjeta>

          {/* Ingredientes */}
          {a.ingredients?.length > 0 && (
            <Tarjeta sx={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{t("crear.ingredientes")}</div>
              {a.ingredients.map((ing, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  padding: "8px 0", borderBottom: i < a.ingredients.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <span style={{ fontSize: 14, color: T.text }}>{ing.name}</span>
                  {ing.amount && <span style={{ fontSize: 13, color: T.accent, fontWeight: 600, flexShrink: 0 }}>{ing.amount}</span>}
                </div>
              ))}
            </Tarjeta>
          )}

          {/* Paso a paso */}
          {a.steps?.length > 0 && (
            <Tarjeta sx={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 12 }}>{t("crear.pasos")}</div>
              {a.steps.map((paso, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < a.steps.length - 1 ? 12 : 0, alignItems: "flex-start" }}>
                  <div style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: 99,
                    background: T.accentBg, border: `1px solid ${T.accentBdr}`, color: T.accent,
                    fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</div>
                  <div style={{ fontSize: 14, color: T.text, lineHeight: 1.55, paddingTop: 2 }}>{paso}</div>
                </div>
              ))}
            </Tarjeta>
          )}

          {a.healthNotes?.length > 0 && (
            <Tarjeta sx={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.carb, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>{t("resultado.notas_salud")}</div>
              {a.healthNotes.map((n, i) => (
                <div key={i} style={{ fontSize: 13, color: T.muted, marginBottom: i < a.healthNotes.length - 1 ? 4 : 0 }}>{"•"} {n}</div>
              ))}
            </Tarjeta>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <Boton onClick={guardar} sx={{ flex: 2 }} icono={<Plus size={15} />}>{t("crear.guardar_comida")}</Boton>
            <Boton onClick={() => { setSeleccionada(null); setVista("opciones"); }} variante="ghost" sx={{ flex: 1 }}>{t("crear.volver_ideas")}</Boton>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista 2: OPCIONES (varias ideas) ──
  if (vista === "opciones") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 100 }}>
        <Cabecera titulo={t("crear.opciones_titulo")} sub={t("crear.opciones_sub")} onVolver={() => setVista("form")} t={t} />
        <div style={{ padding: 16 }}>
          {opciones.map((s) => (
            <div key={s.id}
              style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{s.mealName}</div>
                <BadgeConfianza nivel={s.confidence} />
              </div>
              {s.summary && <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{s.summary}</p>}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ background: T.accentBg, borderRadius: 7, padding: "4px 10px", fontSize: 12, color: T.accent, fontWeight: 700 }}>
                  {fmt(s.caloriesKcal)} kcal
                </div>
                <div style={{ background: T.s3, borderRadius: 7, padding: "4px 10px", fontSize: 12, color: T.muted }}>
                  {t("abbr.prot")} {fmt(s.proteinG)}g · {t("abbr.carb")} {fmt(s.carbohydratesG)}g · {t("abbr.fat")} {fmt(s.fatG)}g
                </div>
              </div>
              <Boton onClick={() => abrirDetalle(s)}>{t("crear.seleccionar")}</Boton>
            </div>
          ))}

          <Boton variante="ghost" onClick={generar} disabled={cargando} icono={cargando ? null : <ChefHat size={15} />}>
            {cargando ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid currentColor", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                {t("crear.generando")}
              </span>
            ) : t("crear.mas_ideas")}
          </Boton>
          {error && (
            <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", gap: 8 }}>
              <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: T.danger }}>{error}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista 1: FORMULARIO ──
  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 100 }}>
      <Cabecera titulo={t("crear.titulo")} sub={t("crear.sub")} onVolver={onVolver} t={t} />

      <div style={{ padding: 16 }}>
        {/* Selector de modo: Preferencias | Despensa */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: T.s2, borderRadius: 12, padding: 4 }}>
          {[
            { id: "pref",     label: t("crear.modo_pref") },
            { id: "despensa", label: t("crear.modo_despensa") },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => { setModo(id); setError(null); }}
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

        {modo === "pref" ? (
          <>
            <Segmentado etiqueta={t("crear.tipo_comida")} valor={tipoComida} onCambio={setTipoComida} opciones={TIPOS_COMIDA} />
            <Segmentado etiqueta={t("crear.ligera_pesada")} valor={intensidad} onCambio={setIntensidad} opciones={INTENSIDADES} />
            <Selector etiqueta={t("crear.tipo_dieta")} v={dietType} set={cambiarDieta} opciones={OPCIONES_DIETA} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 8 }}>{t("crear.evitar")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {categoriasVisibles.map(c => {
                  const activo = exclusiones.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleExclusion(c.id)}
                      style={{
                        padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600,
                        border: `1px solid ${activo ? T.danger : T.border}`,
                        background: activo ? T.dangerBg : T.s2,
                        color: activo ? T.danger : T.muted,
                        cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                      }}>
                      {activo ? "✕ " : ""}{t(c.k)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 6 }}>{t("analizar.despensa_label")}</div>
            <textarea
              value={itemsDespensa}
              onChange={e => setItemsDespensa(e.target.value)}
              placeholder={t("analizar.despensa_ph")}
              rows={4}
              style={{ width: "100%", padding: "11px 13px", background: T.s2, border: `1px solid ${T.accentBdr}`, borderRadius: 10, color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", transition: "border .2s", lineHeight: 1.6, marginBottom: 12 }}
              onFocus={e => { e.target.style.borderColor = T.accent; }}
              onBlur={e => { e.target.style.borderColor = T.accentBdr; }}
            />
            <div style={{ fontSize: 11, color: T.dim, marginBottom: 14 }}>{t("analizar.despensa_ej")}</div>

            {!prevDespensa ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => camaraRef.current?.click()}
                  style={{ flex: 1, background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.accent, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600 }}>
                  <Camera size={15} />{t("analizar.camara")}
                </button>
                <button onClick={() => galeriaRef.current?.click()}
                  style={{ flex: 1, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600 }}>
                  <Upload size={15} />{t("analizar.galeria")}
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <img src={prevDespensa} alt={t("analizar.alt_despensa")} style={{ width: "100%", borderRadius: 16, maxHeight: 220, objectFit: "cover", display: "block" }} />
                <button onClick={() => { setPrevDespensa(null); setB64Despensa(null); setMimeDespensa(null); }}
                  aria-label={t("analizar.quitar_foto")}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.75)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "5px 8px", display: "flex", alignItems: "center" }}>
                  <X size={14} />
                </button>
              </div>
            )}
            <input ref={galeriaRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => manejarFotoDespensa(e.target.files[0])} />
            <input ref={camaraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => manejarFotoDespensa(e.target.files[0])} />
          </div>
        )}

        <Boton onClick={generar} disabled={cargando} icono={cargando ? null : <ChefHat size={15} />}>
          {cargando ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid #06080F", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
              {t("crear.generando")}
            </span>
          ) : t("crear.generar")}
        </Boton>

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", gap: 8 }}>
            <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.danger }}>{error}</div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: T.dim, marginTop: 10 }}>{t("crear.footer")}</p>
      </div>
    </div>
  );
}
