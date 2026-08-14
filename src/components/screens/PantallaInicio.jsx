import {
  Camera, Trash2, AlertCircle, Info, RotateCcw, MessageCircle, Menu,
} from "lucide-react";
import { T, pct, fmt } from "../../theme.js";
import { calcConsumido } from "../../lib/nutrition.js";
import { useT, useIdioma } from "../../lib/i18n.jsx";
import { emojiTipo } from "../../lib/comidasFijas.js";
import Boton from "../ui/Boton.jsx";
import Tarjeta from "../ui/Tarjeta.jsx";
import Barra from "../ui/Barra.jsx";
import ChipMacro from "../ui/ChipMacro.jsx";
import BadgeConfianza from "../ui/BadgeConfianza.jsx";
import FeedbackSaciedad from "../ui/FeedbackSaciedad.jsx";

export default function PantallaInicio({ perfil, objetivos, comidas, onAnalizar, onEliminarComida, onReiniciarDia, onNotificaciones, onMenu, coachNoLeido, onFeedback }) {
  const t = useT();
  const { locale } = useIdioma();
  const con = calcConsumido(comidas);
  const calPct = pct(con.caloriesKcal, objetivos.caloriesKcal);
  const restante = objetivos.caloriesKcal - con.caloriesKcal;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 80 }}>
      <div style={{
        padding: "20px 20px 16px",
        background: `linear-gradient(180deg, ${T.s2} 0%, ${T.bg} 100%)`,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, marginBottom: 2 }}>
              {new Date().toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: T.text }}>{t("inicio.titulo")}</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onNotificaciones && (
              <button onClick={onNotificaciones} aria-label={t("buzon.titulo")}
                style={{ position: "relative", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 99, color: T.text, cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center" }}>
                <MessageCircle size={16} />
                {coachNoLeido && (
                  <span style={{ position: "absolute", top: 5, right: 6, width: 9, height: 9, borderRadius: 99, background: T.danger, border: `2px solid ${T.s2}` }} />
                )}
              </button>
            )}
            {onMenu && (
              <button onClick={onMenu} aria-label={t("menu.titulo")}
                style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 99, color: T.muted, cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center" }}>
                <Menu size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 14px 0" }}>
        <Tarjeta sx={{ marginBottom: 10, background: `linear-gradient(135deg, ${T.s2} 0%, ${T.surf} 100%)` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, marginBottom: 2 }}>{t("inicio.calorias_hoy")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 46, fontWeight: 800, color: T.accent, lineHeight: 1 }}>{fmt(con.caloriesKcal)}</span>
                <span style={{ fontSize: 14, color: T.muted }}>/ {fmt(objetivos.caloriesKcal)} kcal</span>
              </div>
            </div>
            <div style={{ textAlign: "right", paddingBottom: 4 }}>
              <div style={{ fontSize: 11, color: T.muted }}>{t("inicio.restante")}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 700, color: restante >= 0 ? T.text : T.danger }}>
                {restante >= 0 ? fmt(restante) : `+${fmt(Math.abs(restante))}`}
              </div>
            </div>
          </div>
          <Barra v={con.caloriesKcal} m={objetivos.caloriesKcal} color={calPct > 100 ? T.danger : T.accent} h={8} />
        </Tarjeta>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <ChipMacro etiqueta={t("macro.proteina")} consumido={con.proteinG}       objetivo={objetivos.proteinG}       color={T.prot} bg={T.protBg} />
          <ChipMacro etiqueta={t("macro.carbos")}   consumido={con.carbohydratesG}  objetivo={objetivos.carbohydratesG} color={T.carb} bg={T.carbBg} />
          <ChipMacro etiqueta={t("macro.grasa")}    consumido={con.fatG}            objetivo={objetivos.fatG}           color={T.fat}  bg={T.fatBg}  />
        </div>

        {objetivos.lowWarn && (
          <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", gap: 8 }}>
            <AlertCircle size={16} color={T.warn} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.warn }}>{t("inicio.low_warn")}</div>
          </div>
        )}

        <Boton onClick={onAnalizar} sx={{ marginBottom: 12 }} icono={<Camera size={15} />}>
          {t("inicio.analizar")}
        </Boton>

        <div style={{ background: T.s2, borderRadius: 10, padding: "9px 12px", marginBottom: 14, display: "flex", gap: 8 }}>
          <Info size={14} color={T.muted} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            {t("inicio.info")}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8 }}>
            {t("inicio.comidas_hoy")}
          </div>
          {comidas.length > 0 && (
            <button onClick={onReiniciarDia}
              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <RotateCcw size={11} />{t("inicio.reiniciar")}
            </button>
          )}
        </div>

        {comidas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 20px", color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
            <div style={{ fontSize: 14 }}>{t("inicio.sin_comidas")}</div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>{t("inicio.empezar")}</div>
          </div>
        ) : (
          comidas.map(m => (
            <Tarjeta key={m.id} sx={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    {m.mealType && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 6, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {emojiTipo(m.mealType)} {t(`comida.tipo.${m.mealType}`)}
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{m.mealName}</span>
                    <BadgeConfianza nivel={m.confidence} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: T.muted, flexWrap: "wrap" }}>
                    <span style={{ color: T.accent, fontWeight: 600 }}>{fmt(m.caloriesKcal)} kcal</span>
                    <span>{t("abbr.prot")}: {fmt(m.proteinG)}g</span>
                    <span>{t("abbr.carb")}: {fmt(m.carbohydratesG)}g</span>
                    <span>{t("abbr.fat")}: {fmt(m.fatG)}g</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => onEliminarComida(m.id)}
                  aria-label={t("inicio.eliminar")}
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
