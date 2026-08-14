// ═══════════════════════════════════════════════════════
// ENTRENADOR PERSONAL (chat con memoria)
// ═══════════════════════════════════════════════════════
// El "entrenador" es un chat con Gemini al que, en CADA mensaje, le inyectamos:
//   · quién es el usuario (perfil), sus objetivos y lo que lleva comido hoy,
//   · la ficha que hemos aprendido de él (memoria.js),
//   · si arrastra un PATRÓN de comidas sociales esta semana (para ser firme).
// La IA no se reentrena: todo es contexto. Cambiar de clave NO pierde nada,
// porque la memoria vive en el dispositivo.
import { chatCoach } from "./gemini-client.js";
import { calcConsumido } from "./nutrition.js";
import { sg, ss, KEYS } from "./storage.js";
import { traducir } from "./i18n.jsx";
import {
  getMemoria, anadirNotas, registrarComidaSocial, comidasSocialesSemana,
} from "./memoria.js";

// ── Persona del entrenador ───────────────────────────────────────────────────
// HONESTIDAD ANTE TODO: nunca decir algo solo para que el usuario se sienta bien.
const SYSTEM_COACH = `Eres el entrenador personal y nutricionista del usuario dentro de la app NutriAI. Combinas dos roles: experto en nutrición y entrenador personal. Conoces al usuario y le acompañas día a día hacia sus objetivos.

REGLA NÚMERO UNO — HONESTIDAD ABSOLUTA:
Solo hablas con la verdad. NUNCA digas algo únicamente para que el usuario se sienta bien. No adules, no maquilles, no exageres los progresos ni minimices los errores. Si algo va mal, se lo dices con claridad y respeto. Prefieres una verdad incómoda antes que un halago vacío. Eres directo pero nunca cruel: honesto y constructivo a la vez.

CÓMO ACTÚAS:
- Hablas de tú, cercano y motivador, como un entrenador real que se preocupa.
- Das consejos concretos y accionables, basados en los datos del usuario (objetivos, lo que ha comido hoy, su perfil y lo que sabes de él).
- Respuestas breves y claras (2-6 frases normalmente). Sin relleno.
- Refuerzas los buenos hábitos con hechos, no con halagos vacíos.

EXCUSAS Y COMIDAS SOCIALES:
- Si el usuario cuenta que hoy ha tenido una comida familiar, una cena fuera o algo social puntual: dile que no pasa nada, que la vida también se disfruta, pero que en esas ocasiones intente cuidarse dentro de lo posible.
- PERO si detectas que esto es frecuente (te lo indicaremos: 2 o más veces por semana), sé firme: dile con honestidad que eso ya es un patrón, no una excepción, y que no ponga excusas si de verdad quiere lograr sus objetivos.

SEGURIDAD:
- No eres médico. No diagnostiques ni trates enfermedades. Ante síntomas, dolores, trastornos alimentarios o condiciones médicas, recomienda acudir a un profesional sanitario.
- No propongas dietas peligrosas, ayunos extremos ni déficits agresivos. Prioriza la salud sobre la rapidez.
- Las cifras nutricionales de la app son estimaciones; recuérdalo cuando sea relevante.

FORMATO DE RESPUESTA (JSON):
- "reply": tu mensaje para el usuario.
- "memory_add": lista de hechos NUEVOS y duraderos que hayas aprendido del usuario en este mensaje (gustos, lesiones, horarios, motivaciones, cosas que odia comer, etc.). Vacía si no hay nada nuevo. No repitas lo que ya sabías.
- "social_meal_today": true SOLO si en este mensaje el usuario dice que HOY ha tenido (o va a tener) una comida social/familiar/fuera puntual.`;

// Etiquetas legibles (español) para construir el contexto del prompt.
const OBJETIVOS = {
  lose_fat: "perder grasa", maintain: "mantenerse", gain_muscle: "ganar músculo",
  gain_weight: "ganar peso", performance: "rendimiento deportivo", custom: "objetivo personalizado",
};
const ACTIVIDAD = {
  sedentary: "sedentario", light: "actividad ligera", moderate: "actividad moderada",
  high: "actividad alta", very_high: "actividad muy alta",
};
const DIETAS = {
  none: "sin restricción", high_protein: "alta en proteína", low_carb: "baja en carbohidratos",
  vegetarian: "vegetariana", vegan: "vegana", other: "personalizada",
};
const ENTRENOS = {
  none: "", strength: "fuerza", hypertrophy: "hipertrofia", cardio: "cardio",
  swimming: "natación", crossfit: "crossfit/funcional", sports: "deportes de equipo",
  running: "running/atletismo", mixed: "mixto", other: "",
};

// Bloque de contexto dinámico que se antepone al system prompt en cada llamada.
function construirContexto({ perfil, objetivos, comidasHoy, memoria, socialSemana }) {
  const p = perfil || {};
  const linsPerfil = [];
  if (p.age) linsPerfil.push(`edad ${p.age}`);
  if (p.sex) linsPerfil.push(p.sex === "male" ? "hombre" : "mujer");
  if (p.heightCm) linsPerfil.push(`${p.heightCm} cm`);
  if (p.weightKg) linsPerfil.push(`${p.weightKg} kg`);
  if (p.activityLevel && ACTIVIDAD[p.activityLevel]) linsPerfil.push(ACTIVIDAD[p.activityLevel]);
  const entreno = ENTRENOS[p.trainingType] || "";

  const objetivo = OBJETIVOS[p.goal] || "mejorar su alimentación";
  const dieta = DIETAS[p.dietPreference] || "";

  const o = objetivos || {};
  const c = calcConsumido(comidasHoy || []);
  const linsHoy = `Hoy lleva consumido: ${Math.round(c.caloriesKcal)} kcal, ${Math.round(c.proteinG)}g proteína, ${Math.round(c.carbohydratesG)}g carbohidratos, ${Math.round(c.fatG)}g grasa (de ${(comidasHoy || []).length} comidas registradas).`;
  const linsObj = o.caloriesKcal
    ? `Objetivos diarios: ${o.caloriesKcal} kcal, ${o.proteinG}g proteína, ${o.carbohydratesG}g carbohidratos, ${o.fatG}g grasa.`
    : "";

  const notas = (memoria?.notas || []);
  const ficha = notas.length
    ? `LO QUE YA SABES DEL USUARIO:\n- ${notas.join("\n- ")}`
    : "Aún no sabes casi nada del usuario; aprovecha para conocerlo.";

  const patron = socialSemana >= 2
    ? `AVISO IMPORTANTE: el usuario ha tenido ${socialSemana} comidas sociales/familiares en los últimos 7 días. Esto YA es un patrón. Si vuelve a poner una excusa parecida, sé firme y hónesto: dile que deje de poner excusas si quiere lograr sus objetivos.`
    : `Comidas sociales/familiares en los últimos 7 días: ${socialSemana}. Aún es puntual.`;

  return `CONTEXTO DEL USUARIO (privado, no lo recites literalmente):
Perfil: ${linsPerfil.join(", ") || "sin datos"}. Objetivo: ${objetivo}${dieta ? `. Dieta: ${dieta}` : ""}${entreno ? `. Entrena: ${entreno}` : ""}.
${linsObj}
${linsHoy}
${ficha}
${patron}
`;
}

// ── Conversaciones (historial tipo lista) ────────────────────────────────────
// KEYS.CHATS = [{ id, titulo, mensajes:[{rol,texto,ts}], creado, actualizado }].
// El usuario puede tener varias conversaciones; la "ficha" aprendida (memoria.js)
// es común a todas. Cada mensaje: { rol: "user" | "coach", texto, ts }.
const MAX_CONVS = 50;
const MAX_MSGS = 200;

function nuevoId() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function tituloDesde(texto) {
  const t = (texto || "").trim().replace(/\s+/g, " ");
  if (!t) return traducir("chat.nueva");
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

export async function getConversaciones() {
  let l = await sg(KEYS.CHATS);
  if (!Array.isArray(l)) l = [];
  // Migración del hilo único antiguo (KEYS.CHAT) a una conversación.
  if (l.length === 0) {
    const viejo = await sg(KEYS.CHAT);
    if (Array.isArray(viejo) && viejo.length) {
      l = [{ id: nuevoId(), titulo: tituloDesde(viejo.find((m) => m.rol === "user")?.texto), mensajes: viejo, creado: Date.now(), actualizado: Date.now() }];
      await ss(KEYS.CHATS, l);
      await ss(KEYS.CHAT, []);
    }
  }
  return l.slice().sort((a, b) => (b.actualizado || 0) - (a.actualizado || 0));
}

async function guardarConversaciones(l) {
  const ordenadas = l.slice().sort((a, b) => (b.actualizado || 0) - (a.actualizado || 0)).slice(0, MAX_CONVS);
  await ss(KEYS.CHATS, ordenadas);
}

export async function getConversacion(id) {
  return (await getConversaciones()).find((c) => c.id === id) || null;
}

export async function crearConversacion({ titulo, mensajeCoach } = {}) {
  const conv = {
    id: nuevoId(),
    titulo: titulo || traducir("chat.nueva"),
    mensajes: mensajeCoach ? [{ rol: "coach", texto: mensajeCoach, ts: Date.now() }] : [],
    creado: Date.now(),
    actualizado: Date.now(),
  };
  const l = await getConversaciones();
  l.push(conv);
  await guardarConversaciones(l);
  return conv;
}

export async function borrarConversacion(id) {
  await guardarConversaciones((await getConversaciones()).filter((c) => c.id !== id));
}

// ── Estado "sin leer" del entrenador (para el punto rojo del icono ✉️) ────────
// El entrenador puede dejar mensajes (p. ej. el resumen diario de la Fase 3).
// Mientras el usuario no abra el chat, el icono muestra un punto rojo.
export async function getCoachNoLeido() { return !!(await sg(KEYS.COACH_UNREAD)); }
export async function marcarCoachNoLeido() { await ss(KEYS.COACH_UNREAD, true); }
export async function marcarCoachLeido() { await ss(KEYS.COACH_UNREAD, false); }

// Convierte nuestro historial al formato de Gemini (roles user/model).
function aContents(historial) {
  return historial.map((m) => ({
    role: m.rol === "coach" ? "model" : "user",
    parts: [{ text: m.texto }],
  }));
}

// Gemini exige que los turnos alternen user/model y empiecen por user. Nuestro
// historial puede tener mensajes del entrenador "sueltos" (el saludo inicial o
// el resumen diario, sin un mensaje de usuario delante), lo que rompería la
// llamada. Esto funde turnos consecutivos del mismo rol y descarta los turnos
// iniciales que no sean de usuario.
function normalizarContents(items) {
  const out = [];
  for (const it of items) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === it.role) ultimo.parts.push(...it.parts);
    else out.push({ role: it.role, parts: [...it.parts] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Envía un mensaje a una conversación concreta. Devuelve { conversacion }.
// Actualiza la memoria (hechos nuevos + patrón de comidas sociales) por dentro.
export async function enviarMensajeCoach(convId, mensajeUsuario, { perfil, objetivos, comidasHoy }) {
  const l = await getConversaciones();
  const conv = l.find((c) => c.id === convId);
  if (!conv) throw new Error("conversación no encontrada");

  const memoria = await getMemoria();
  const socialSemana = await comidasSocialesSemana();
  const contexto = construirContexto({ perfil, objetivos, comidasHoy, memoria, socialSemana });

  // El contexto dinámico va en la instrucción de sistema (no como turnos de la
  // conversación, para no romper la alternancia user/model que Gemini exige).
  const previos = conv.mensajes.slice(-20);
  const contents = normalizarContents([
    ...aContents(previos),
    { role: "user", parts: [{ text: mensajeUsuario }] },
  ]);

  const res = await chatCoach({ systemPrompt: `${SYSTEM_COACH}\n\n${contexto}`, contents });

  // Actualiza la ficha aprendida y el registro de comidas sociales.
  if (res.memory_add?.length) await anadirNotas(res.memory_add);
  if (res.social_meal_today) await registrarComidaSocial();

  conv.mensajes.push({ rol: "user", texto: mensajeUsuario, ts: Date.now() });
  conv.mensajes.push({ rol: "coach", texto: res.reply, ts: Date.now() });
  if (conv.mensajes.length > MAX_MSGS) conv.mensajes = conv.mensajes.slice(-MAX_MSGS);
  conv.actualizado = Date.now();
  // Al primer mensaje del usuario, el título pasa a ser ese mensaje.
  if (conv.mensajes.filter((m) => m.rol === "user").length === 1) conv.titulo = tituloDesde(mensajeUsuario);

  await guardarConversaciones(l);
  return { conversacion: conv };
}

// ── Preparación inicial (onboarding honesto) ─────────────────────────────────
// Tras crear el perfil, el entrenador se "prepara" con esos datos: NO reentrena
// ningún modelo (eso no existe con Gemini), sino que construye su ficha inicial
// del usuario y deja un saludo. Es la versión honesta de "configurar tu asesor".
export async function prepararEntrenador({ perfil, objetivos }) {
  const memoria = await getMemoria();
  const contexto = construirContexto({ perfil, objetivos, comidasHoy: [], memoria, socialSemana: 0 });

  const instruccion = `Es la primera vez que hablas con este usuario. Preséntate MUY brevemente como su entrenador personal y nutricionista honesto (2-3 frases) y dile cómo le vas a ayudar según su objetivo. En "memory_add", anota los hechos clave de su perfil que debes recordar (objetivo, nivel de actividad, tipo de entrenamiento y preferencias/alergias si las hay).`;

  const contents = [
    { role: "user", parts: [{ text: instruccion }] },
  ];

  const res = await chatCoach({ systemPrompt: `${SYSTEM_COACH}\n\n${contexto}`, contents, maxOutputTokens: 500 });
  if (res.memory_add?.length) await anadirNotas(res.memory_add);

  // Sembramos el saludo como una conversación de bienvenida (si aún no hay ninguna).
  const convs = await getConversaciones();
  if (res.reply && convs.length === 0) {
    await crearConversacion({ titulo: traducir("chat.bienvenida"), mensajeCoach: res.reply });
  }
  return res.reply;
}

// ── Notificaciones del entrenador (buzón de resúmenes) ───────────────────────
// Los RESÚMENES son avisos proactivos del entrenador (no conversaciones): viven
// en el apartado de Notificaciones ✉️, que es de solo lectura (sin crear chats).
// Cada uno: { id, fecha, texto, ts }.
export async function getResumenes() {
  const l = await sg(KEYS.RESUMENES);
  return Array.isArray(l) ? l.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];
}
async function guardarResumenes(l) {
  const ordenados = l.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 60);
  await ss(KEYS.RESUMENES, ordenados);
}
export async function borrarResumen(id) {
  await guardarResumenes((await getResumenes()).filter((r) => r.id !== id));
}

// Abre una conversación de chat para hablar sobre un resumen concreto: crea una
// conversación nueva sembrada con el texto del resumen (así el entrenador tiene
// el contexto de ese día) y la devuelve.
export async function crearChatSobreResumen(resumen) {
  return crearConversacion({
    titulo: traducir("chat.sobre_dia", { fecha: resumen.fecha }),
    mensajeCoach: resumen.texto,
  });
}

// ¿Hay un resumen del día pendiente de generar (lo dejó la notificación diaria)?
export async function hayResumenPendiente() { return !!(await sg(KEYS.RESUMEN_PENDIENTE)); }
export async function marcarResumenPendiente(v) { await ss(KEYS.RESUMEN_PENDIENTE, !!v); }

// Genera el resumen del día y lo guarda en el buzón de Notificaciones. Devuelve
// { resumen }.
export async function generarResumenDiario({ perfil, objetivos, comidasHoy }) {
  const memoria = await getMemoria();
  const socialSemana = await comidasSocialesSemana();
  const contexto = construirContexto({ perfil, objetivos, comidasHoy, memoria, socialSemana });

  const instruccion = `Hazle al usuario un RESUMEN HONESTO de su día de hoy: cómo ha ido su alimentación respecto a sus objetivos (calorías y macros), qué ha hecho bien y qué debería mejorar mañana. Sé concreto y directo, sin adular. Si apenas ha registrado comidas hoy, díselo con naturalidad y anímale a registrarlas. 3-6 frases. Empieza saludando brevemente.`;

  const contents = [{ role: "user", parts: [{ text: instruccion }] }];

  const res = await chatCoach({ systemPrompt: `${SYSTEM_COACH}\n\n${contexto}`, contents, maxOutputTokens: 700 });
  if (res.memory_add?.length) await anadirNotas(res.memory_add);

  const resumen = { id: nuevoId(), fecha: new Date().toLocaleDateString(), texto: res.reply, ts: Date.now() };
  const l = await getResumenes();
  l.push(resumen);
  await guardarResumenes(l);
  await marcarResumenPendiente(false);

  return { resumen };
}
