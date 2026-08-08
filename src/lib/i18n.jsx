// ═══════════════════════════════════════════════════════
// INTERNACIONALIZACIÓN (i18n)
// ═══════════════════════════════════════════════════════
// Cambio de idioma EN VIVO sin perder contexto: el idioma vive en un contexto
// de React; cambiarlo re-renderiza la app pero NO reinicia el estado (perfil,
// comidas, pantalla actual, etc. se conservan). El idioma se persiste.
//
// Uso: const t = useT();  →  t("clave")  /  t("clave", { n: 5 })
// Para añadir un idioma nuevo: añade su código a IDIOMAS y su valor en cada
// entrada de STRINGS. Para traducir una pantalla: reemplaza sus textos por
// t("clave") y añade la clave aquí con los 5 idiomas.
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { sg, ss, KEYS } from "./storage.js";

export const IDIOMAS = [
  { code: "es", nombre: "Español" },
  { code: "en", nombre: "English" },
  { code: "fr", nombre: "Français" },
  { code: "it", nombre: "Italiano" },
  { code: "pt", nombre: "Português" },
];

export const IDIOMA_POR_DEFECTO = "es";

// Locale BCP-47 por idioma, para formatear fechas y horas.
export const LOCALES = { es: "es-ES", en: "en-US", fr: "fr-FR", it: "it-IT", pt: "pt-PT" };

// Instrucción para que la IA (Gemini) responda en el idioma del usuario.
// Se añade al systemPrompt en gemini-client.js / electron.
export const INSTRUCCION_IDIOMA_IA = {
  es: "Responde SIEMPRE en español.",
  en: "ALWAYS respond in English.",
  fr: "Réponds TOUJOURS en français.",
  it: "Rispondi SEMPRE in italiano.",
  pt: "Responde SEMPRE em português.",
};

// ── Idioma activo a nivel de módulo ──────────────────────────────────────────
// El contexto de React solo es accesible desde componentes. Para traducir en
// archivos .js normales (apiKey.js, backup.js, gemini-client.js) mantenemos aquí
// una copia del idioma activo que el IdiomaProvider sincroniza en cada cambio.
let _idiomaActivo = IDIOMA_POR_DEFECTO;
export const getIdiomaActivo = () => _idiomaActivo;
export const getInstruccionIdiomaIA = () =>
  INSTRUCCION_IDIOMA_IA[_idiomaActivo] || INSTRUCCION_IDIOMA_IA.es;

// Traduce fuera de React (usa el idioma activo de módulo). Misma firma que t().
export function traducir(clave, params) {
  const entrada = STRINGS[clave];
  let s = entrada ? (entrada[_idiomaActivo] ?? entrada.es ?? clave) : clave;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
  return s;
}

// Diccionario: clave → traducción en cada idioma.
export const STRINGS = {
  // ── App / carga ──
  "app.cargando":       { es: "Cargando NutriAI...", en: "Loading NutriAI...", fr: "Chargement de NutriAI...", it: "Caricamento di NutriAI...", pt: "A carregar NutriAI..." },

  // ── Macros (reutilizables en varias pantallas) ──
  "macro.proteina": { es: "Proteína", en: "Protein", fr: "Protéines", it: "Proteine", pt: "Proteína" },
  "macro.carbos":   { es: "Carbos", en: "Carbs", fr: "Glucides", it: "Carboidrati", pt: "Hidratos" },
  "macro.grasa":    { es: "Grasa", en: "Fat", fr: "Lipides", it: "Grassi", pt: "Gordura" },
  "abbr.prot":      { es: "P", en: "P", fr: "P", it: "P", pt: "P" },
  "abbr.carb":      { es: "C", en: "C", fr: "G", it: "C", pt: "HC" },
  "abbr.fat":       { es: "G", en: "F", fr: "L", it: "G", pt: "G" },

  // ── Inicio (dashboard) ──
  "inicio.titulo":       { es: "Inicio", en: "Home", fr: "Accueil", it: "Home", pt: "Início" },
  "inicio.calorias_hoy": { es: "Calorías hoy", en: "Calories today", fr: "Calories aujourd’hui", it: "Calorie oggi", pt: "Calorias hoje" },
  "inicio.restante":     { es: "Restante", en: "Remaining", fr: "Restant", it: "Rimanenti", pt: "Restante" },
  "inicio.low_warn":     { es: "El objetivo calórico está en el mínimo seguro. Considera un ritmo menos agresivo.", en: "Your calorie goal is at the safe minimum. Consider a less aggressive pace.", fr: "Ton objectif calorique est au minimum sûr. Envisage un rythme moins agressif.", it: "Il tuo obiettivo calorico è al minimo sicuro. Valuta un ritmo meno aggressivo.", pt: "O teu objetivo calórico está no mínimo seguro. Considera um ritmo menos agressivo." },
  "inicio.analizar":     { es: "Analizar una comida", en: "Analyze a meal", fr: "Analyser un repas", it: "Analizza un pasto", pt: "Analisar uma refeição" },
  "inicio.info":         { es: "Las estimaciones por foto son aproximadas. Para mayor precisión, pesa tu comida o añade detalles manualmente.", en: "Photo estimates are approximate. For more accuracy, weigh your food or add details manually.", fr: "Les estimations par photo sont approximatives. Pour plus de précision, pèse ta nourriture ou ajoute des détails manuellement.", it: "Le stime da foto sono approssimative. Per maggiore precisione, pesa il cibo o aggiungi dettagli manualmente.", pt: "As estimativas por foto são aproximadas. Para mais precisão, pesa a comida ou adiciona detalhes manualmente." },
  "inicio.comidas_hoy":  { es: "Comidas de hoy", en: "Today’s meals", fr: "Repas d’aujourd’hui", it: "Pasti di oggi", pt: "Refeições de hoje" },
  "inicio.reiniciar":    { es: "Reiniciar día", en: "Reset day", fr: "Réinitialiser le jour", it: "Reimposta giorno", pt: "Reiniciar dia" },
  "inicio.sin_comidas":  { es: "Sin comidas registradas", en: "No meals logged", fr: "Aucun repas enregistré", it: "Nessun pasto registrato", pt: "Sem refeições registadas" },
  "inicio.empezar":      { es: "Pulsa \"Analizar una comida\" para empezar", en: "Tap \"Analyze a meal\" to start", fr: "Appuie sur « Analyser un repas » pour commencer", it: "Tocca \"Analizza un pasto\" per iniziare", pt: "Toca \"Analisar uma refeição\" para começar" },
  "inicio.eliminar":     { es: "Eliminar comida", en: "Delete meal", fr: "Supprimer le repas", it: "Elimina pasto", pt: "Eliminar refeição" },

  // ── Sexo ──
  "sexo.male":   { es: "Hombre", en: "Male", fr: "Homme", it: "Uomo", pt: "Homem" },
  "sexo.female": { es: "Mujer", en: "Female", fr: "Femme", it: "Donna", pt: "Mulher" },

  // ── Nivel de actividad ──
  "act.sedentary": { es: "Sedentario", en: "Sedentary", fr: "Sédentaire", it: "Sedentario", pt: "Sedentário" },
  "act.light":     { es: "Ligero", en: "Light", fr: "Léger", it: "Leggero", pt: "Ligeiro" },
  "act.moderate":  { es: "Moderado", en: "Moderate", fr: "Modéré", it: "Moderato", pt: "Moderado" },
  "act.high":      { es: "Alto", en: "High", fr: "Élevé", it: "Alto", pt: "Alto" },
  "act.very_high": { es: "Muy alto", en: "Very high", fr: "Très élevé", it: "Molto alto", pt: "Muito alto" },

  // ── Objetivo ──
  "obj.lose_fat":    { es: "Perder grasa", en: "Lose fat", fr: "Perdre de la graisse", it: "Perdere grasso", pt: "Perder gordura" },
  "obj.maintain":    { es: "Mantener peso", en: "Maintain weight", fr: "Maintenir le poids", it: "Mantenere il peso", pt: "Manter peso" },
  "obj.gain_muscle": { es: "Ganar músculo", en: "Gain muscle", fr: "Prendre du muscle", it: "Aumentare i muscoli", pt: "Ganhar músculo" },
  "obj.gain_weight": { es: "Subir de peso", en: "Gain weight", fr: "Prendre du poids", it: "Aumentare di peso", pt: "Ganhar peso" },
  "obj.performance": { es: "Rendimiento", en: "Performance", fr: "Performance", it: "Prestazioni", pt: "Desempenho" },
  "obj.custom":      { es: "Personalizado", en: "Custom", fr: "Personnalisé", it: "Personalizzato", pt: "Personalizado" },

  // ── Perfil / Cuenta ──
  "cuenta.tu_perfil":  { es: "Tu perfil", en: "Your profile", fr: "Ton profil", it: "Il tuo profilo", pt: "O teu perfil" },
  "cuenta.tus_datos":  { es: "Tus datos y objetivos diarios", en: "Your data and daily goals", fr: "Tes données et objectifs quotidiens", it: "I tuoi dati e obiettivi giornalieri", pt: "Os teus dados e objetivos diários" },
  "cuenta.kcal_dia":   { es: "kcal / día", en: "kcal / day", fr: "kcal / jour", it: "kcal / giorno", pt: "kcal / dia" },
  "cuenta.anos":       { es: "años", en: "years", fr: "ans", it: "anni", pt: "anos" },
  "cuenta.editar":     { es: "Editar perfil", en: "Edit profile", fr: "Modifier le profil", it: "Modifica profilo", pt: "Editar perfil" },
  "dato.edad":         { es: "Edad", en: "Age", fr: "Âge", it: "Età", pt: "Idade" },
  "dato.sexo":         { es: "Sexo", en: "Sex", fr: "Sexe", it: "Sesso", pt: "Sexo" },
  "dato.altura":       { es: "Altura", en: "Height", fr: "Taille", it: "Altezza", pt: "Altura" },
  "dato.peso":         { es: "Peso", en: "Weight", fr: "Poids", it: "Peso", pt: "Peso" },
  "dato.actividad":    { es: "Actividad", en: "Activity", fr: "Activité", it: "Attività", pt: "Atividade" },
  "dato.objetivo":     { es: "Objetivo", en: "Goal", fr: "Objectif", it: "Obiettivo", pt: "Objetivo" },
  "cuenta.backup":       { es: "Copia de seguridad", en: "Backup", fr: "Sauvegarde", it: "Backup", pt: "Cópia de segurança" },
  "cuenta.backup_sub":   { es: "Exporta o importa toda tu información", en: "Export or import all your data", fr: "Exporte ou importe toutes tes données", it: "Esporta o importa tutti i tuoi dati", pt: "Exporta ou importa todos os teus dados" },
  "cuenta.backup_desc":  { es: "Guarda tu perfil, tu historial de comidas y tu configuración en un archivo. Así no pierdes nada al reinstalar la app o cambiar de móvil: solo tienes que importarlo.", en: "Save your profile, meal history and settings to a file. That way you lose nothing when reinstalling the app or switching phones — just import it.", fr: "Enregistre ton profil, ton historique de repas et tes réglages dans un fichier. Ainsi tu ne perds rien en réinstallant l’app ou en changeant de téléphone : il suffit de l’importer.", it: "Salva il tuo profilo, la cronologia dei pasti e le impostazioni in un file. Così non perdi nulla reinstallando l’app o cambiando telefono: basta importarlo.", pt: "Guarda o teu perfil, o histórico de refeições e as definições num ficheiro. Assim não perdes nada ao reinstalar a app ou mudar de telemóvel: basta importá-lo." },
  "cuenta.restaurar_q":  { es: "¿Restaurar esta copia?", en: "Restore this backup?", fr: "Restaurer cette sauvegarde ?", it: "Ripristinare questo backup?", pt: "Restaurar esta cópia?" },
  "cuenta.copia_fecha":  { es: "Copia del {fecha}. ", en: "Backup from {fecha}. ", fr: "Sauvegarde du {fecha}. ", it: "Backup del {fecha}. ", pt: "Cópia de {fecha}. " },
  "cuenta.reemplazo":    { es: "Se reemplazarán tus datos actuales por los del archivo.", en: "Your current data will be replaced with the file's.", fr: "Tes données actuelles seront remplacées par celles du fichier.", it: "I tuoi dati attuali verranno sostituiti con quelli del file.", pt: "Os teus dados atuais serão substituídos pelos do ficheiro." },
  "cuenta.restaurar":    { es: "Restaurar", en: "Restore", fr: "Restaurer", it: "Ripristina", pt: "Restaurar" },
  "cuenta.cancelar":     { es: "Cancelar", en: "Cancel", fr: "Annuler", it: "Annulla", pt: "Cancelar" },
  "cuenta.exportando":   { es: "Exportando…", en: "Exporting…", fr: "Exportation…", it: "Esportazione…", pt: "A exportar…" },
  "cuenta.exportar":     { es: "Exportar", en: "Export", fr: "Exporter", it: "Esporta", pt: "Exportar" },
  "cuenta.importar":     { es: "Importar", en: "Import", fr: "Importer", it: "Importa", pt: "Importar" },
  "cuenta.privacidad":   { es: "El archivo incluye tu clave de Gemini. Guárdalo en un sitio privado y no lo compartas con desconocidos.", en: "The file includes your Gemini key. Keep it private and don't share it with strangers.", fr: "Le fichier contient ta clé Gemini. Garde-le privé et ne le partage pas avec des inconnus.", it: "Il file include la tua chiave Gemini. Tienilo privato e non condividerlo con sconosciuti.", pt: "O ficheiro inclui a tua chave Gemini. Mantém-no privado e não o partilhes com desconhecidos." },
  "cuenta.msg.descarga":     { es: "Descarga iniciada. Guarda el archivo en un sitio seguro.", en: "Download started. Save the file somewhere safe.", fr: "Téléchargement lancé. Enregistre le fichier en lieu sûr.", it: "Download avviato. Salva il file in un posto sicuro.", pt: "Transferência iniciada. Guarda o ficheiro num local seguro." },
  "cuenta.msg.elige":        { es: "Elige dónde guardar la copia.", en: "Choose where to save the backup.", fr: "Choisis où enregistrer la sauvegarde.", it: "Scegli dove salvare il backup.", pt: "Escolhe onde guardar a cópia." },
  "cuenta.msg.export_err":   { es: "No se pudo exportar.", en: "Couldn't export.", fr: "Impossible d’exporter.", it: "Impossibile esportare.", pt: "Não foi possível exportar." },
  "cuenta.msg.leer_err":     { es: "No se pudo leer el archivo (¿es una copia de NutriAI válida?).", en: "Couldn't read the file (is it a valid NutriAI backup?).", fr: "Impossible de lire le fichier (est-ce une sauvegarde NutriAI valide ?).", it: "Impossibile leggere il file (è un backup NutriAI valido?).", pt: "Não foi possível ler o ficheiro (é uma cópia NutriAI válida?)." },
  "cuenta.msg.restaurado":   { es: "Datos restaurados.", en: "Data restored.", fr: "Données restaurées.", it: "Dati ripristinati.", pt: "Dados restaurados." },
  "cuenta.msg.restaurar_err":{ es: "No se pudo restaurar.", en: "Couldn't restore.", fr: "Impossible de restaurer.", it: "Impossibile ripristinare.", pt: "Não foi possível restaurar." },

  // ── Confianza (badge) ──
  "conf.alta":  { es: "Confianza alta", en: "High confidence", fr: "Confiance élevée", it: "Affidabilità alta", pt: "Confiança alta" },
  "conf.media": { es: "Confianza media", en: "Medium confidence", fr: "Confiance moyenne", it: "Affidabilità media", pt: "Confiança média" },
  "conf.baja":  { es: "Confianza baja", en: "Low confidence", fr: "Confiance faible", it: "Affidabilità bassa", pt: "Confiança baixa" },

  // ── Saciedad (feedback) ──
  "saciedad.pregunta": { es: "¿Cómo te quedaste tras esta comida?", en: "How did you feel after this meal?", fr: "Comment t'es-tu senti après ce repas ?", it: "Come ti sei sentito dopo questo pasto?", pt: "Como te sentiste após esta refeição?" },
  "saciedad.hambre": { es: "Con hambre", en: "Hungry", fr: "Faim", it: "Fame", pt: "Com fome" },
  "saciedad.normal": { es: "Normal", en: "Okay", fr: "Normal", it: "Normale", pt: "Normal" },
  "saciedad.bien":   { es: "Bien", en: "Good", fr: "Bien", it: "Bene", pt: "Bem" },
  "saciedad.lleno":  { es: "Lleno", en: "Full", fr: "Rassasié", it: "Pieno", pt: "Cheio" },

  // ── Navegación inferior ──
  "nav.inicio":   { es: "Inicio",   en: "Home",     fr: "Accueil",  it: "Home",      pt: "Início" },
  "nav.analizar": { es: "Analizar", en: "Analyze",  fr: "Analyser", it: "Analizza",  pt: "Analisar" },
  "nav.crear":    { es: "Crear",    en: "Create",   fr: "Créer",    it: "Crea",      pt: "Criar" },
  "nav.registro": { es: "Registro", en: "Log",      fr: "Journal",  it: "Diario",    pt: "Registo" },
  "nav.perfil":   { es: "Perfil",   en: "Profile",  fr: "Profil",   it: "Profilo",   pt: "Perfil" },

  // ── Ajustes ──
  "ajustes.titulo":        { es: "Ajustes", en: "Settings", fr: "Réglages", it: "Impostazioni", pt: "Definições" },
  "ajustes.por":           { es: "por", en: "by", fr: "par", it: "di", pt: "por" },
  "ajustes.version":       { es: "Versión", en: "Version", fr: "Version", it: "Versione", pt: "Versão" },
  "ajustes.config":        { es: "Configuración", en: "Configuration", fr: "Configuration", it: "Configurazione", pt: "Configuração" },
  "ajustes.sobre":         { es: "Sobre la aplicación", en: "About the app", fr: "À propos de l’application", it: "Informazioni sull’app", pt: "Sobre a aplicação" },
  "ajustes.ia":            { es: "Inteligencia Artificial", en: "Artificial Intelligence", fr: "Intelligence artificielle", it: "Intelligenza artificiale", pt: "Inteligência Artificial" },
  "ajustes.ia.sub":        { es: "Tu clave y modelo de Gemini", en: "Your Gemini key and model", fr: "Ta clé et ton modèle Gemini", it: "La tua chiave e il modello Gemini", pt: "A tua chave e modelo Gemini" },
  "ajustes.icono":         { es: "Icono de la app", en: "App icon", fr: "Icône de l’application", it: "Icona dell’app", pt: "Ícone da aplicação" },
  "ajustes.icono.sub":     { es: "Elige cómo se ve en tu pantalla de inicio", en: "Choose how it looks on your home screen", fr: "Choisis son apparence sur l’écran d’accueil", it: "Scegli come appare nella schermata Home", pt: "Escolhe o aspeto no ecrã principal" },
  "ajustes.icono.aviso":   { es: "Al cambiar el icono, la app puede cerrarse un instante y tardar unos segundos en actualizarse.", en: "When you change the icon, the app may briefly close and take a few seconds to update.", fr: "En changeant l’icône, l’app peut se fermer un instant et mettre quelques secondes à se mettre à jour.", it: "Cambiando l’icona, l’app potrebbe chiudersi un istante e impiegare qualche secondo ad aggiornarsi.", pt: "Ao mudar o ícone, a app pode fechar-se por um instante e demorar alguns segundos a atualizar." },
  "ajustes.icono.ok":      { es: "Icono cambiado. Puede tardar unos segundos en verse en la pantalla de inicio.", en: "Icon changed. It may take a few seconds to show on your home screen.", fr: "Icône changée. Elle peut mettre quelques secondes à apparaître sur l’écran d’accueil.", it: "Icona cambiata. Potrebbe impiegare qualche secondo per apparire nella Home.", pt: "Ícone alterado. Pode demorar alguns segundos a aparecer no ecrã principal." },
  "ajustes.icono.error":   { es: "No se pudo cambiar el icono.", en: "Couldn't change the icon.", fr: "Impossible de changer l’icône.", it: "Impossibile cambiare l’icona.", pt: "Não foi possível mudar o ícone." },
  "ajustes.idioma":        { es: "Idioma", en: "Language", fr: "Langue", it: "Lingua", pt: "Idioma" },
  "ajustes.idioma.sub":    { es: "Cambiar idioma de la aplicación", en: "Change the app language", fr: "Changer la langue de l’application", it: "Cambia la lingua dell’app", pt: "Alterar o idioma da aplicação" },
  "ajustes.notif":         { es: "Notificaciones", en: "Notifications", fr: "Notifications", it: "Notifiche", pt: "Notificações" },
  "ajustes.notif.sub":     { es: "Recordatorios para registrar tus comidas", en: "Reminders to log your meals", fr: "Rappels pour enregistrer tes repas", it: "Promemoria per registrare i pasti", pt: "Lembretes para registar as tuas refeições" },
  "ajustes.dev":           { es: "Desarrollador", en: "Developer", fr: "Développeur", it: "Sviluppatore", pt: "Programador" },
  "ajustes.dev.sub":       { es: "Visita su portfolio", en: "Visit their portfolio", fr: "Voir son portfolio", it: "Visita il suo portfolio", pt: "Visita o seu portfólio" },
  "ajustes.donar":         { es: "Donaciones", en: "Donations", fr: "Dons", it: "Donazioni", pt: "Doações" },
  "ajustes.donar.sub":     { es: "Si te gusta esta aplicación, me ayudarías con una donación", en: "If you like this app, a donation would help me out", fr: "Si tu aimes cette appli, un don m'aiderait beaucoup", it: "Se ti piace questa app, una donazione mi aiuterebbe", pt: "Se gostas desta aplicação, uma doação ajudava-me" },
  "ajustes.historial":     { es: "Historial de Versiones", en: "Version History", fr: "Historique des versions", it: "Cronologia versioni", pt: "Histórico de versões" },
  "ajustes.fuente":        { es: "Código Fuente", en: "Source Code", fr: "Code source", it: "Codice sorgente", pt: "Código-fonte" },
  "ajustes.fuente.sub":    { es: "Repositorio en GitHub", en: "GitHub repository", fr: "Dépôt sur GitHub", it: "Repository su GitHub", pt: "Repositório no GitHub" },
  "ajustes.contacto":      { es: "Para cualquier sugerencia o fallo, contacta con el desarrollador mediante su portfolio.", en: "For any suggestion or bug, contact the developer through their portfolio.", fr: "Pour toute suggestion ou bug, contacte le développeur via son portfolio.", it: "Per qualsiasi suggerimento o problema, contatta lo sviluppatore tramite il suo portfolio.", pt: "Para qualquer sugestão ou erro, contacta o programador através do seu portfólio." },

  // ── Selector de idioma ──
  "idioma.titulo":         { es: "Idioma", en: "Language", fr: "Langue", it: "Lingua", pt: "Idioma" },
  "idioma.sub":            { es: "Elige el idioma de la app", en: "Choose the app language", fr: "Choisis la langue de l’app", it: "Scegli la lingua dell’app", pt: "Escolhe o idioma da app" },

  // ── Notificaciones ──
  "notif.titulo":          { es: "Notificaciones", en: "Notifications", fr: "Notifications", it: "Notifiche", pt: "Notificações" },
  "notif.sub":             { es: "Te recordamos registrar tus comidas para no perder de vista tus objetivos.", en: "We'll remind you to log your meals so you stay on track with your goals.", fr: "On te rappelle d'enregistrer tes repas pour garder le cap sur tes objectifs.", it: "Ti ricordiamo di registrare i pasti per non perdere di vista i tuoi obiettivi.", pt: "Lembramos-te de registar as tuas refeições para não perderes de vista os teus objetivos." },
  "notif.activar":         { es: "Recordatorios activados", en: "Reminders on", fr: "Rappels activés", it: "Promemoria attivi", pt: "Lembretes ativados" },
  "notif.horas":           { es: "Horas de recordatorio", en: "Reminder times", fr: "Heures de rappel", it: "Orari dei promemoria", pt: "Horas de lembrete" },
  "notif.anadir":          { es: "Añadir hora", en: "Add time", fr: "Ajouter une heure", it: "Aggiungi orario", pt: "Adicionar hora" },
  "notif.sin_horas":       { es: "No hay horas. Añade una para recibir recordatorios.", en: "No times yet. Add one to get reminders.", fr: "Aucune heure. Ajoutes-en une pour recevoir des rappels.", it: "Nessun orario. Aggiungine uno per ricevere promemoria.", pt: "Sem horas. Adiciona uma para receber lembretes." },
  "notif.eliminar":        { es: "Eliminar hora", en: "Remove time", fr: "Supprimer l'heure", it: "Rimuovi orario", pt: "Remover hora" },
  "notif.permiso_titulo":  { es: "Permite las notificaciones", en: "Allow notifications", fr: "Autorise les notifications", it: "Consenti le notifiche", pt: "Permite as notificações" },
  "notif.permiso_texto":   { es: "Para recibir los recordatorios, NutriAI necesita permiso para enviarte notificaciones.", en: "To get reminders, NutriAI needs permission to send you notifications.", fr: "Pour recevoir les rappels, NutriAI a besoin de l'autorisation de t'envoyer des notifications.", it: "Per ricevere i promemoria, NutriAI ha bisogno del permesso di inviarti notifiche.", pt: "Para receberes os lembretes, o NutriAI precisa de permissão para te enviar notificações." },
  "notif.permiso_boton":   { es: "Permitir", en: "Allow", fr: "Autoriser", it: "Consenti", pt: "Permitir" },
  "notif.permiso_denegado":{ es: "Permiso denegado. Actívalo en los ajustes de Android para recibir recordatorios.", en: "Permission denied. Enable it in Android settings to get reminders.", fr: "Autorisation refusée. Active-la dans les réglages Android pour recevoir des rappels.", it: "Permesso negato. Attivalo nelle impostazioni di Android per ricevere promemoria.", pt: "Permissão negada. Ativa-a nas definições do Android para receber lembretes." },
  "notif.probar":          { es: "Probar notificación", en: "Send test notification", fr: "Tester la notification", it: "Prova notifica", pt: "Testar notificação" },
  "notif.prueba.titulo":   { es: "Notificación de prueba 🔔", en: "Test notification 🔔", fr: "Notification de test 🔔", it: "Notifica di prova 🔔", pt: "Notificação de teste 🔔" },
  "notif.prueba.cuerpo":   { es: "¡Funciona! Así te avisaremos para registrar tus comidas.", en: "It works! This is how we'll remind you to log your meals.", fr: "Ça marche ! C'est ainsi qu'on te rappellera d'enregistrer tes repas.", it: "Funziona! Così ti ricorderemo di registrare i pasti.", pt: "Funciona! É assim que te vamos lembrar de registar as tuas refeições." },
  "notif.prueba_enviada":  { es: "Te llegará una notificación de prueba en unos segundos.", en: "You'll get a test notification in a few seconds.", fr: "Tu recevras une notification de test dans quelques secondes.", it: "Riceverai una notifica di prova tra pochi secondi.", pt: "Vais receber uma notificação de teste em poucos segundos." },
  "notif.prueba_sin_permiso": { es: "Falta el permiso de notificaciones. Actívalo para recibirlas.", en: "Notification permission is missing. Enable it to receive them.", fr: "L'autorisation de notification manque. Active-la pour les recevoir.", it: "Manca il permesso per le notifiche. Attivalo per riceverle.", pt: "Falta a permissão de notificações. Ativa-a para as receberes." },
  "notif.bateria":         { es: "¿No llegan puntuales? Desactiva la optimización de batería para NutriAI en los ajustes de Android.", en: "Not arriving on time? Turn off battery optimization for NutriAI in Android settings.", fr: "Elles n'arrivent pas à l'heure ? Désactive l'optimisation de batterie pour NutriAI dans les réglages Android.", it: "Non arrivano puntuali? Disattiva l'ottimizzazione della batteria per NutriAI nelle impostazioni di Android.", pt: "Não chegam a horas? Desativa a otimização de bateria para o NutriAI nas definições do Android." },
  "notif.abrir_ajustes":   { es: "Abrir ajustes de notificación (Android)", en: "Open notification settings (Android)", fr: "Ouvrir les réglages de notification (Android)", it: "Apri impostazioni notifiche (Android)", pt: "Abrir definições de notificação (Android)" },
  "notif.prueba_error":    { es: "No se pudo enviar la prueba.", en: "Couldn't send the test.", fr: "Impossible d'envoyer le test.", it: "Impossibile inviare la prova.", pt: "Não foi possível enviar o teste." },
  "notif.diag_titulo":     { es: "Diagnóstico", en: "Diagnostics", fr: "Diagnostic", it: "Diagnostica", pt: "Diagnóstico" },
  "notif.diag_plataforma": { es: "Plataforma", en: "Platform", fr: "Plateforme", it: "Piattaforma", pt: "Plataforma" },
  "notif.diag_permiso":    { es: "Permiso", en: "Permission", fr: "Autorisation", it: "Permesso", pt: "Permissão" },
  "notif.diag_programadas":{ es: "Programadas", en: "Scheduled", fr: "Programmées", it: "Programmate", pt: "Programadas" },
  "notif.diag_error":      { es: "Error", en: "Error", fr: "Erreur", it: "Errore", pt: "Erro" },
  "notif.diag_actualizar": { es: "Actualizar diagnóstico", en: "Refresh diagnostics", fr: "Actualiser le diagnostic", it: "Aggiorna diagnostica", pt: "Atualizar diagnóstico" },
  "notif.permiso.granted": { es: "Permitido", en: "Granted", fr: "Autorisé", it: "Concesso", pt: "Concedido" },
  "notif.permiso.denied":  { es: "Denegado", en: "Denied", fr: "Refusé", it: "Negato", pt: "Negado" },
  "notif.permiso.prompt":  { es: "Sin preguntar", en: "Not asked", fr: "Non demandé", it: "Non richiesto", pt: "Por perguntar" },
  "notif.msg.manana.titulo": { es: "¡Buenos días! ☀️", en: "Good morning! ☀️", fr: "Bonjour ! ☀️", it: "Buongiorno! ☀️", pt: "Bom dia! ☀️" },
  "notif.msg.manana.cuerpo": { es: "Registra tu desayuno y empieza el día con rumbo hacia tu meta.", en: "Log your breakfast and start the day on track toward your goal.", fr: "Enregistre ton petit-déjeuner et commence la journée en route vers ton objectif.", it: "Registra la colazione e inizia la giornata verso il tuo obiettivo.", pt: "Regista o teu pequeno-almoço e começa o dia rumo à tua meta." },
  "notif.msg.mediodia.titulo": { es: "Hora de comer 🍽️", en: "Lunch time 🍽️", fr: "C'est l'heure de manger 🍽️", it: "Ora di pranzo 🍽️", pt: "Hora de almoçar 🍽️" },
  "notif.msg.mediodia.cuerpo": { es: "Anota tu comida para llevar tus calorías y macros al día.", en: "Log your meal to keep your calories and macros up to date.", fr: "Enregistre ton repas pour garder tes calories et macros à jour.", it: "Registra il pasto per tenere aggiornati calorie e macro.", pt: "Regista a tua refeição para manteres calorias e macros em dia." },
  "notif.msg.noche.titulo": { es: "Cierra tu día 🌙", en: "Wrap up your day 🌙", fr: "Termine ta journée 🌙", it: "Chiudi la tua giornata 🌙", pt: "Fecha o teu dia 🌙" },
  "notif.msg.noche.cuerpo": { es: "Registra tu cena. Cada comida anotada te acerca a tu objetivo.", en: "Log your dinner. Every logged meal brings you closer to your goal.", fr: "Enregistre ton dîner. Chaque repas noté te rapproche de ton objectif.", it: "Registra la cena. Ogni pasto registrato ti avvicina al tuo obiettivo.", pt: "Regista o teu jantar. Cada refeição registada aproxima-te do teu objetivo." },
  "notif.hora_ayuda":      { es: "Escribe la hora en formato 24h (por ejemplo, 09:30 o 21:00).", en: "Type the time in 24h format (e.g. 09:30 or 21:00).", fr: "Saisis l'heure au format 24h (par exemple 09:30 ou 21:00).", it: "Scrivi l'ora in formato 24h (ad es. 09:30 o 21:00).", pt: "Escreve a hora em formato 24h (por exemplo, 09:30 ou 21:00)." },
  "notif.cumple.titulo":   { es: "¡Feliz cumpleaños! 🎂", en: "Happy birthday! 🎂", fr: "Joyeux anniversaire ! 🎂", it: "Buon compleanno! 🎂", pt: "Feliz aniversário! 🎂" },
  "notif.cumple.cuerpo":   { es: "¡Un año más! 🎉 No te rindas y ve a por tus objetivos. Hoy es tu día 💪", en: "Another year! 🎉 Don't give up and go for your goals. Today is your day 💪", fr: "Une année de plus ! 🎉 N'abandonne pas et fonce vers tes objectifs. C'est ton jour 💪", it: "Un anno in più! 🎉 Non mollare e vai verso i tuoi obiettivi. Oggi è il tuo giorno 💪", pt: "Mais um ano! 🎉 Não desistas e vai atrás dos teus objetivos. Hoje é o teu dia 💪" },

  // ── Optimización del sistema (inicio automático + batería) ──
  "optim.titulo":          { es: "Un último ajuste importante", en: "One last important step", fr: "Un dernier réglage important", it: "Un ultimo passo importante", pt: "Um último passo importante" },
  "optim.sub":             { es: "Para que los recordatorios lleguen siempre y la app funcione sin fallos, tu móvil necesita permitir que NutriAI se ejecute en segundo plano.", en: "So reminders always arrive and the app runs smoothly, your phone needs to let NutriAI run in the background.", fr: "Pour que les rappels arrivent toujours et que l'app fonctionne sans accroc, ton téléphone doit autoriser NutriAI à s'exécuter en arrière-plan.", it: "Perché i promemoria arrivino sempre e l'app funzioni senza problemi, il telefono deve consentire a NutriAI di funzionare in background.", pt: "Para que os lembretes cheguem sempre e a app funcione sem falhas, o teu telemóvel precisa de permitir que o NutriAI funcione em segundo plano." },
  "optim.seccion":         { es: "Que las notificaciones no fallen", en: "Keep notifications reliable", fr: "Fiabilité des notifications", it: "Notifiche affidabili", pt: "Notificações fiáveis" },
  "optim.seccion_sub":     { es: "Si algún recordatorio no llega puntual, activa estas dos opciones del sistema.", en: "If a reminder ever arrives late, enable these two system options.", fr: "Si un rappel arrive en retard, active ces deux options du système.", it: "Se un promemoria arriva in ritardo, attiva queste due opzioni di sistema.", pt: "Se algum lembrete chegar atrasado, ativa estas duas opções do sistema." },
  "optim.inicio_titulo":   { es: "Inicio automático", en: "Auto-start", fr: "Démarrage automatique", it: "Avvio automatico", pt: "Arranque automático" },
  "optim.inicio_texto":    { es: "Permite que NutriAI se inicie por sí sola para poder enviarte los recordatorios.", en: "Let NutriAI start on its own so it can send you reminders.", fr: "Autorise NutriAI à démarrer seule pour pouvoir t'envoyer les rappels.", it: "Consenti a NutriAI di avviarsi da sola per inviarti i promemoria.", pt: "Permite que o NutriAI se inicie sozinho para te enviar os lembretes." },
  "optim.bateria_titulo":  { es: "Batería sin restricciones", en: "No battery restrictions", fr: "Batterie sans restriction", it: "Batteria senza restrizioni", pt: "Bateria sem restrições" },
  "optim.bateria_texto":   { es: "Evita que el ahorro de batería cierre la app y bloquee los avisos.", en: "Stops battery saver from closing the app and blocking alerts.", fr: "Empêche l'économie de batterie de fermer l'app et de bloquer les alertes.", it: "Impedisce al risparmio energetico di chiudere l'app e bloccare gli avvisi.", pt: "Impede que a poupança de bateria feche a app e bloqueie os avisos." },
  "optim.activar":         { es: "Activar", en: "Enable", fr: "Activer", it: "Attiva", pt: "Ativar" },
  "optim.mas_tarde":       { es: "Activar más tarde", en: "Enable later", fr: "Activer plus tard", it: "Attiva più tardi", pt: "Ativar mais tarde" },
  "optim.activado":        { es: "Activado", en: "Enabled", fr: "Activé", it: "Attivato", pt: "Ativado" },
  "optim.pendiente":       { es: "Pendiente de activar", en: "Not enabled yet", fr: "À activer", it: "Da attivare", pt: "Por ativar" },
  "optim.esperando":       { es: "Esperando a la activación", en: "Waiting for activation", fr: "En attente d'activation", it: "In attesa di attivazione", pt: "A aguardar ativação" },
  "optim.continuar":       { es: "Continuar", en: "Continue", fr: "Continuer", it: "Continua", pt: "Continuar" },

  // ── Historial de versiones ──
  "hist.titulo":           { es: "Historial de Versiones", en: "Version History", fr: "Historique des versions", it: "Cronologia versioni", pt: "Histórico de versões" },
  "hist.nuevo":            { es: "NUEVO", en: "NEW", fr: "NOUVEAU", it: "NUOVO", pt: "NOVO" },
  "hist.1_0_0.titulo":     { es: "Primera versión", en: "First release", fr: "Première version", it: "Prima versione", pt: "Primeira versão" },
  "hist.1_0_0.cuerpo": {
    es: "¡Bienvenido a NutriAI! Esto es lo que puedes hacer:\n\n• Analiza tus comidas con IA por foto o por texto y obtén calorías y macros al instante.\n• Corrige los alimentos detectados o aclara la comida cuando la IA no esté segura, para afinar el resultado.\n• Crea comidas: elige lo que te apetece o parte de tu despensa, recibe varias ideas y mira sus ingredientes y su paso a paso; guarda la que vayas a comer.\n• Objetivos de calorías y macros personalizados según tu perfil y tu meta.\n• Registro diario con seguimiento de tu progreso.\n• Indica cómo te quedaste tras cada comida (con hambre, normal, bien o lleno).\n• Recordatorios personalizables: elige a qué horas quieres que te avisemos para registrar tus comidas. Llegan aunque cierres la app o reinicies el móvil.\n• Perfil con estadísticas y tipo de entrenamiento.\n• Copia de seguridad: exporta e importa tus datos.\n• Disponible en varios idiomas.\n• Cada usuario usa su propia clave de Gemini.\n• Selector de icono de la app.",
    en: "Welcome to NutriAI! Here's what you can do:\n\n• Analyze your meals with AI by photo or text and get calories and macros instantly.\n• Correct the detected foods or clarify the meal when the AI isn't sure, to fine-tune the result.\n• Create meals: choose what you fancy or start from your pantry, get several ideas and see their ingredients and step-by-step; save the one you'll eat.\n• Personalized calorie and macro goals based on your profile and target.\n• Daily log to track your progress.\n• Tell us how you felt after each meal (hungry, okay, good or full).\n• Customizable reminders: pick the times you want to be nudged to log your meals. They arrive even if you close the app or restart your phone.\n• Profile with stats and training type.\n• Backup: export and import your data.\n• Available in several languages.\n• Each user uses their own Gemini key.\n• App icon selector.",
    fr: "Bienvenue sur NutriAI ! Voici ce que tu peux faire :\n\n• Analyse tes repas avec l'IA par photo ou par texte et obtiens calories et macros instantanément.\n• Corrige les aliments détectés ou précise le repas quand l'IA n'est pas sûre, pour affiner le résultat.\n• Crée des repas : choisis ce qui te tente ou pars de ton placard, reçois plusieurs idées et vois leurs ingrédients et leur pas à pas ; enregistre celui que tu vas manger.\n• Objectifs de calories et de macros personnalisés selon ton profil et ton but.\n• Journal quotidien pour suivre ta progression.\n• Indique comment tu t'es senti après chaque repas (faim, normal, bien ou rassasié).\n• Rappels personnalisables : choisis les heures auxquelles te rappeler d'enregistrer tes repas. Ils arrivent même si tu fermes l'app ou redémarres le téléphone.\n• Profil avec statistiques et type d'entraînement.\n• Sauvegarde : exporte et importe tes données.\n• Disponible en plusieurs langues.\n• Chaque utilisateur utilise sa propre clé Gemini.\n• Sélecteur d'icône de l'app.",
    it: "Benvenuto in NutriAI! Ecco cosa puoi fare:\n\n• Analizza i tuoi pasti con l'IA tramite foto o testo e ottieni calorie e macro all'istante.\n• Correggi gli alimenti rilevati o chiarisci il pasto quando l'IA non è sicura, per affinare il risultato.\n• Crea pasti: scegli ciò che ti va o parti dalla tua dispensa, ricevi diverse idee e guarda ingredienti e passo dopo passo; salva quello che mangerai.\n• Obiettivi di calorie e macro personalizzati in base al tuo profilo e al tuo scopo.\n• Diario giornaliero per monitorare i tuoi progressi.\n• Indica come ti sei sentito dopo ogni pasto (fame, normale, bene o pieno).\n• Promemoria personalizzabili: scegli gli orari in cui ricordarti di registrare i pasti. Arrivano anche se chiudi l'app o riavvii il telefono.\n• Profilo con statistiche e tipo di allenamento.\n• Backup: esporta e importa i tuoi dati.\n• Disponibile in diverse lingue.\n• Ogni utente usa la propria chiave Gemini.\n• Selettore dell'icona dell'app.",
    pt: "Bem-vindo ao NutriAI! Isto é o que podes fazer:\n\n• Analisa as tuas refeições com IA por foto ou texto e obtém calorias e macros ao instante.\n• Corrige os alimentos detetados ou esclarece a refeição quando a IA não tem a certeza, para afinar o resultado.\n• Cria refeições: escolhe o que te apetece ou parte da tua despensa, recebe várias ideias e vê os ingredientes e o passo a passo; guarda a que vais comer.\n• Objetivos de calorias e macros personalizados segundo o teu perfil e a tua meta.\n• Registo diário com acompanhamento do teu progresso.\n• Indica como te sentiste após cada refeição (com fome, normal, bem ou cheio).\n• Lembretes personalizáveis: escolhe as horas a que queres ser avisado para registar as tuas refeições. Chegam mesmo que feches a app ou reinicies o telemóvel.\n• Perfil com estatísticas e tipo de treino.\n• Cópia de segurança: exporta e importa os teus dados.\n• Disponível em vários idiomas.\n• Cada utilizador usa a sua própria chave Gemini.\n• Seletor de ícone da app.",
  },

  // ── Bienvenida (onboarding) ──
  "bienvenida.titulo": { es: "Registra tu comida con IA", en: "Track your food with AI", fr: "Suis tes repas avec l’IA", it: "Registra i tuoi pasti con l’IA", pt: "Regista a tua comida com IA" },
  "bienvenida.sub":    { es: "Sube una foto de tu comida, añade detalles opcionales y obtén estimaciones de calorías y macros al instante.", en: "Upload a photo of your meal, add optional details and get instant calorie and macro estimates.", fr: "Envoie une photo de ton repas, ajoute des détails facultatifs et obtiens une estimation instantanée des calories et des macros.", it: "Carica una foto del tuo pasto, aggiungi dettagli opzionali e ottieni subito una stima di calorie e macro.", pt: "Envia uma foto da tua refeição, adiciona detalhes opcionais e obtém estimativas de calorias e macros ao instante." },
  "bienvenida.f1":     { es: "Análisis de fotos con IA", en: "AI photo analysis", fr: "Analyse de photos par IA", it: "Analisi foto con IA", pt: "Análise de fotos com IA" },
  "bienvenida.f2":     { es: "Objetivos de macros personalizados", en: "Personalized macro goals", fr: "Objectifs de macros personnalisés", it: "Obiettivi di macro personalizzati", pt: "Objetivos de macros personalizados" },
  "bienvenida.f3":     { es: "Seguimiento de progreso diario", en: "Daily progress tracking", fr: "Suivi de la progression quotidienne", it: "Monitoraggio dei progressi giornalieri", pt: "Acompanhamento do progresso diário" },
  "bienvenida.boton":  { es: "Crear mi perfil", en: "Create my profile", fr: "Créer mon profil", it: "Crea il mio profilo", pt: "Criar o meu perfil" },
  "bienvenida.local":  { es: "Datos guardados localmente. Sin cuenta necesaria.", en: "Data saved locally. No account needed.", fr: "Données enregistrées localement. Aucun compte requis.", it: "Dati salvati localmente. Nessun account necessario.", pt: "Dados guardados localmente. Sem necessidade de conta." },
  "bienvenida.idioma": { es: "Elige tu idioma", en: "Choose your language", fr: "Choisis ta langue", it: "Scegli la tua lingua", pt: "Escolhe o teu idioma" },

  // ── Conexión (clave/modelo de Gemini) ──
  "conexion.kicker":       { es: "Conexión con Gemini", en: "Connect to Gemini", fr: "Connexion à Gemini", it: "Connessione a Gemini", pt: "Ligação ao Gemini" },
  "conexion.titulo":       { es: "Conecta tu IA", en: "Connect your AI", fr: "Connecte ton IA", it: "Connetti la tua IA", pt: "Liga a tua IA" },
  "conexion.kicker_aj":    { es: "Ajustes", en: "Settings", fr: "Réglages", it: "Impostazioni", pt: "Definições" },
  "conexion.titulo_aj":    { es: "Clave y modelo", en: "Key and model", fr: "Clé et modèle", it: "Chiave e modello", pt: "Chave e modelo" },
  "conexion.intro":        { es: "NutriAI usa la IA de Google (Gemini). Es gratis: solo necesitas tu propia clave para empezar. Se guarda en tu dispositivo y no se comparte con nadie.", en: "NutriAI uses Google's AI (Gemini). It's free: you only need your own key to start. It's stored on your device and shared with no one.", fr: "NutriAI utilise l'IA de Google (Gemini). C'est gratuit : il te suffit de ta propre clé pour commencer. Elle est enregistrée sur ton appareil et n'est partagée avec personne.", it: "NutriAI usa l'IA di Google (Gemini). È gratis: ti serve solo la tua chiave per iniziare. Viene salvata sul tuo dispositivo e non è condivisa con nessuno.", pt: "O NutriAI usa a IA da Google (Gemini). É grátis: só precisas da tua própria chave para começar. Fica guardada no teu dispositivo e não é partilhada com ninguém." },
  "conexion.tutorial":     { es: "Cómo conseguir tu clave (gratis)", en: "How to get your key (free)", fr: "Comment obtenir ta clé (gratuit)", it: "Come ottenere la tua chiave (gratis)", pt: "Como obter a tua chave (grátis)" },
  "conexion.paso1":        { es: "Abre Google AI Studio y accede con tu cuenta de Google.", en: "Open Google AI Studio and sign in with your Google account.", fr: "Ouvre Google AI Studio et connecte-toi avec ton compte Google.", it: "Apri Google AI Studio e accedi con il tuo account Google.", pt: "Abre o Google AI Studio e inicia sessão com a tua conta Google." },
  "conexion.paso2":        { es: "Pulsa \"Create API key\" (Crear clave de API).", en: "Tap \"Create API key\".", fr: "Appuie sur « Create API key » (Créer une clé d'API).", it: "Tocca \"Create API key\" (Crea chiave API).", pt: "Toca em \"Create API key\" (Criar chave de API)." },
  "conexion.paso3":        { es: "Copia la clave (empieza por \"AIza…\").", en: "Copy the key (it starts with \"AIza…\").", fr: "Copie la clé (elle commence par « AIza… »).", it: "Copia la chiave (inizia con \"AIza…\").", pt: "Copia a chave (começa por \"AIza…\")." },
  "conexion.paso4":        { es: "Pégala aquí abajo y pulsa Validar.", en: "Paste it below and tap Validate.", fr: "Colle-la ci-dessous et appuie sur Valider.", it: "Incollala qui sotto e tocca Convalida.", pt: "Cola-a aqui em baixo e toca em Validar." },
  "conexion.abrir":        { es: "Abrir Google AI Studio", en: "Open Google AI Studio", fr: "Ouvrir Google AI Studio", it: "Apri Google AI Studio", pt: "Abrir o Google AI Studio" },
  "conexion.aviso":        { es: "Siguiendo este tutorial solo funcionan las claves de <b>Gemini (Google AI Studio)</b>. Las de otros servicios (OpenAI, etc.) no sirven.", en: "Following this tutorial, only <b>Gemini (Google AI Studio)</b> keys work. Keys from other services (OpenAI, etc.) won't work.", fr: "En suivant ce tutoriel, seules les clés <b>Gemini (Google AI Studio)</b> fonctionnent. Celles d'autres services (OpenAI, etc.) ne marchent pas.", it: "Seguendo questo tutorial funzionano solo le chiavi <b>Gemini (Google AI Studio)</b>. Quelle di altri servizi (OpenAI, ecc.) non funzionano.", pt: "Seguindo este tutorial, só funcionam as chaves <b>Gemini (Google AI Studio)</b>. As de outros serviços (OpenAI, etc.) não servem." },
  "conexion.clave_label":  { es: "Tu clave de Gemini", en: "Your Gemini key", fr: "Ta clé Gemini", it: "La tua chiave Gemini", pt: "A tua chave Gemini" },
  "conexion.ya_clave":     { es: "Ya tienes una clave guardada. Déjalo vacío para mantenerla, o escribe una nueva para cambiarla.", en: "You already have a saved key. Leave it empty to keep it, or type a new one to change it.", fr: "Tu as déjà une clé enregistrée. Laisse vide pour la garder, ou saisis-en une nouvelle pour la changer.", it: "Hai già una chiave salvata. Lascia vuoto per mantenerla, o scrivine una nuova per cambiarla.", pt: "Já tens uma chave guardada. Deixa vazio para a manter, ou escreve uma nova para a mudar." },
  "conexion.modelo_label": { es: "Modelo de Gemini", en: "Gemini model", fr: "Modèle Gemini", it: "Modello Gemini", pt: "Modelo Gemini" },
  "conexion.recomendado":  { es: "recomendado", en: "recommended", fr: "recommandé", it: "consigliato", pt: "recomendado" },
  "conexion.modelo_otro":  { es: "Otro (escribir el ID a mano)", en: "Other (type the ID manually)", fr: "Autre (saisir l'ID à la main)", it: "Altro (inserisci l'ID manualmente)", pt: "Outro (escrever o ID manualmente)" },
  "conexion.modelo_ph":    { es: "ID del modelo, p. ej. gemini-2.5-flash", en: "Model ID, e.g. gemini-2.5-flash", fr: "ID du modèle, p. ex. gemini-2.5-flash", it: "ID del modello, es. gemini-2.5-flash", pt: "ID do modelo, p. ex. gemini-2.5-flash" },
  "conexion.modelo_nota":  { es: "Solo modelos de Gemini. Debe estar disponible para tu clave.", en: "Gemini models only. It must be available for your key.", fr: "Modèles Gemini uniquement. Il doit être disponible pour ta clé.", it: "Solo modelli Gemini. Deve essere disponibile per la tua chiave.", pt: "Apenas modelos Gemini. Tem de estar disponível para a tua chave." },
  "conexion.err_clave":    { es: "Introduce tu clave de Gemini.", en: "Enter your Gemini key.", fr: "Saisis ta clé Gemini.", it: "Inserisci la tua chiave Gemini.", pt: "Introduz a tua chave Gemini." },
  "conexion.err_modelo":   { es: "Escribe el ID del modelo o elige uno de la lista.", en: "Type the model ID or pick one from the list.", fr: "Saisis l'ID du modèle ou choisis-en un dans la liste.", it: "Scrivi l'ID del modello o scegline uno dalla lista.", pt: "Escreve o ID do modelo ou escolhe um da lista." },
  "conexion.validando":    { es: "Validando…", en: "Validating…", fr: "Validation…", it: "Convalida…", pt: "A validar…" },
  "conexion.guardar":      { es: "Guardar y validar", en: "Save and validate", fr: "Enregistrer et valider", it: "Salva e convalida", pt: "Guardar e validar" },
  "conexion.continuar":    { es: "Validar y continuar", en: "Validate and continue", fr: "Valider et continuer", it: "Convalida e continua", pt: "Validar e continuar" },
  "conexion.borrar":       { es: "Borrar clave guardada", en: "Delete saved key", fr: "Supprimer la clé enregistrée", it: "Elimina chiave salvata", pt: "Apagar chave guardada" },
  "conexion.privacidad":   { es: "Tu clave se guarda solo en este dispositivo. Las fotos y textos que analices se envían a Google con tu clave; tu cuota y tu consumo son tuyos.", en: "Your key is stored only on this device. The photos and text you analyze are sent to Google with your key; your quota and usage are your own.", fr: "Ta clé n'est enregistrée que sur cet appareil. Les photos et textes que tu analyses sont envoyés à Google avec ta clé ; ton quota et ta consommation t'appartiennent.", it: "La tua chiave è salvata solo su questo dispositivo. Le foto e i testi che analizzi vengono inviati a Google con la tua chiave; la tua quota e il tuo consumo sono tuoi.", pt: "A tua chave é guardada só neste dispositivo. As fotos e textos que analisas são enviados à Google com a tua chave; a tua quota e o teu consumo são teus." },
  "conexion.ver":          { es: "Ver clave", en: "Show key", fr: "Afficher la clé", it: "Mostra chiave", pt: "Mostrar chave" },
  "conexion.ocultar":      { es: "Ocultar clave", en: "Hide key", fr: "Masquer la clé", it: "Nascondi chiave", pt: "Ocultar chave" },

  // ── Perfil (formulario multipaso) ──
  "perfil.paso":           { es: "Paso {n} de {total}", en: "Step {n} of {total}", fr: "Étape {n} sur {total}", it: "Passo {n} di {total}", pt: "Passo {n} de {total}" },
  "perfil.continuar":      { es: "Continuar →", en: "Continue →", fr: "Continuer →", it: "Continua →", pt: "Continuar →" },
  "perfil.calcular":       { es: "Calcular mis objetivos →", en: "Calculate my goals →", fr: "Calculer mes objectifs →", it: "Calcola i miei obiettivi →", pt: "Calcular os meus objetivos →" },
  "perfil.p1.titulo":      { es: "Información básica", en: "Basic information", fr: "Informations de base", it: "Informazioni di base", pt: "Informação básica" },
  "perfil.p1.desc":        { es: "Cuéntanos sobre ti", en: "Tell us about yourself", fr: "Parle-nous de toi", it: "Parlaci di te", pt: "Conta-nos sobre ti" },
  "perfil.edad":           { es: "Edad", en: "Age", fr: "Âge", it: "Età", pt: "Idade" },
  "perfil.edad_ph":        { es: "Años", en: "Years", fr: "Ans", it: "Anni", pt: "Anos" },
  "perfil.fecha_nac":      { es: "Fecha de nacimiento", en: "Date of birth", fr: "Date de naissance", it: "Data di nascita", pt: "Data de nascimento" },
  "perfil.fecha_nac_nota": { es: "No se guarda en ningún servidor ni se comparte: se queda en tu dispositivo para calcular tu edad y darte un mejor asesoramiento. Se actualizará sola el día de tu cumpleaños.", en: "It's not stored on any server or shared: it stays on your device to work out your age and give you better guidance. It updates itself on your birthday.", fr: "Elle n'est stockée sur aucun serveur ni partagée : elle reste sur ton appareil pour calculer ton âge et mieux te conseiller. Elle se met à jour le jour de ton anniversaire.", it: "Non viene salvata su alcun server né condivisa: resta sul tuo dispositivo per calcolare la tua età e darti consigli migliori. Si aggiorna da sola il giorno del tuo compleanno.", pt: "Não é guardada em nenhum servidor nem partilhada: fica no teu dispositivo para calcular a tua idade e dar-te um melhor aconselhamento. Atualiza-se sozinha no dia do teu aniversário." },
  "perfil.edad_rango":     { es: "La edad debe estar entre 10 y 100 años.", en: "Age must be between 10 and 100.", fr: "L'âge doit être compris entre 10 et 100 ans.", it: "L'età deve essere tra 10 e 100 anni.", pt: "A idade deve estar entre 10 e 100 anos." },
  "perfil.sexo":           { es: "Sexo biológico", en: "Biological sex", fr: "Sexe biologique", it: "Sesso biologico", pt: "Sexo biológico" },
  "perfil.altura":         { es: "Altura (cm)", en: "Height (cm)", fr: "Taille (cm)", it: "Altezza (cm)", pt: "Altura (cm)" },
  "perfil.peso":           { es: "Peso (kg)", en: "Weight (kg)", fr: "Poids (kg)", it: "Peso (kg)", pt: "Peso (kg)" },
  "perfil.p2.titulo":      { es: "Nivel de actividad", en: "Activity level", fr: "Niveau d'activité", it: "Livello di attività", pt: "Nível de atividade" },
  "perfil.p2.desc":        { es: "¿Cuánto te mueves al día?", en: "How much do you move each day?", fr: "Combien bouges-tu par jour ?", it: "Quanto ti muovi al giorno?", pt: "Quanto te mexes por dia?" },
  "perfil.act_label":      { es: "Actividad diaria", en: "Daily activity", fr: "Activité quotidienne", it: "Attività giornaliera", pt: "Atividade diária" },
  "perfil.act.sedentary":  { es: "Sedentario (trabajo de escritorio, sin ejercicio)", en: "Sedentary (desk job, no exercise)", fr: "Sédentaire (travail de bureau, sans exercice)", it: "Sedentario (lavoro d'ufficio, senza esercizio)", pt: "Sedentário (trabalho de escritório, sem exercício)" },
  "perfil.act.light":      { es: "Ligero (1-3 días por semana)", en: "Light (1-3 days per week)", fr: "Léger (1 à 3 jours par semaine)", it: "Leggero (1-3 giorni a settimana)", pt: "Ligeiro (1-3 dias por semana)" },
  "perfil.act.moderate":   { es: "Moderado (3-5 días por semana)", en: "Moderate (3-5 days per week)", fr: "Modéré (3 à 5 jours par semaine)", it: "Moderato (3-5 giorni a settimana)", pt: "Moderado (3-5 dias por semana)" },
  "perfil.act.high":       { es: "Alto (6-7 días por semana)", en: "High (6-7 days per week)", fr: "Élevé (6 à 7 jours par semaine)", it: "Alto (6-7 giorni a settimana)", pt: "Alto (6-7 dias por semana)" },
  "perfil.act.very_high":  { es: "Muy alto (atleta o trabajo físico intenso)", en: "Very high (athlete or intense physical work)", fr: "Très élevé (athlète ou travail physique intense)", it: "Molto alto (atleta o lavoro fisico intenso)", pt: "Muito alto (atleta ou trabalho físico intenso)" },
  "perfil.dias":           { es: "Días de entrenamiento/semana", en: "Training days/week", fr: "Jours d'entraînement/semaine", it: "Giorni di allenamento/settimana", pt: "Dias de treino/semana" },
  "perfil.dias_ph":        { es: "Días", en: "Days", fr: "Jours", it: "Giorni", pt: "Dias" },
  "perfil.min":            { es: "Minutos por sesión", en: "Minutes per session", fr: "Minutes par séance", it: "Minuti per sessione", pt: "Minutos por sessão" },
  "perfil.min_ph":         { es: "Min", en: "Min", fr: "Min", it: "Min", pt: "Min" },
  "perfil.entrenamiento":  { es: "Tipo de entrenamiento", en: "Training type", fr: "Type d'entraînement", it: "Tipo di allenamento", pt: "Tipo de treino" },
  "perfil.entren.none":        { es: "Ninguno", en: "None", fr: "Aucun", it: "Nessuno", pt: "Nenhum" },
  "perfil.entren.strength":    { es: "Entrenamiento de fuerza", en: "Strength training", fr: "Musculation (force)", it: "Allenamento di forza", pt: "Treino de força" },
  "perfil.entren.hypertrophy": { es: "Hipertrofia", en: "Hypertrophy", fr: "Hypertrophie", it: "Ipertrofia", pt: "Hipertrofia" },
  "perfil.entren.cardio":      { es: "Cardio", en: "Cardio", fr: "Cardio", it: "Cardio", pt: "Cardio" },
  "perfil.entren.swimming":    { es: "Natación", en: "Swimming", fr: "Natation", it: "Nuoto", pt: "Natação" },
  "perfil.entren.crossfit":    { es: "CrossFit / funcional", en: "CrossFit / functional", fr: "CrossFit / fonctionnel", it: "CrossFit / funzionale", pt: "CrossFit / funcional" },
  "perfil.entren.sports":      { es: "Deportes de equipo", en: "Team sports", fr: "Sports d'équipe", it: "Sport di squadra", pt: "Desportos de equipa" },
  "perfil.entren.running":     { es: "Running / atletismo", en: "Running / athletics", fr: "Course / athlétisme", it: "Corsa / atletica", pt: "Corrida / atletismo" },
  "perfil.entren.mixed":       { es: "Mixto", en: "Mixed", fr: "Mixte", it: "Misto", pt: "Misto" },
  "perfil.entren.other":       { es: "Otro", en: "Other", fr: "Autre", it: "Altro", pt: "Outro" },
  "perfil.p3.titulo":      { es: "Tu objetivo", en: "Your goal", fr: "Ton objectif", it: "Il tuo obiettivo", pt: "O teu objetivo" },
  "perfil.p3.desc":        { es: "¿Qué quieres conseguir?", en: "What do you want to achieve?", fr: "Que veux-tu accomplir ?", it: "Cosa vuoi ottenere?", pt: "O que queres alcançar?" },
  "perfil.obj_label":      { es: "Objetivo principal", en: "Main goal", fr: "Objectif principal", it: "Obiettivo principale", pt: "Objetivo principal" },
  "perfil.obj.lose_fat":   { es: "Perder grasa", en: "Lose fat", fr: "Perdre de la graisse", it: "Perdere grasso", pt: "Perder gordura" },
  "perfil.obj.maintain":   { es: "Mantener peso", en: "Maintain weight", fr: "Maintenir le poids", it: "Mantenere il peso", pt: "Manter peso" },
  "perfil.obj.gain_muscle":{ es: "Ganar músculo", en: "Gain muscle", fr: "Prendre du muscle", it: "Aumentare i muscoli", pt: "Ganhar músculo" },
  "perfil.obj.gain_weight":{ es: "Subir de peso", en: "Gain weight", fr: "Prendre du poids", it: "Aumentare di peso", pt: "Ganhar peso" },
  "perfil.obj.performance":{ es: "Mejorar rendimiento", en: "Improve performance", fr: "Améliorer la performance", it: "Migliorare le prestazioni", pt: "Melhorar o desempenho" },
  "perfil.obj.custom":     { es: "Personalizado", en: "Custom", fr: "Personnalisé", it: "Personalizzato", pt: "Personalizado" },
  "perfil.ritmo":          { es: "Ritmo", en: "Pace", fr: "Rythme", it: "Ritmo", pt: "Ritmo" },
  "perfil.ritmo.conservative": { es: "Conservador (lento y constante)", en: "Conservative (slow and steady)", fr: "Conservateur (lent et constant)", it: "Conservativo (lento e costante)", pt: "Conservador (lento e constante)" },
  "perfil.ritmo.normal":   { es: "Normal (equilibrado)", en: "Normal (balanced)", fr: "Normal (équilibré)", it: "Normale (equilibrato)", pt: "Normal (equilibrado)" },
  "perfil.ritmo.aggressive": { es: "Agresivo (resultados más rápidos)", en: "Aggressive (faster results)", fr: "Agressif (résultats plus rapides)", it: "Aggressivo (risultati più rapidi)", pt: "Agressivo (resultados mais rápidos)" },
  "perfil.info_cal":       { es: "Las calorías diarias estimadas se mostrarán en tu panel de inicio.", en: "Your estimated daily calories will be shown on your home dashboard.", fr: "Tes calories quotidiennes estimées s'afficheront sur ton tableau de bord.", it: "Le calorie giornaliere stimate verranno mostrate nella tua schermata Home.", pt: "As calorias diárias estimadas serão mostradas no teu painel inicial." },
  "perfil.p4.titulo":      { es: "Preferencias", en: "Preferences", fr: "Préférences", it: "Preferenze", pt: "Preferências" },
  "perfil.p4.desc":        { es: "Opcional: dieta y restricciones alimentarias", en: "Optional: diet and food restrictions", fr: "Facultatif : régime et restrictions alimentaires", it: "Opzionale: dieta e restrizioni alimentari", pt: "Opcional: dieta e restrições alimentares" },
  "perfil.dieta_label":    { es: "Preferencia de dieta (opcional)", en: "Diet preference (optional)", fr: "Préférence alimentaire (facultatif)", it: "Preferenza dietetica (opzionale)", pt: "Preferência de dieta (opcional)" },
  "perfil.alergias":       { es: "Alergias o alimentos a evitar (opcional)", en: "Allergies or foods to avoid (optional)", fr: "Allergies ou aliments à éviter (facultatif)", it: "Allergie o alimenti da evitare (opzionale)", pt: "Alergias ou alimentos a evitar (opcional)" },
  "perfil.alergias_ph":    { es: "ej. gluten, lácteos, frutos secos, marisco", en: "e.g. gluten, dairy, nuts, shellfish", fr: "ex. gluten, produits laitiers, fruits à coque, fruits de mer", it: "es. glutine, latticini, frutta secca, crostacei", pt: "ex. glúten, laticínios, frutos secos, marisco" },
  "perfil.alergias_pista": { es: "La IA lo tendrá en cuenta al analizar tus comidas.", en: "The AI will take this into account when analyzing your meals.", fr: "L'IA en tiendra compte lors de l'analyse de tes repas.", it: "L'IA ne terrà conto durante l'analisi dei tuoi pasti.", pt: "A IA terá isto em conta ao analisar as tuas refeições." },

  // ── Dietas (opciones reutilizables) ──
  "dieta.none":            { es: "Ninguna", en: "None", fr: "Aucune", it: "Nessuna", pt: "Nenhuma" },
  "dieta.none_crear":      { es: "Sin restricción", en: "No restriction", fr: "Sans restriction", it: "Nessuna restrizione", pt: "Sem restrição" },
  "dieta.high_protein":    { es: "Alta en proteína", en: "High protein", fr: "Riche en protéines", it: "Ad alto contenuto proteico", pt: "Rica em proteína" },
  "dieta.low_carb":        { es: "Baja en carbohidratos", en: "Low carb", fr: "Pauvre en glucides", it: "A basso contenuto di carboidrati", pt: "Baixa em hidratos" },
  "dieta.vegetarian":      { es: "Vegetariana", en: "Vegetarian", fr: "Végétarienne", it: "Vegetariana", pt: "Vegetariana" },
  "dieta.vegan":           { es: "Vegana", en: "Vegan", fr: "Végane", it: "Vegana", pt: "Vegana" },
  "dieta.other":           { es: "Otra", en: "Other", fr: "Autre", it: "Altra", pt: "Outra" },

  // ── PreguntaCalorias ──
  "pcal.pregunta":         { es: "¿Conoces los valores nutricionales de este alimento?", en: "Do you know the nutritional values of this food?", fr: "Connais-tu les valeurs nutritionnelles de cet aliment ?", it: "Conosci i valori nutrizionali di questo alimento?", pt: "Sabes os valores nutricionais deste alimento?" },
  "pcal.no":               { es: "No", en: "No", fr: "Non", it: "No", pt: "Não" },
  "pcal.si":               { es: "Sí", en: "Yes", fr: "Oui", it: "Sì", pt: "Sim" },
  "pcal.opcionales":       { es: "Todos los campos son opcionales. Rellena solo los que conozcas.", en: "All fields are optional. Fill in only the ones you know.", fr: "Tous les champs sont facultatifs. Remplis seulement ceux que tu connais.", it: "Tutti i campi sono opzionali. Compila solo quelli che conosci.", pt: "Todos os campos são opcionais. Preenche só os que souberes." },
  "pcal.calorias":         { es: "Calorías (kcal)", en: "Calories (kcal)", fr: "Calories (kcal)", it: "Calorie (kcal)", pt: "Calorias (kcal)" },
  "pcal.cal_ph":           { es: "ej. 450", en: "e.g. 450", fr: "ex. 450", it: "es. 450", pt: "ex. 450" },
  "pcal.prot":             { es: "Proteína (g)", en: "Protein (g)", fr: "Protéines (g)", it: "Proteine (g)", pt: "Proteína (g)" },
  "pcal.prot_ph":          { es: "ej. 30", en: "e.g. 30", fr: "ex. 30", it: "es. 30", pt: "ex. 30" },
  "pcal.carb":             { es: "Carbos (g)", en: "Carbs (g)", fr: "Glucides (g)", it: "Carboidrati (g)", pt: "Hidratos (g)" },
  "pcal.carb_ph":          { es: "ej. 50", en: "e.g. 50", fr: "ex. 50", it: "es. 50", pt: "ex. 50" },
  "pcal.fat":              { es: "Grasa (g)", en: "Fat (g)", fr: "Lipides (g)", it: "Grassi (g)", pt: "Gordura (g)" },
  "pcal.fat_ph":           { es: "ej. 15", en: "e.g. 15", fr: "ex. 15", it: "es. 15", pt: "ex. 15" },
  "pcal.definitivos":      { es: "Los valores que introduzcas serán definitivos. La IA solo estimará los que dejes vacíos.", en: "The values you enter will be final. The AI will only estimate the ones you leave empty.", fr: "Les valeurs que tu saisis seront définitives. L'IA n'estimera que celles laissées vides.", it: "I valori che inserisci saranno definitivi. L'IA stimerà solo quelli lasciati vuoti.", pt: "Os valores que introduzires serão definitivos. A IA só estimará os que deixares vazios." },

  // ── Analizar ──
  "analizar.titulo":       { es: "Analizar comida", en: "Analyze meal", fr: "Analyser un repas", it: "Analizza pasto", pt: "Analisar refeição" },
  "analizar.sub_foto":     { es: "Sube o haz una foto de tu plato", en: "Upload or take a photo of your dish", fr: "Envoie ou prends une photo de ton plat", it: "Carica o scatta una foto del tuo piatto", pt: "Envia ou tira uma foto do teu prato" },
  "analizar.sub_texto":    { es: "Describe la comida con texto", en: "Describe the meal with text", fr: "Décris le repas par du texte", it: "Descrivi il pasto con del testo", pt: "Descreve a refeição com texto" },
  "analizar.sub_despensa": { es: "Usa lo que tienes en casa", en: "Use what you have at home", fr: "Utilise ce que tu as à la maison", it: "Usa ciò che hai in casa", pt: "Usa o que tens em casa" },
  "analizar.tab_foto":     { es: "📷 Foto", en: "📷 Photo", fr: "📷 Photo", it: "📷 Foto", pt: "📷 Foto" },
  "analizar.tab_texto":    { es: "✏️ Texto", en: "✏️ Text", fr: "✏️ Texte", it: "✏️ Testo", pt: "✏️ Texto" },
  "analizar.tab_despensa": { es: "🧺 Despensa", en: "🧺 Pantry", fr: "🧺 Placard", it: "🧺 Dispensa", pt: "🧺 Despensa" },
  "analizar.add_foto":     { es: "Añade una foto de tu plato", en: "Add a photo of your dish", fr: "Ajoute une photo de ton plat", it: "Aggiungi una foto del tuo piatto", pt: "Adiciona uma foto do teu prato" },
  "analizar.formatos":     { es: "JPEG, PNG, HEIC hasta 20 MB", en: "JPEG, PNG, HEIC up to 20 MB", fr: "JPEG, PNG, HEIC jusqu'à 20 Mo", it: "JPEG, PNG, HEIC fino a 20 MB", pt: "JPEG, PNG, HEIC até 20 MB" },
  "analizar.camara":       { es: "Cámara", en: "Camera", fr: "Appareil photo", it: "Fotocamera", pt: "Câmara" },
  "analizar.galeria":      { es: "Galería", en: "Gallery", fr: "Galerie", it: "Galleria", pt: "Galeria" },
  "analizar.quitar_foto":  { es: "Quitar foto", en: "Remove photo", fr: "Retirer la photo", it: "Rimuovi foto", pt: "Remover foto" },
  "analizar.alt_comida":   { es: "Comida", en: "Meal", fr: "Repas", it: "Pasto", pt: "Refeição" },
  "analizar.alt_despensa": { es: "Despensa", en: "Pantry", fr: "Placard", it: "Dispensa", pt: "Despensa" },
  "analizar.detalles":     { es: "Detalles (opcional)", en: "Details (optional)", fr: "Détails (facultatif)", it: "Dettagli (opzionale)", pt: "Detalhes (opcional)" },
  "analizar.detalles_ph":  { es: "Opcional: añade detalles sobre los ingredientes, cantidades, salsas, bebidas o cualquier cosa que no se vea claramente en la foto.", en: "Optional: add details about ingredients, amounts, sauces, drinks or anything not clearly visible in the photo.", fr: "Facultatif : ajoute des détails sur les ingrédients, quantités, sauces, boissons ou tout ce qui n'est pas clairement visible sur la photo.", it: "Opzionale: aggiungi dettagli su ingredienti, quantità, salse, bevande o qualsiasi cosa non ben visibile nella foto.", pt: "Opcional: adiciona detalhes sobre ingredientes, quantidades, molhos, bebidas ou algo que não se veja bem na foto." },
  "analizar.detalles_ej":  { es: "Ejemplos: \"con aceite de oliva\", \"arroz ~200g\", \"pollo debajo de la salsa\", \"bebida sin azúcar\"", en: "Examples: \"with olive oil\", \"rice ~200g\", \"chicken under the sauce\", \"sugar-free drink\"", fr: "Exemples : « avec de l'huile d'olive », « riz ~200 g », « poulet sous la sauce », « boisson sans sucre »", it: "Esempi: \"con olio d'oliva\", \"riso ~200g\", \"pollo sotto la salsa\", \"bevanda senza zucchero\"", pt: "Exemplos: \"com azeite\", \"arroz ~200g\", \"frango debaixo do molho\", \"bebida sem açúcar\"" },
  "analizar.desc_label":   { es: "Describe la comida", en: "Describe the meal", fr: "Décris le repas", it: "Descrivi il pasto", pt: "Descreve a refeição" },
  "analizar.desc_ph":      { es: "Ej: 200g de arroz blanco cocido con 150g de pollo a la plancha y ensalada mixta con aceite de oliva", en: "E.g.: 200g cooked white rice with 150g grilled chicken and mixed salad with olive oil", fr: "Ex. : 200 g de riz blanc cuit avec 150 g de poulet grillé et salade mixte à l'huile d'olive", it: "Es: 200g di riso bianco cotto con 150g di pollo alla griglia e insalata mista con olio d'oliva", pt: "Ex: 200g de arroz branco cozido com 150g de frango grelhado e salada mista com azeite" },
  "analizar.desc_ej":      { es: "Cuanto más detallada sea la descripción (ingredientes, cantidades, método de cocción), más preciso será el resultado.", en: "The more detailed the description (ingredients, amounts, cooking method), the more accurate the result.", fr: "Plus la description est détaillée (ingrédients, quantités, mode de cuisson), plus le résultat est précis.", it: "Più la descrizione è dettagliata (ingredienti, quantità, metodo di cottura), più preciso sarà il risultato.", pt: "Quanto mais detalhada for a descrição (ingredientes, quantidades, método de cozedura), mais preciso será o resultado." },
  "analizar.despensa_label": { es: "¿Qué tienes en casa?", en: "What do you have at home?", fr: "Qu'as-tu à la maison ?", it: "Cosa hai in casa?", pt: "O que tens em casa?" },
  "analizar.despensa_ph":  { es: "Ej: pechuga de pollo, arroz, tomate, cebolla, huevos, atún en lata, pasta...", en: "E.g.: chicken breast, rice, tomato, onion, eggs, canned tuna, pasta...", fr: "Ex. : blanc de poulet, riz, tomate, oignon, œufs, thon en boîte, pâtes…", it: "Es: petto di pollo, riso, pomodoro, cipolla, uova, tonno in scatola, pasta...", pt: "Ex: peito de frango, arroz, tomate, cebola, ovos, atum enlatado, massa..." },
  "analizar.despensa_ej":  { es: "También puedes añadir (o sustituir) con una foto de tu lista de la compra o tu despensa.", en: "You can also add (or replace) with a photo of your shopping list or pantry.", fr: "Tu peux aussi ajouter (ou remplacer) par une photo de ta liste de courses ou de ton placard.", it: "Puoi anche aggiungere (o sostituire) con una foto della tua lista della spesa o della dispensa.", pt: "Também podes adicionar (ou substituir) com uma foto da tua lista de compras ou despensa." },
  "analizar.buscando":     { es: "Buscando ideas...", en: "Looking for ideas...", fr: "Recherche d'idées…", it: "Cerco idee...", pt: "A procurar ideias..." },
  "analizar.analizando":   { es: "Analizando...", en: "Analyzing...", fr: "Analyse…", it: "Analisi in corso...", pt: "A analisar..." },
  "analizar.generar_sug":  { es: "Generar sugerencias", en: "Generate suggestions", fr: "Générer des suggestions", it: "Genera suggerimenti", pt: "Gerar sugestões" },
  "analizar.analizar_ia":  { es: "Analizar con IA", en: "Analyze with AI", fr: "Analyser avec l'IA", it: "Analizza con l'IA", pt: "Analisar com IA" },
  "analizar.err_titulo":   { es: "Error en el análisis", en: "Analysis error", fr: "Erreur d'analyse", it: "Errore nell'analisi", pt: "Erro na análise" },
  "analizar.err_imagen":   { es: "No se pudo procesar la imagen.", en: "Couldn't process the image.", fr: "Impossible de traiter l'image.", it: "Impossibile elaborare l'immagine.", pt: "Não foi possível processar a imagem." },
  "analizar.err_sug":      { es: "No se han podido generar sugerencias. Intenta con más detalle.", en: "Couldn't generate suggestions. Try adding more detail.", fr: "Impossible de générer des suggestions. Essaie avec plus de détails.", it: "Impossibile generare suggerimenti. Prova con più dettagli.", pt: "Não foi possível gerar sugestões. Tenta com mais detalhe." },
  "analizar.err_generico": { es: "Análisis fallido. Comprueba tu conexión e inténtalo de nuevo.", en: "Analysis failed. Check your connection and try again.", fr: "Échec de l'analyse. Vérifie ta connexion et réessaie.", it: "Analisi non riuscita. Controlla la connessione e riprova.", pt: "Análise falhou. Verifica a tua ligação e tenta de novo." },
  "analizar.footer":       { es: "Las estimaciones son aproximadas. No es un dispositivo médico.", en: "Estimates are approximate. This is not a medical device.", fr: "Les estimations sont approximatives. Ce n'est pas un dispositif médical.", it: "Le stime sono approssimative. Non è un dispositivo medico.", pt: "As estimativas são aproximadas. Não é um dispositivo médico." },

  // ── Resultado ──
  "resultado.total_cal":   { es: "Total calorías", en: "Total calories", fr: "Calories totales", it: "Calorie totali", pt: "Calorias totais" },
  "resultado.info_extra":  { es: "Información adicional", en: "Additional information", fr: "Informations complémentaires", it: "Informazioni aggiuntive", pt: "Informação adicional" },
  "resultado.fibra":       { es: "Fibra", en: "Fiber", fr: "Fibres", it: "Fibre", pt: "Fibra" },
  "resultado.azucar":      { es: "Azúcar", en: "Sugar", fr: "Sucre", it: "Zucchero", pt: "Açúcar" },
  "resultado.sodio":       { es: "Sodio", en: "Sodium", fr: "Sodium", it: "Sodio", pt: "Sódio" },
  "resultado.detectados":  { es: "Alimentos detectados", en: "Detected foods", fr: "Aliments détectés", it: "Alimenti rilevati", pt: "Alimentos detetados" },
  "resultado.pulsa_edit":  { es: "Pulsa ✏️ para editar", en: "Tap ✏️ to edit", fr: "Appuie sur ✏️ pour modifier", it: "Tocca ✏️ per modificare", pt: "Toca ✏️ para editar" },
  "resultado.edit_nombre": { es: "Alimento (opcional — deja vacío para mantener)", en: "Food (optional — leave empty to keep)", fr: "Aliment (facultatif — laisse vide pour garder)", it: "Alimento (opzionale — lascia vuoto per mantenere)", pt: "Alimento (opcional — deixa vazio para manter)" },
  "resultado.edit_cant":   { es: "Cantidad (opcional — deja vacío para mantener)", en: "Amount (optional — leave empty to keep)", fr: "Quantité (facultatif — laisse vide pour garder)", it: "Quantità (opzionale — lascia vuoto per mantenere)", pt: "Quantidade (opcional — deixa vazio para manter)" },
  "resultado.cant_ph":     { es: "ej. 200g, 1 taza, 2 unidades", en: "e.g. 200g, 1 cup, 2 units", fr: "ex. 200 g, 1 tasse, 2 unités", it: "es. 200g, 1 tazza, 2 unità", pt: "ex. 200g, 1 chávena, 2 unidades" },
  "resultado.confirmar":   { es: "Confirmar", en: "Confirm", fr: "Confirmer", it: "Conferma", pt: "Confirmar" },
  "resultado.cancelar":    { es: "Cancelar", en: "Cancel", fr: "Annuler", it: "Annulla", pt: "Cancelar" },
  "resultado.elim_alim":   { es: "Eliminar alimento", en: "Delete food", fr: "Supprimer l'aliment", it: "Elimina alimento", pt: "Eliminar alimento" },
  "resultado.edit_alim":   { es: "Editar alimento", en: "Edit food", fr: "Modifier l'aliment", it: "Modifica alimento", pt: "Editar alimento" },
  "resultado.reanalizando":{ es: "Reanalizando...", en: "Re-analyzing...", fr: "Réanalyse…", it: "Nuova analisi...", pt: "A reanalisar..." },
  "resultado.reanalizar":  { es: "Reanalizar con estas correcciones", en: "Re-analyze with these corrections", fr: "Réanalyser avec ces corrections", it: "Rianalizza con queste correzioni", pt: "Reanalisar com estas correções" },
  "resultado.err_re":      { es: "Reanálisis fallido. Inténtalo de nuevo.", en: "Re-analysis failed. Try again.", fr: "Échec de la réanalyse. Réessaie.", it: "Nuova analisi non riuscita. Riprova.", pt: "Reanálise falhou. Tenta de novo." },
  "resultado.notas_inc":   { es: "Notas de incertidumbre", en: "Uncertainty notes", fr: "Notes d'incertitude", it: "Note di incertezza", pt: "Notas de incerteza" },
  "resultado.consejos":    { es: "Consejos para más precisión", en: "Tips for more accuracy", fr: "Conseils pour plus de précision", it: "Consigli per maggiore precisione", pt: "Conselhos para mais precisão" },
  "resultado.notas_salud": { es: "Notas de salud", en: "Health notes", fr: "Notes de santé", it: "Note sulla salute", pt: "Notas de saúde" },
  "resultado.guardar":     { es: "Guardar en el registro", en: "Save to log", fr: "Enregistrer au journal", it: "Salva nel diario", pt: "Guardar no registo" },
  "resultado.nueva":       { es: "Nueva comida", en: "New meal", fr: "Nouveau repas", it: "Nuovo pasto", pt: "Nova refeição" },

  // ── Crear ──
  "crear.titulo":          { es: "Crear comida", en: "Create meal", fr: "Créer un repas", it: "Crea pasto", pt: "Criar refeição" },
  "crear.sub":             { es: "Elige lo que te apetece y te propongo varias ideas", en: "Choose what you fancy and I'll suggest a few ideas", fr: "Choisis ce qui te tente et je te propose plusieurs idées", it: "Scegli ciò che ti va e ti propongo alcune idee", pt: "Escolhe o que te apetece e proponho-te várias ideias" },
  "crear.modo_pref":       { es: "🍽️ Preferencias", en: "🍽️ Preferences", fr: "🍽️ Préférences", it: "🍽️ Preferenze", pt: "🍽️ Preferências" },
  "crear.modo_despensa":   { es: "🧺 Despensa", en: "🧺 Pantry", fr: "🧺 Placard", it: "🧺 Dispensa", pt: "🧺 Despensa" },
  "crear.tipo_comida":     { es: "Tipo de comida", en: "Meal type", fr: "Type de repas", it: "Tipo di pasto", pt: "Tipo de refeição" },
  "crear.desayuno":        { es: "Desayuno", en: "Breakfast", fr: "Petit-déjeuner", it: "Colazione", pt: "Pequeno-almoço" },
  "crear.comida":          { es: "Comida", en: "Lunch", fr: "Déjeuner", it: "Pranzo", pt: "Almoço" },
  "crear.cena":            { es: "Cena", en: "Dinner", fr: "Dîner", it: "Cena", pt: "Jantar" },
  "crear.ligera_pesada":   { es: "¿Ligera o pesada?", en: "Light or heavy?", fr: "Léger ou copieux ?", it: "Leggero o pesante?", pt: "Leve ou pesada?" },
  "crear.ligera":          { es: "Ligera", en: "Light", fr: "Léger", it: "Leggero", pt: "Leve" },
  "crear.pesada":          { es: "Pesada", en: "Heavy", fr: "Copieux", it: "Pesante", pt: "Pesada" },
  "crear.tipo_dieta":      { es: "Tipo de dieta", en: "Diet type", fr: "Type de régime", it: "Tipo di dieta", pt: "Tipo de dieta" },
  "crear.evitar":          { es: "Ingredientes a evitar (opcional)", en: "Ingredients to avoid (optional)", fr: "Ingrédients à éviter (facultatif)", it: "Ingredienti da evitare (opzionale)", pt: "Ingredientes a evitar (opcional)" },
  "crear.generando":       { es: "Generando ideas...", en: "Generating ideas...", fr: "Génération d'idées…", it: "Generazione idee...", pt: "A gerar ideias..." },
  "crear.generar":         { es: "Generar ideas", en: "Generate ideas", fr: "Générer des idées", it: "Genera idee", pt: "Gerar ideias" },
  "crear.err":             { es: "No se han podido generar ideas. Inténtalo de nuevo.", en: "Couldn't generate ideas. Try again.", fr: "Impossible de générer des idées. Réessaie.", it: "Impossibile generare idee. Riprova.", pt: "Não foi possível gerar ideias. Tenta de novo." },
  "crear.footer":          { es: "Las cantidades son una estimación, no una garantía exacta.", en: "Amounts are an estimate, not an exact guarantee.", fr: "Les quantités sont une estimation, pas une garantie exacte.", it: "Le quantità sono una stima, non una garanzia esatta.", pt: "As quantidades são uma estimativa, não uma garantia exata." },
  "crear.despensa_vacia":  { es: "Escribe algún ingrediente o añade una foto de tu despensa.", en: "Type an ingredient or add a photo of your pantry.", fr: "Saisis un ingrédient ou ajoute une photo de ton placard.", it: "Scrivi un ingrediente o aggiungi una foto della dispensa.", pt: "Escreve um ingrediente ou adiciona uma foto da tua despensa." },
  "crear.opciones_titulo": { es: "Ideas para ti", en: "Ideas for you", fr: "Idées pour toi", it: "Idee per te", pt: "Ideias para ti" },
  "crear.opciones_sub":    { es: "Pulsa \"Seleccionar\" para ver ingredientes y pasos", en: "Tap \"Select\" to see ingredients and steps", fr: "Appuie sur « Sélectionner » pour voir les ingrédients et les étapes", it: "Tocca \"Seleziona\" per vedere ingredienti e passaggi", pt: "Toca em \"Selecionar\" para ver ingredientes e passos" },
  "crear.seleccionar":     { es: "Seleccionar", en: "Select", fr: "Sélectionner", it: "Seleziona", pt: "Selecionar" },
  "crear.mas_ideas":       { es: "Generar otras ideas", en: "Generate other ideas", fr: "Générer d'autres idées", it: "Genera altre idee", pt: "Gerar outras ideias" },
  "crear.ingredientes":    { es: "Ingredientes", en: "Ingredients", fr: "Ingrédients", it: "Ingredienti", pt: "Ingredientes" },
  "crear.pasos":           { es: "Paso a paso", en: "Step by step", fr: "Étape par étape", it: "Passo dopo passo", pt: "Passo a passo" },
  "crear.guardar_comida":  { es: "Guardar comida", en: "Save meal", fr: "Enregistrer le repas", it: "Salva pasto", pt: "Guardar refeição" },
  "crear.volver_ideas":    { es: "Volver a las ideas", en: "Back to ideas", fr: "Retour aux idées", it: "Torna alle idee", pt: "Voltar às ideias" },
  "crear.ing.lacteos":     { es: "Lácteos", en: "Dairy", fr: "Produits laitiers", it: "Latticini", pt: "Laticínios" },
  "crear.ing.marisco":     { es: "Marisco", en: "Shellfish", fr: "Fruits de mer", it: "Crostacei", pt: "Marisco" },
  "crear.ing.cerdo":       { es: "Cerdo", en: "Pork", fr: "Porc", it: "Maiale", pt: "Porco" },
  "crear.ing.ternera":     { es: "Ternera", en: "Beef", fr: "Bœuf", it: "Manzo", pt: "Vaca" },
  "crear.ing.pollo":       { es: "Pollo", en: "Chicken", fr: "Poulet", it: "Pollo", pt: "Frango" },
  "crear.ing.pescado":     { es: "Pescado", en: "Fish", fr: "Poisson", it: "Pesce", pt: "Peixe" },
  "crear.ing.huevo":       { es: "Huevo", en: "Egg", fr: "Œuf", it: "Uovo", pt: "Ovo" },
  "crear.ing.gluten":      { es: "Gluten", en: "Gluten", fr: "Gluten", it: "Glutine", pt: "Glúten" },
  "crear.ing.picante":     { es: "Picante", en: "Spicy", fr: "Épicé", it: "Piccante", pt: "Picante" },
  "crear.ing.frutos_secos":{ es: "Frutos secos", en: "Nuts", fr: "Fruits à coque", it: "Frutta secca", pt: "Frutos secos" },
  "crear.ing.legumbres":   { es: "Legumbres", en: "Legumes", fr: "Légumineuses", it: "Legumi", pt: "Leguminosas" },
  "crear.ing.setas":       { es: "Setas", en: "Mushrooms", fr: "Champignons", it: "Funghi", pt: "Cogumelos" },

  // ── Clarificación ──
  "clarif.titulo":         { es: "Necesitamos tu ayuda", en: "We need your help", fr: "Nous avons besoin de ton aide", it: "Abbiamo bisogno del tuo aiuto", pt: "Precisamos da tua ajuda" },
  "clarif.sub":            { es: "La IA no está segura sobre esta comida", en: "The AI isn't sure about this meal", fr: "L'IA n'est pas sûre de ce repas", it: "L'IA non è sicura di questo pasto", pt: "A IA não tem a certeza sobre esta refeição" },
  "clarif.conf_baja":      { es: "Confianza baja en el análisis", en: "Low confidence in the analysis", fr: "Faible confiance dans l'analyse", it: "Bassa affidabilità nell'analisi", pt: "Baixa confiança na análise" },
  "clarif.mejora":         { es: "Añadir más detalles mejorará significativamente la precisión de las estimaciones nutricionales.", en: "Adding more detail will significantly improve the accuracy of the nutritional estimates.", fr: "Ajouter plus de détails améliorera nettement la précision des estimations nutritionnelles.", it: "Aggiungere più dettagli migliorerà notevolmente la precisione delle stime nutrizionali.", pt: "Adicionar mais detalhes vai melhorar significativamente a precisão das estimativas nutricionais." },
  "clarif.inciertos":      { es: "Alimentos con incertidumbre", en: "Uncertain foods", fr: "Aliments incertains", it: "Alimenti incerti", pt: "Alimentos incertos" },
  "clarif.pregunta":       { es: "La IA pregunta", en: "The AI asks", fr: "L'IA demande", it: "L'IA chiede", pt: "A IA pergunta" },
  "clarif.aclaracion":     { es: "Tu aclaración", en: "Your clarification", fr: "Ta précision", it: "Il tuo chiarimento", pt: "O teu esclarecimento" },
  "clarif.aclaracion_ph":  { es: "Describe los alimentos que no se ven bien, las cantidades aproximadas, el tipo de cocción, salsas, aceites, bebidas...", en: "Describe the foods that aren't clear, approximate amounts, cooking type, sauces, oils, drinks...", fr: "Décris les aliments peu visibles, les quantités approximatives, le mode de cuisson, sauces, huiles, boissons…", it: "Descrivi gli alimenti poco visibili, le quantità approssimative, il tipo di cottura, salse, oli, bevande...", pt: "Descreve os alimentos que não se veem bem, as quantidades aproximadas, o tipo de cozedura, molhos, óleos, bebidas..." },
  "clarif.aclaracion_ej":  { es: "Ejemplos: \"es tortilla de patata\", \"lleva aceite de oliva y queso\", \"la ración es pequeña, unos 150g\"", en: "Examples: \"it's a Spanish omelette\", \"it has olive oil and cheese\", \"the portion is small, about 150g\"", fr: "Exemples : « c'est une tortilla de pommes de terre », « avec huile d'olive et fromage », « petite portion, environ 150 g »", it: "Esempi: \"è una frittata di patate\", \"ha olio d'oliva e formaggio\", \"la porzione è piccola, circa 150g\"", pt: "Exemplos: \"é tortilha de batata\", \"leva azeite e queijo\", \"a porção é pequena, uns 150g\"" },
  "clarif.err":            { es: "Reanálisis fallido. Inténtalo de nuevo.", en: "Re-analysis failed. Try again.", fr: "Échec de la réanalyse. Réessaie.", it: "Nuova analisi non riuscita. Riprova.", pt: "Reanálise falhou. Tenta de novo." },
  "clarif.reanalizando":   { es: "Reanalizando con tu información...", en: "Re-analyzing with your info...", fr: "Réanalyse avec tes informations…", it: "Nuova analisi con le tue info...", pt: "A reanalisar com a tua informação..." },
  "clarif.reanalizar":     { es: "Reanalizar con esta información", en: "Re-analyze with this info", fr: "Réanalyser avec ces informations", it: "Rianalizza con queste info", pt: "Reanalisar com esta informação" },
  "clarif.usar_actual":    { es: "Usar estimación actual sin clarificar", en: "Use current estimate without clarifying", fr: "Utiliser l'estimation actuelle sans préciser", it: "Usa la stima attuale senza chiarire", pt: "Usar estimativa atual sem esclarecer" },
  "clarif.footer":         { es: "Cuanto más detallada sea tu descripción, más preciso será el resultado.", en: "The more detailed your description, the more accurate the result.", fr: "Plus ta description est détaillée, plus le résultat est précis.", it: "Più la tua descrizione è dettagliata, più preciso sarà il risultato.", pt: "Quanto mais detalhada for a tua descrição, mais preciso será o resultado." },

  // ── Sugerencias ──
  "suger.titulo":          { es: "Ideas con tu despensa", en: "Ideas from your pantry", fr: "Idées avec ton placard", it: "Idee con la tua dispensa", pt: "Ideias com a tua despensa" },
  "suger.sub":             { es: "Elige una receta para ver el detalle", en: "Choose a recipe to see the details", fr: "Choisis une recette pour voir le détail", it: "Scegli una ricetta per vedere il dettaglio", pt: "Escolhe uma receita para ver o detalhe" },
  "suger.footer":          { es: "Podrás editar los ingredientes y las cantidades antes de guardar.", en: "You'll be able to edit ingredients and amounts before saving.", fr: "Tu pourras modifier les ingrédients et les quantités avant d'enregistrer.", it: "Potrai modificare ingredienti e quantità prima di salvare.", pt: "Poderás editar os ingredientes e as quantidades antes de guardar." },

  // ── Registro (pantalla) ──
  "registro.titulo":       { es: "Registro de hoy", en: "Today's log", fr: "Journal du jour", it: "Diario di oggi", pt: "Registo de hoje" },
  "registro.importar":     { es: "Importar", en: "Import", fr: "Importer", it: "Importa", pt: "Importar" },
  "registro.exportar":     { es: "Exportar", en: "Export", fr: "Exporter", it: "Esporta", pt: "Exportar" },
  "registro.importado":    { es: "Datos importados correctamente. Recargando...", en: "Data imported successfully. Reloading...", fr: "Données importées avec succès. Rechargement…", it: "Dati importati correttamente. Ricaricamento...", pt: "Dados importados com sucesso. A recarregar..." },
  "registro.err_perfil":   { es: "El archivo no contiene un perfil válido de NutriAI.", en: "The file doesn't contain a valid NutriAI profile.", fr: "Le fichier ne contient pas de profil NutriAI valide.", it: "Il file non contiene un profilo NutriAI valido.", pt: "O ficheiro não contém um perfil NutriAI válido." },
  "registro.err_invalido": { es: "Archivo inválido.", en: "Invalid file.", fr: "Fichier invalide.", it: "File non valido.", pt: "Ficheiro inválido." },
  "registro.totales":      { es: "Totales del día", en: "Daily totals", fr: "Totaux du jour", it: "Totali del giorno", pt: "Totais do dia" },
  "registro.calorias":     { es: "Calorías", en: "Calories", fr: "Calories", it: "Calorie", pt: "Calorias" },
  "registro.objetivo_suf": { es: "objetivo", en: "goal", fr: "objectif", it: "obiettivo", pt: "objetivo" },
  "registro.comidas_n":    { es: "Comidas ({n})", en: "Meals ({n})", fr: "Repas ({n})", it: "Pasti ({n})", pt: "Refeições ({n})" },
  "registro.sin_comidas":  { es: "Sin comidas registradas hoy", en: "No meals logged today", fr: "Aucun repas enregistré aujourd'hui", it: "Nessun pasto registrato oggi", pt: "Sem refeições registadas hoje" },
  "registro.elim_comida":  { es: "Eliminar comida", en: "Delete meal", fr: "Supprimer le repas", it: "Elimina pasto", pt: "Eliminar refeição" },

  // ── Datos generados (nombres por defecto de comidas) ──
  "data.comida_manual":    { es: "Comida manual", en: "Manual meal", fr: "Repas manuel", it: "Pasto manuale", pt: "Refeição manual" },
  "data.manual_summary":   { es: "Valores introducidos manualmente por el usuario.", en: "Values entered manually by the user.", fr: "Valeurs saisies manuellement par l'utilisateur.", it: "Valori inseriti manualmente dall'utente.", pt: "Valores introduzidos manualmente pelo utilizador." },
  "data.manual_health":    { es: "Valores introducidos manualmente. Sin análisis de imagen.", en: "Values entered manually. No image analysis.", fr: "Valeurs saisies manuellement. Sans analyse d'image.", it: "Valori inseriti manualmente. Senza analisi dell'immagine.", pt: "Valores introduzidos manualmente. Sem análise de imagem." },
  "data.comida_desconocida":{ es: "Comida desconocida", en: "Unknown meal", fr: "Repas inconnu", it: "Pasto sconosciuto", pt: "Refeição desconhecida" },
  "data.despensa":         { es: "Despensa", en: "Pantry", fr: "Placard", it: "Dispensa", pt: "Despensa" },
  "data.receta_foto":      { es: "Receta generada a partir de una foto de la despensa", en: "Recipe generated from a pantry photo", fr: "Recette générée à partir d'une photo du placard", it: "Ricetta generata da una foto della dispensa", pt: "Receita gerada a partir de uma foto da despensa" },
  "data.comida_creada":    { es: "Comida creada", en: "Created meal", fr: "Repas créé", it: "Pasto creato", pt: "Refeição criada" },
  "data.dieta":            { es: "dieta", en: "diet", fr: "régime", it: "dieta", pt: "dieta" },
  "data.sin":              { es: "sin", en: "without", fr: "sans", it: "senza", pt: "sem" },

  // ── Errores de biblioteca (apiKey/backup/gemini) ──
  "err.clave_invalida":    { es: "La clave no es válida o no tiene permiso. Revisa que la copiaste completa y que es una clave de Gemini (Google AI Studio).", en: "The key is invalid or lacks permission. Check that you copied it in full and that it's a Gemini (Google AI Studio) key.", fr: "La clé est invalide ou n'a pas d'autorisation. Vérifie que tu l'as copiée en entier et qu'il s'agit d'une clé Gemini (Google AI Studio).", it: "La chiave non è valida o non ha i permessi. Controlla di averla copiata per intero e che sia una chiave Gemini (Google AI Studio).", pt: "A chave é inválida ou não tem permissão. Confirma que a copiaste por completo e que é uma chave Gemini (Google AI Studio)." },
  "err.modelo_inexistente":{ es: "Ese modelo no existe o tu clave no tiene acceso a él. Prueba con otro modelo de la lista.", en: "That model doesn't exist or your key can't access it. Try another model from the list.", fr: "Ce modèle n'existe pas ou ta clé n'y a pas accès. Essaie un autre modèle de la liste.", it: "Quel modello non esiste o la tua chiave non vi ha accesso. Prova un altro modello della lista.", pt: "Esse modelo não existe ou a tua chave não tem acesso. Experimenta outro modelo da lista." },
  "err.sin_cuota":         { es: "La clave no tiene cuota disponible ahora mismo. Espera un momento o revisa tu cuenta de Google AI Studio.", en: "The key has no quota available right now. Wait a moment or check your Google AI Studio account.", fr: "La clé n'a pas de quota disponible pour le moment. Attends un instant ou vérifie ton compte Google AI Studio.", it: "La chiave non ha quota disponibile al momento. Aspetta un momento o controlla il tuo account Google AI Studio.", pt: "A chave não tem quota disponível de momento. Espera um momento ou verifica a tua conta Google AI Studio." },
  "err.sin_conexion":      { es: "No hay conexión con Google. Comprueba tu internet e inténtalo de nuevo.", en: "No connection to Google. Check your internet and try again.", fr: "Pas de connexion à Google. Vérifie ton internet et réessaie.", it: "Nessuna connessione a Google. Controlla la tua connessione e riprova.", pt: "Sem ligação à Google. Verifica a tua internet e tenta de novo." },
  "err.validar_generico":  { es: "No se pudo validar la clave. Inténtalo de nuevo.", en: "Couldn't validate the key. Try again.", fr: "Impossible de valider la clé. Réessaie.", it: "Impossibile convalidare la chiave. Riprova.", pt: "Não foi possível validar a chave. Tenta de novo." },
  "err.falta_clave":       { es: "Falta tu clave de Gemini. Ve a Ajustes y añade tu clave de Google AI Studio.", en: "Your Gemini key is missing. Go to Settings and add your Google AI Studio key.", fr: "Ta clé Gemini est manquante. Va dans Réglages et ajoute ta clé Google AI Studio.", it: "Manca la tua chiave Gemini. Vai in Impostazioni e aggiungi la tua chiave di Google AI Studio.", pt: "Falta a tua chave Gemini. Vai a Definições e adiciona a tua chave do Google AI Studio." },
  "err.respuesta_larga":   { es: "La respuesta se cortó por longitud. Inténtalo de nuevo.", en: "The response was cut off due to length. Try again.", fr: "La réponse a été coupée à cause de sa longueur. Réessaie.", it: "La risposta è stata troncata per lunghezza. Riprova.", pt: "A resposta foi cortada por comprimento. Tenta de novo." },
  "err.sin_resultado":     { es: "Gemini no devolvió ningún resultado. Inténtalo de nuevo.", en: "Gemini returned no result. Try again.", fr: "Gemini n'a renvoyé aucun résultat. Réessaie.", it: "Gemini non ha restituito alcun risultato. Riprova.", pt: "O Gemini não devolveu qualquer resultado. Tenta de novo." },
  "err.no_json":           { es: "La respuesta de la IA no se pudo interpretar. Inténtalo de nuevo.", en: "The AI's response couldn't be parsed. Try again.", fr: "La réponse de l'IA n'a pas pu être interprétée. Réessaie.", it: "Impossibile interpretare la risposta dell'IA. Riprova.", pt: "Não foi possível interpretar a resposta da IA. Tenta de novo." },

  // ── Copia de seguridad (backup.js) ──
  "backup.no_valido":      { es: "Este archivo no es una copia de seguridad de NutriAI válida.", en: "This file isn't a valid NutriAI backup.", fr: "Ce fichier n'est pas une sauvegarde NutriAI valide.", it: "Questo file non è un backup NutriAI valido.", pt: "Este ficheiro não é uma cópia de segurança NutriAI válida." },
  "backup.sin_datos":      { es: "La copia no contenía datos para restaurar.", en: "The backup contained no data to restore.", fr: "La sauvegarde ne contenait aucune donnée à restaurer.", it: "Il backup non conteneva dati da ripristinare.", pt: "A cópia não continha dados para restaurar." },
  "backup.no_json":        { es: "El archivo no es un JSON válido.", en: "The file isn't valid JSON.", fr: "Le fichier n'est pas un JSON valide.", it: "Il file non è un JSON valido.", pt: "O ficheiro não é um JSON válido." },
  "backup.no_parece":      { es: "Este archivo no parece una copia de seguridad de NutriAI.", en: "This file doesn't look like a NutriAI backup.", fr: "Ce fichier ne ressemble pas à une sauvegarde NutriAI.", it: "Questo file non sembra un backup NutriAI.", pt: "Este ficheiro não parece uma cópia de segurança NutriAI." },
  "backup.share_title":    { es: "Copia de seguridad de NutriAI", en: "NutriAI backup", fr: "Sauvegarde NutriAI", it: "Backup di NutriAI", pt: "Cópia de segurança NutriAI" },
  "backup.share_text":     { es: "Guarda este archivo para restaurar tus datos de NutriAI.", en: "Save this file to restore your NutriAI data.", fr: "Enregistre ce fichier pour restaurer tes données NutriAI.", it: "Salva questo file per ripristinare i tuoi dati NutriAI.", pt: "Guarda este ficheiro para restaurar os teus dados NutriAI." },
  "backup.share_dialog":   { es: "Guardar copia de NutriAI", en: "Save NutriAI backup", fr: "Enregistrer la sauvegarde NutriAI", it: "Salva backup di NutriAI", pt: "Guardar cópia NutriAI" },

  // ── Pantalla de error (ErrorBoundary) ──
  "error.titulo":          { es: "Algo ha ido mal", en: "Something went wrong", fr: "Une erreur est survenue", it: "Qualcosa è andato storto", pt: "Algo correu mal" },
  "error.cuerpo":          { es: "NutriAI encontró un error inesperado. Tus datos guardados no se han perdido.", en: "NutriAI hit an unexpected error. Your saved data hasn't been lost.", fr: "NutriAI a rencontré une erreur inattendue. Tes données enregistrées n'ont pas été perdues.", it: "NutriAI ha riscontrato un errore imprevisto. I tuoi dati salvati non sono andati persi.", pt: "O NutriAI encontrou um erro inesperado. Os teus dados guardados não se perderam." },
  "error.reiniciar":       { es: "Reiniciar aplicación", en: "Restart app", fr: "Redémarrer l'application", it: "Riavvia l'app", pt: "Reiniciar aplicação" },

  // ── Comunes ──
  "comun.volver":          { es: "Volver", en: "Back", fr: "Retour", it: "Indietro", pt: "Voltar" },
};

const IdiomaContext = createContext({
  idioma: IDIOMA_POR_DEFECTO,
  locale: LOCALES[IDIOMA_POR_DEFECTO],
  setIdioma: () => {},
  t: (k) => k,
});

export function IdiomaProvider({ children }) {
  const [idioma, setIdiomaState] = useState(IDIOMA_POR_DEFECTO);

  // Mantener la copia de módulo sincronizada para traducir fuera de React.
  useEffect(() => { _idiomaActivo = idioma; }, [idioma]);

  // Carga inicial: idioma guardado; si no hay, el del dispositivo si está soportado.
  useEffect(() => {
    (async () => {
      const guardado = await sg(KEYS.IDIOMA);
      if (guardado && IDIOMAS.some((i) => i.code === guardado)) {
        _idiomaActivo = guardado;
        setIdiomaState(guardado);
        return;
      }
      const nav = (typeof navigator !== "undefined" && navigator.language || "es").slice(0, 2);
      if (IDIOMAS.some((i) => i.code === nav)) { _idiomaActivo = nav; setIdiomaState(nav); }
    })();
  }, []);

  const setIdioma = useCallback((code) => {
    _idiomaActivo = code;
    setIdiomaState(code);
    ss(KEYS.IDIOMA, code);
  }, []);

  const t = useCallback((clave, params) => {
    const entrada = STRINGS[clave];
    let s = entrada ? (entrada[idioma] ?? entrada.es ?? clave) : clave;
    if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
    return s;
  }, [idioma]);

  return (
    <IdiomaContext.Provider value={{ idioma, locale: LOCALES[idioma] || LOCALES.es, setIdioma, t }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export const useIdioma = () => useContext(IdiomaContext);
export const useT = () => useContext(IdiomaContext).t;
