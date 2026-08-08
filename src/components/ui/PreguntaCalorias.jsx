import { T } from "../../theme.js";
import { useT } from "../../lib/i18n.jsx";

export default function PreguntaCalorias({
  sabeCalorias, setSabeCalorias,
  caloriasInput, setCaloriasInput,
  proteinasInput, setProteinasInput,
  carbosInput, setCarbosInput,
  grasasInput, setGrasasInput,
}) {
  const t = useT();
  const btnBase = {
    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", transition: "all .15s",
  };
  const numInput = (valor, setValor, placeholder, color) => (
    <input
      type="number" min="0" max="9999"
      value={valor}
      onChange={e => setValor(e.target.value.replace(/[^0-9.]/g, ""))}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 11px",
        background: T.surf, border: `1px solid ${color}44`,
        borderRadius: 8, color: T.text, fontSize: 16,
        fontWeight: 700, outline: "none", fontFamily: "inherit",
        transition: "border .2s",
      }}
      onFocus={e => { e.target.style.borderColor = color; }}
      onBlur={e => { e.target.style.borderColor = `${color}44`; }}
    />
  );
  const limpiarTodo = () => {
    setSabeCalorias(false);
    setCaloriasInput(""); setProteinasInput(""); setCarbosInput(""); setGrasasInput("");
  };
  return (
    <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 10 }}>
        {t("pcal.pregunta")}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: sabeCalorias ? 14 : 0 }}>
        <button
          onClick={limpiarTodo}
          style={{
            ...btnBase,
            background: sabeCalorias === false ? T.danger : T.s3,
            color: sabeCalorias === false ? "#fff" : T.muted,
            border: sabeCalorias === false ? `1px solid ${T.danger}` : `1px solid ${T.border}`,
          }}>
          {t("pcal.no")}
        </button>
        <button
          onClick={() => setSabeCalorias(true)}
          style={{
            ...btnBase,
            background: sabeCalorias === true ? T.accent : T.s3,
            color: sabeCalorias === true ? "#06080F" : T.muted,
            border: sabeCalorias === true ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
          }}>
          {t("pcal.si")}
        </button>
      </div>
      {sabeCalorias === true && (
        <div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 12, lineHeight: 1.5 }}>
            {t("pcal.opcionales")}
          </div>
          {/* Calorías — campo grande y destacado */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 4 }}>{t("pcal.calorias")}</div>
            {numInput(caloriasInput, setCaloriasInput, t("pcal.cal_ph"), T.accent)}
          </div>
          {/* Macros en fila de 3 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: T.prot, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>{t("pcal.prot")}</div>
              {numInput(proteinasInput, setProteinasInput, t("pcal.prot_ph"), T.prot)}
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.carb, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>{t("pcal.carb")}</div>
              {numInput(carbosInput, setCarbosInput, t("pcal.carb_ph"), T.carb)}
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.fat, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>{t("pcal.fat")}</div>
              {numInput(grasasInput, setGrasasInput, t("pcal.fat_ph"), T.fat)}
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>
            {t("pcal.definitivos")}
          </div>
        </div>
      )}
    </div>
  );
}
