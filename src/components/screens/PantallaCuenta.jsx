import { useState, useRef } from "react";
import {
  ChevronLeft, User, Edit3, DatabaseBackup, Download, Upload,
  CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";
import { T, fmt } from "../../theme.js";
import { useT, useIdioma } from "../../lib/i18n.jsx";
import Boton from "../ui/Boton.jsx";
import { exportarBackup, leerArchivoBackup, restaurarBackup } from "../../lib/backup.js";

function Insignia({ children, tono = T.accent }) {
  return (
    <div style={{
      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
      background: `linear-gradient(135deg, ${tono}, ${T.carb})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 28px ${tono}33`,
    }}>{children}</div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px" }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>{etiqueta}</div>
      <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{valor}</div>
    </div>
  );
}

function MacroChip({ etiqueta, valor, color, bg }) {
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{fmt(valor)}g</div>
      <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>{etiqueta}</div>
    </div>
  );
}

export default function PantallaCuenta({ perfil, objetivos, onEditar, onVolver, onDatosImportados }) {
  const t = useT();
  const { locale } = useIdioma();
  const [msg, setMsg] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const fileRef = useRef(null);

  const exportar = async () => {
    setMsg(null); setOcupado(true);
    try {
      const r = await exportarBackup();
      setMsg({ tipo: "ok", texto: r.via === "download" ? t("cuenta.msg.descarga") : t("cuenta.msg.elige") });
    } catch {
      setMsg({ tipo: "error", texto: t("cuenta.msg.export_err") });
    } finally { setOcupado(false); }
  };

  const alElegirArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setMsg(null);
    try {
      setPendiente(await leerArchivoBackup(file));
    } catch {
      setMsg({ tipo: "error", texto: t("cuenta.msg.leer_err") });
    }
  };

  const confirmarImportar = async () => {
    try {
      await restaurarBackup(pendiente);
      setPendiente(null);
      setMsg({ tipo: "ok", texto: t("cuenta.msg.restaurado") });
      onDatosImportados?.();
    } catch {
      setPendiente(null);
      setMsg({ tipo: "error", texto: t("cuenta.msg.restaurar_err") });
    }
  };

  const fechaPendiente = pendiente?.exportadoEn
    ? new Date(pendiente.exportadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : null;

  const valSexo = perfil?.sex ? t(`sexo.${perfil.sex}`) : "—";
  const valAct = perfil?.activityLevel ? t(`act.${perfil.activityLevel}`) : "—";
  const valObj = perfil?.goal ? t(`obj.${perfil.goal}`) : "—";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 4px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onVolver} aria-label={t("comun.volver")}
          style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 10px" }}>
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>{t("nav.perfil")}</h2>
      </div>

      <div style={{ flex: 1, padding: "12px 16px 32px", overflowY: "auto" }}>

        {/* ── Apartado 1: Tu perfil + estadísticas ── */}
        <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Insignia><User size={22} color="#06080F" /></Insignia>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Sora',sans-serif" }}>{t("cuenta.tu_perfil")}</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>{t("cuenta.tus_datos")}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 40, fontWeight: 800, color: T.accent, lineHeight: 1 }}>
              {fmt(objetivos?.caloriesKcal)}
            </span>
            <span style={{ fontSize: 14, color: T.muted }}>{t("cuenta.kcal_dia")}</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <MacroChip etiqueta={t("macro.proteina")} valor={objetivos?.proteinG}       color={T.prot} bg={T.protBg} />
            <MacroChip etiqueta={t("macro.carbos")}   valor={objetivos?.carbohydratesG} color={T.carb} bg={T.carbBg} />
            <MacroChip etiqueta={t("macro.grasa")}    valor={objetivos?.fatG}           color={T.fat}  bg={T.fatBg}  />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <Dato etiqueta={t("dato.edad")}      valor={`${fmt(perfil?.age)} ${t("cuenta.anos")}`} />
            <Dato etiqueta={t("dato.sexo")}      valor={valSexo} />
            <Dato etiqueta={t("dato.altura")}    valor={`${fmt(perfil?.heightCm)} cm`} />
            <Dato etiqueta={t("dato.peso")}      valor={`${fmt(perfil?.weightKg)} kg`} />
            <Dato etiqueta={t("dato.actividad")} valor={valAct} />
            <Dato etiqueta={t("dato.objetivo")}  valor={valObj} />
          </div>

          <Boton variante="ghost" onClick={onEditar} icono={<Edit3 size={15} />}>{t("cuenta.editar")}</Boton>
        </div>

        {/* ── Apartado 2: Copia de seguridad ── */}
        <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: T.r, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Insignia tono={T.carb}><DatabaseBackup size={22} color="#06080F" /></Insignia>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Sora',sans-serif" }}>{t("cuenta.backup")}</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>{t("cuenta.backup_sub")}</div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>{t("cuenta.backup_desc")}</p>

          {pendiente && (
            <div style={{ background: T.warnBg, border: `1px solid ${T.warn}55`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: T.warn, fontWeight: 600, marginBottom: 4 }}>{t("cuenta.restaurar_q")}</div>
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5, marginBottom: 12 }}>
                {fechaPendiente ? t("cuenta.copia_fecha", { fecha: fechaPendiente }) : ""}{t("cuenta.reemplazo")}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Boton variante="primario" onClick={confirmarImportar}>{t("cuenta.restaurar")}</Boton>
                <Boton variante="ghost" onClick={() => setPendiente(null)}>{t("cuenta.cancelar")}</Boton>
              </div>
            </div>
          )}

          {msg && (
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: msg.tipo === "ok" ? T.accentBg : T.dangerBg,
              border: `1px solid ${msg.tipo === "ok" ? T.accentBdr : T.danger + "44"}`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
            }}>
              {msg.tipo === "ok"
                ? <CheckCircle2 size={16} color={T.accent} style={{ flexShrink: 0, marginTop: 1 }} />
                : <AlertCircle size={16} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />}
              <div style={{ fontSize: 13, color: msg.tipo === "ok" ? T.accent : T.danger, lineHeight: 1.5 }}>{msg.texto}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Boton variante="primario" onClick={exportar} disabled={ocupado} icono={<Download size={15} />}>
              {ocupado ? t("cuenta.exportando") : t("cuenta.exportar")}
            </Boton>
            <Boton variante="ghost" onClick={() => fileRef.current?.click()} icono={<Upload size={15} />}>
              {t("cuenta.importar")}
            </Boton>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={alElegirArchivo} style={{ display: "none" }} />

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.s2, borderRadius: 10, padding: "9px 12px" }}>
            <ShieldCheck size={14} color={T.muted} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>{t("cuenta.privacidad")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
