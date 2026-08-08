import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";
import { edadDesdeFecha } from "../../lib/nutrition.js";
import Boton from "../ui/Boton.jsx";
import Campo from "../ui/Campo.jsx";
import Selector from "../ui/Selector.jsx";

const PERFIL_VACIO = {
  birthDate: "", age: "", sex: "male", heightCm: "", weightKg: "",
  activityLevel: "moderate",
  exerciseDaysPerWeek: "3", exerciseMinutesPerDay: "45",
  trainingType: "none",
  goal: "maintain", targetSpeed: "normal",
  dietPreference: "none", allergies: "",
};

export default function PantallaPerfil({ existente, onGuardar, onVolver }) {
  const t = useT();
  const [paso, setPaso] = useState(0);
  const [p, setP] = useState({ ...PERFIL_VACIO, ...(existente ?? {}) });
  const set = k => v => setP(prev => ({ ...prev, [k]: v }));
  const hoyISO = new Date().toISOString().slice(0, 10);
  const edadActual = edadDesdeFecha(p.birthDate);

  const pasos = [
    {
      titulo: t("perfil.p1.titulo"),
      desc: t("perfil.p1.desc"),
      valido: () => p.birthDate && p.heightCm && p.weightKg &&
        edadActual != null && edadActual >= 10 && edadActual <= 100 &&
        Number(p.heightCm) > 0 && Number(p.weightKg) > 0,
      contenido: (
        <>
          <Campo etiqueta={t("perfil.fecha_nac")} v={p.birthDate} set={set("birthDate")} tipo="date" max={hoyISO} pista={t("perfil.fecha_nac_nota")} />
          {p.birthDate && edadActual != null && (edadActual < 10 || edadActual > 100) && (
            <div style={{ fontSize: 12, color: T.danger, margin: "-8px 0 12px" }}>{t("perfil.edad_rango")}</div>
          )}
          <Selector etiqueta={t("perfil.sexo")} v={p.sex} set={set("sex")} opciones={[
            { v: "male", l: t("sexo.male") }, { v: "female", l: t("sexo.female") },
          ]} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Campo etiqueta={t("perfil.altura")} v={p.heightCm} set={set("heightCm")} tipo="number" min="100" max="250" placeholder="cm" /></div>
            <div style={{ flex: 1 }}><Campo etiqueta={t("perfil.peso")} v={p.weightKg} set={set("weightKg")} tipo="number" min="30" max="300" placeholder="kg" /></div>
          </div>
        </>
      ),
    },
    {
      titulo: t("perfil.p2.titulo"),
      desc: t("perfil.p2.desc"),
      valido: () => true,
      contenido: (
        <>
          <Selector etiqueta={t("perfil.act_label")} v={p.activityLevel} set={set("activityLevel")} opciones={[
            { v: "sedentary",  l: t("perfil.act.sedentary") },
            { v: "light",      l: t("perfil.act.light") },
            { v: "moderate",   l: t("perfil.act.moderate") },
            { v: "high",       l: t("perfil.act.high") },
            { v: "very_high",  l: t("perfil.act.very_high") },
          ]} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Campo etiqueta={t("perfil.dias")} v={p.exerciseDaysPerWeek} set={set("exerciseDaysPerWeek")} tipo="number" min="0" max="7" placeholder={t("perfil.dias_ph")} /></div>
            <div style={{ flex: 1 }}><Campo etiqueta={t("perfil.min")} v={p.exerciseMinutesPerDay} set={set("exerciseMinutesPerDay")} tipo="number" min="0" max="300" placeholder={t("perfil.min_ph")} /></div>
          </div>
          <Selector etiqueta={t("perfil.entrenamiento")} v={p.trainingType} set={set("trainingType")} opciones={[
            { v: "none",        l: t("perfil.entren.none") },
            { v: "strength",    l: t("perfil.entren.strength") },
            { v: "hypertrophy", l: t("perfil.entren.hypertrophy") },
            { v: "cardio",      l: t("perfil.entren.cardio") },
            { v: "running",     l: t("perfil.entren.running") },
            { v: "swimming",    l: t("perfil.entren.swimming") },
            { v: "crossfit",    l: t("perfil.entren.crossfit") },
            { v: "sports",      l: t("perfil.entren.sports") },
            { v: "mixed",       l: t("perfil.entren.mixed") },
            { v: "other",       l: t("perfil.entren.other") },
          ]} />
        </>
      ),
    },
    {
      titulo: t("perfil.p3.titulo"),
      desc: t("perfil.p3.desc"),
      valido: () => true,
      contenido: (
        <>
          <Selector etiqueta={t("perfil.obj_label")} v={p.goal} set={set("goal")} opciones={[
            { v: "lose_fat",     l: t("perfil.obj.lose_fat") },
            { v: "maintain",     l: t("perfil.obj.maintain") },
            { v: "gain_muscle",  l: t("perfil.obj.gain_muscle") },
            { v: "gain_weight",  l: t("perfil.obj.gain_weight") },
            { v: "performance",  l: t("perfil.obj.performance") },
            { v: "custom",       l: t("perfil.obj.custom") },
          ]} />
          <Selector etiqueta={t("perfil.ritmo")} v={p.targetSpeed} set={set("targetSpeed")} opciones={[
            { v: "conservative", l: t("perfil.ritmo.conservative") },
            { v: "normal",       l: t("perfil.ritmo.normal") },
            { v: "aggressive",   l: t("perfil.ritmo.aggressive") },
          ]} />
          <div style={{ background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.muted }}>
            {t("perfil.info_cal")}
          </div>
        </>
      ),
    },
    {
      titulo: t("perfil.p4.titulo"),
      desc: t("perfil.p4.desc"),
      valido: () => true,
      contenido: (
        <>
          <Selector etiqueta={t("perfil.dieta_label")} v={p.dietPreference} set={set("dietPreference")} opciones={[
            { v: "none",         l: t("dieta.none") },
            { v: "high_protein", l: t("dieta.high_protein") },
            { v: "low_carb",     l: t("dieta.low_carb") },
            { v: "vegetarian",   l: t("dieta.vegetarian") },
            { v: "vegan",        l: t("dieta.vegan") },
            { v: "other",        l: t("dieta.other") },
          ]} />
          <Campo
            etiqueta={t("perfil.alergias")}
            v={p.allergies} set={set("allergies")}
            placeholder={t("perfil.alergias_ph")}
            pista={t("perfil.alergias_pista")}
          />
        </>
      ),
    },
  ];

  const actual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  const handleSiguiente = () => {
    if (!actual.valido()) return;
    if (esUltimo) {
      const num = k => Number(p[k]);
      onGuardar({
        birthDate: p.birthDate,
        age: edadDesdeFecha(p.birthDate), sex: p.sex,
        heightCm: num("heightCm"), weightKg: num("weightKg"),
        activityLevel: p.activityLevel,
        exerciseDaysPerWeek: num("exerciseDaysPerWeek"),
        exerciseMinutesPerDay: num("exerciseMinutesPerDay"),
        trainingType: p.trainingType,
        goal: p.goal, targetSpeed: p.targetSpeed,
        dietPreference: p.dietPreference !== "none" ? p.dietPreference : undefined,
        allergies: p.allergies || undefined,
      });
    } else {
      setPaso(s => s + 1);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={paso > 0 ? () => setPaso(s => s - 1) : onVolver}
          aria-label={t("comun.volver")}
          style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            {t("perfil.paso", { n: paso + 1, total: pasos.length })}
          </div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>{actual.titulo}</h2>
        </div>
      </div>
      <div style={{ padding: "12px 20px 4px", display: "flex", gap: 4 }}>
        {pasos.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= paso ? T.accent : T.dim, transition: "background .3s" }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: T.muted, padding: "6px 20px 0" }}>{actual.desc}</p>
      <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
        {actual.contenido}
      </div>
      <div style={{ padding: "0 20px 32px" }}>
        <Boton onClick={handleSiguiente} disabled={!actual.valido()}>
          {esUltimo ? t("perfil.calcular") : t("perfil.continuar")}
        </Boton>
      </div>
    </div>
  );
}
