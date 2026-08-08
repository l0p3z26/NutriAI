import { useState, useRef } from "react";
import {
  Trash2, AlertCircle, CheckCircle, Upload, Download,
} from "lucide-react";
import { T, fmt } from "../../theme.js";
import { useT, useIdioma } from "../../lib/i18n.jsx";
import { calcConsumido } from "../../lib/nutrition.js";
import { sg, ss, KEYS } from "../../lib/storage.js";
import Tarjeta from "../ui/Tarjeta.jsx";
import Barra from "../ui/Barra.jsx";
import BadgeConfianza from "../ui/BadgeConfianza.jsx";
import FeedbackSaciedad from "../ui/FeedbackSaciedad.jsx";

export default function PantallaRegistro({ comidas, objetivos, onEliminar, onFeedback }) {
  const t = useT();
  const { locale } = useIdioma();
  const con = calcConsumido(comidas);

  const [importError, setImportError] = useState(null);
  const [importOk, setImportOk]    = useState(false);
  const importRef = useRef(null);

  const exportar = () => {
    // Exportar perfil + objetivos + historial completo de comidas
    sg(KEYS.PERFIL).then(perfil => sg(KEYS.OBJETIVOS).then(objetivos => sg(KEYS.COMIDAS).then(todasComidas => {
      const datos = JSON.stringify({
        version: 1,
        exportadoEn: new Date().toISOString(),
        perfil, objetivos,
        comidas: todasComidas ?? [],
      }, null, 2);
      const blob = new Blob([datos], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `nutriai-${new Date().toISOString().split("T")[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
    })));
  };

  const importar = async (archivo) => {
    setImportError(null); setImportOk(false);
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto);
      if (!datos.perfil || !datos.objetivos)
        throw new Error(t("registro.err_perfil"));
      await ss(KEYS.PERFIL,   datos.perfil);
      await ss(KEYS.OBJETIVOS, datos.objetivos);
      await ss(KEYS.COMIDAS,  datos.comidas ?? []);
      setImportOk(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setImportError(e.message || t("registro.err_invalido"));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: T.text }}>{t("registro.titulo")}</h2>
          <div style={{ fontSize: 12, color: T.muted }}>
            {new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => importRef.current?.click()}
            style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <Upload size={13} />{t("registro.importar")}
          </button>
          <button onClick={exportar}
            style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <Download size={13} />{t("registro.exportar")}
          </button>
        </div>
        {/* Input oculto para importar */}
        <input ref={importRef} type="file" accept=".json" style={{ display: "none" }}
          onChange={e => { importar(e.target.files[0]); e.target.value = ""; }} />
      </div>

      <div style={{ padding: "14px 14px 0" }}>
        {importOk && (
          <div style={{ background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8 }}>
            <CheckCircle size={15} color={T.accent} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: T.accent }}>{t("registro.importado")}</div>
          </div>
        )}
        {importError && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8 }}>
            <AlertCircle size={15} color={T.danger} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: T.danger }}>{importError}</div>
          </div>
        )}
        <Tarjeta sx={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 12 }}>{t("registro.totales")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { l: t("registro.calorias"), con: con.caloriesKcal,   tgt: objetivos.caloriesKcal,   c: T.accent, u: "kcal" },
              { l: t("macro.proteina"),    con: con.proteinG,        tgt: objetivos.proteinG,        c: T.prot,   u: "g" },
              { l: t("macro.carbos"),      con: con.carbohydratesG,  tgt: objetivos.carbohydratesG,  c: T.carb,   u: "g" },
              { l: t("macro.grasa"),       con: con.fatG,            tgt: objetivos.fatG,            c: T.fat,    u: "g" },
            ].map(m => (
              <div key={m.l}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{m.l}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: m.c }}>
                  {fmt(m.con)}<span style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>{m.u}</span>
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>{fmt(m.tgt)}{m.u} {t("registro.objetivo_suf")}</div>
                <Barra v={m.con} m={m.tgt} color={m.c} />
              </div>
            ))}
          </div>
        </Tarjeta>

        <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
          {t("registro.comidas_n", { n: comidas.length })}
        </div>

        {comidas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 20px", color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14 }}>{t("registro.sin_comidas")}</div>
          </div>
        ) : (
          comidas.map(m => (
            <Tarjeta key={m.id} sx={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{m.mealName}</span>
                    <BadgeConfianza nivel={m.confidence} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 6 }}>
                    {[
                      { l: "kcal",         v: fmt(m.caloriesKcal),    c: T.accent },
                      { l: t("abbr.prot"), v: fmt(m.proteinG),         c: T.prot  },
                      { l: t("abbr.carb"), v: fmt(m.carbohydratesG),   c: T.carb  },
                      { l: t("abbr.fat"),  v: fmt(m.fatG),             c: T.fat   },
                    ].map(x => (
                      <div key={x.l} style={{ background: T.s3, borderRadius: 7, padding: "5px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  {m.userNote && <div style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>"{m.userNote}"</div>}
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => onEliminar(m.id)}
                  aria-label={t("registro.elim_comida")}
                  style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: "4px", marginLeft: 8 }}>
                  <Trash2 size={14} />
                </button>
              </div>
              {onFeedback && <FeedbackSaciedad valor={m.satiety} onSeleccionar={v => onFeedback(m.id, v)} />}
            </Tarjeta>
          ))
        )}
      </div>
    </div>
  );
}
