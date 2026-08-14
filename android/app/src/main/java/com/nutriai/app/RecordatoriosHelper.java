package com.nutriai.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Lógica nativa de recordatorios (sustituye a @capacitor/local-notifications,
 * cuyas llamadas se cuelgan en algunos dispositivos). Programa alarmas EXACTAS
 * con AlarmManager y publica la notificación directamente con NotificationCompat
 * (la vía que se confirmó funcionando en el diagnóstico A/B).
 *
 * La config se guarda en SharedPreferences como JSON:
 *   { "icono": "ic_stat_default", "horas": [{"h":9,"m":30},...],
 *     "msg": { "manana": {"t":..,"b":..}, "mediodia": {..}, "noche": {..} } }
 * Así el AlarmReceiver y el BootReceiver pueden reconstruir la notificación sin
 * depender del WebView (funciona con la app cerrada y tras reiniciar el móvil).
 */
public class RecordatoriosHelper {

    public static final String PREFS = "nutriai_recordatorios";
    public static final String KEY_CONFIG = "config";
    public static final String KEY_CUMPLE = "cumple";
    public static final String KEY_COACH = "coach";
    public static final String CHANNEL_ID = "nutriai_recordatorios";
    public static final String COACH_CHANNEL_ID = "nutriai_entrenador";
    public static final String EXTRA_HOUR = "hora";
    public static final String EXTRA_MIN = "minuto";
    public static final String EXTRA_CUMPLE = "es_cumple";
    public static final String EXTRA_COACH = "es_coach";
    public static final String EXTRA_ABRIR_CHAT = "abrir_chat";
    public static final int PRUEBA_ID = 99999;
    public static final int CUMPLE_ID = 888888;
    public static final int COACH_ID = 777777;
    // Flags de estado del entrenador (leídos por el WebView al reanudar la app):
    //  · coach_pending: el resumen diario saltó y aún no se ha leído (punto rojo).
    //  · coach_open: el usuario tocó la notificación (abrir el chat directamente).
    private static final String KEY_COACH_PENDING = "coach_pending";
    private static final String KEY_COACH_OPEN = "coach_open";

    public static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void guardarConfig(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY_CONFIG, json).apply();
    }

    public static JSONObject leerConfig(Context ctx) {
        String s = prefs(ctx).getString(KEY_CONFIG, null);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (Exception e) { return null; }
    }

    public static void guardarCumple(Context ctx, String json) {
        if (json == null) prefs(ctx).edit().remove(KEY_CUMPLE).apply();
        else prefs(ctx).edit().putString(KEY_CUMPLE, json).apply();
    }

    public static JSONObject leerCumple(Context ctx) {
        String s = prefs(ctx).getString(KEY_CUMPLE, null);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (Exception e) { return null; }
    }

    // ── Entrenador personal (resumen diario) ──────────────────────────────────
    public static void guardarCoach(Context ctx, String json) {
        if (json == null) prefs(ctx).edit().remove(KEY_COACH).apply();
        else prefs(ctx).edit().putString(KEY_COACH, json).apply();
    }

    public static JSONObject leerCoach(Context ctx) {
        String s = prefs(ctx).getString(KEY_COACH, null);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (Exception e) { return null; }
    }

    public static void setCoachPending(Context ctx, boolean v) { prefs(ctx).edit().putBoolean(KEY_COACH_PENDING, v).apply(); }
    public static boolean getCoachPending(Context ctx) { return prefs(ctx).getBoolean(KEY_COACH_PENDING, false); }
    public static void setCoachOpen(Context ctx, boolean v) { prefs(ctx).edit().putBoolean(KEY_COACH_OPEN, v).apply(); }
    public static boolean getCoachOpen(Context ctx) { return prefs(ctx).getBoolean(KEY_COACH_OPEN, false); }

    public static void crearCanal(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Recordatorios", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Recordatorios para registrar tus comidas");
            ch.enableVibration(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    public static int iconoResId(Context ctx, String nombre) {
        int id = ctx.getResources().getIdentifier(nombre, "drawable", ctx.getPackageName());
        if (id == 0) id = ctx.getApplicationInfo().icon;
        return id;
    }

    // ── Programación de alarmas ───────────────────────────────────────────────
    public static void reprogramarTodo(Context ctx) {
        JSONObject cfg = leerConfig(ctx);
        if (cfg != null) {
            JSONArray horas = cfg.optJSONArray("horas");
            if (horas != null) {
                for (int i = 0; i < horas.length(); i++) {
                    JSONObject o = horas.optJSONObject(i);
                    if (o != null) programarUna(ctx, o.optInt("h"), o.optInt("m"));
                }
            }
        }
        programarCumple(ctx);   // el cumpleaños se reprograma junto al resto (boot/resume)
        programarCoach(ctx);    // el resumen diario del entrenador, igual
    }

    public static void programarUna(Context ctx, int h, int m) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pendingParaHora(ctx, h, m);
        long trigger = proximoTrigger(h, m);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
        }
    }

    public static void cancelarUna(Context ctx, int h, int m) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        am.cancel(pendingParaHora(ctx, h, m));
    }

    // Cancela las alarmas de la config ACTUALMENTE guardada.
    public static void cancelarTodo(Context ctx) {
        JSONObject cfg = leerConfig(ctx);
        if (cfg == null) return;
        JSONArray horas = cfg.optJSONArray("horas");
        if (horas == null) return;
        for (int i = 0; i < horas.length(); i++) {
            JSONObject o = horas.optJSONObject(i);
            if (o != null) cancelarUna(ctx, o.optInt("h"), o.optInt("m"));
        }
    }

    private static PendingIntent pendingParaHora(Context ctx, int h, int m) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("com.nutriai.app.RECORDATORIO_" + h + "_" + m);
        i.putExtra(EXTRA_HOUR, h);
        i.putExtra(EXTRA_MIN, m);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, h * 100 + m, i, flags);
    }

    private static long proximoTrigger(int h, int m) {
        Calendar now = Calendar.getInstance();
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, h);
        c.set(Calendar.MINUTE, m);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (!c.after(now)) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    // ── Cumpleaños (notificación anual personalizada) ─────────────────────────
    // Config guardada: { "mes":1-12, "dia":1-31, "hora":0-23, "icono":.., "titulo":.., "cuerpo":.. }
    public static void programarCumple(Context ctx) {
        JSONObject c = leerCumple(ctx);
        if (c == null) return;
        int mes = c.optInt("mes", 0), dia = c.optInt("dia", 0);
        if (mes < 1 || dia < 1) return;
        int hora = c.optInt("hora", 9);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pendingCumple(ctx);
        long trigger = proximoTriggerCumple(mes, dia, hora);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
        }
    }

    public static void cancelarCumple(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        am.cancel(pendingCumple(ctx));
    }

    public static void mostrarCumple(Context ctx) {
        JSONObject c = leerCumple(ctx);
        if (c == null) return;
        publicar(ctx, CUMPLE_ID,
            c.optString("icono", "ic_stat_default"),
            c.optString("titulo", "🎂"),
            c.optString("cuerpo", ""));
    }

    private static PendingIntent pendingCumple(Context ctx) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("com.nutriai.app.CUMPLE");
        i.putExtra(EXTRA_CUMPLE, true);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, CUMPLE_ID, i, flags);
    }

    private static long proximoTriggerCumple(int mes, int dia, int hora) {
        Calendar now = Calendar.getInstance();
        Calendar c = Calendar.getInstance();
        c.set(Calendar.MONTH, mes - 1);   // Calendar usa 0-11
        c.set(Calendar.DAY_OF_MONTH, dia);
        c.set(Calendar.HOUR_OF_DAY, hora);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (!c.after(now)) c.add(Calendar.YEAR, 1);
        return c.getTimeInMillis();
    }

    // ── Entrenador: notificación diaria de resumen ────────────────────────────
    // Config guardada: { "activado":bool, "h":0-23, "m":0-59, "icono":.., "titulo":.., "cuerpo":.. }
    public static void programarCoach(Context ctx) {
        JSONObject c = leerCoach(ctx);
        if (c == null || !c.optBoolean("activado", false)) return;
        int h = c.optInt("h", 21), m = c.optInt("m", 0);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pendingCoach(ctx);
        long trigger = proximoTrigger(h, m);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
        }
    }

    public static void cancelarCoach(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        am.cancel(pendingCoach(ctx));
    }

    private static PendingIntent pendingCoach(Context ctx) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.setAction("com.nutriai.app.COACH");
        i.putExtra(EXTRA_COACH, true);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, COACH_ID, i, flags);
    }

    public static void mostrarCoach(Context ctx) {
        JSONObject c = leerCoach(ctx);
        if (c == null) return;
        setCoachPending(ctx, true);   // enciende el punto rojo al reanudar la app
        crearCanalCoach(ctx);
        String icono = c.optString("icono", "ic_stat_default");
        String title = c.optString("titulo", "Tu entrenador tiene algo que decirte");
        String body = c.optString("cuerpo", "Tiene el resumen de tu día listo para ti.");
        String boton = c.optString("boton", "Ir al chat");
        // El toque en el cuerpo NO abre el chat (solo abre la app). Para ir al
        // chat/resumen, un botón de acción explícito bajo el mensaje.
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, COACH_CHANNEL_ID)
            .setSmallIcon(iconoResId(ctx, icono))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(intentAbrirApp(ctx, COACH_ID))
            .addAction(iconoResId(ctx, icono), boton, intentAbrirChat(ctx));
        NotificationManagerCompat.from(ctx).notify(COACH_ID, b.build());
    }

    public static void crearCanalCoach(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                COACH_CHANNEL_ID, "Entrenador personal", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Resumen diario de tu entrenador personal");
            ch.enableVibration(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    // Al tocar la notificación del entrenador: abre la app marcando "abrir chat".
    private static PendingIntent intentAbrirChat(Context ctx) {
        Intent i = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (i == null) i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        i.putExtra(EXTRA_ABRIR_CHAT, true);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, 600000, i, flags);
    }

    // ── Publicación de notificaciones ─────────────────────────────────────────
    public static void mostrarNotificacion(Context ctx, int h, int m) {
        JSONObject cfg = leerConfig(ctx);
        String icono = "ic_stat_default";
        String title = "NutriAI";
        String body = "Recuerda registrar tu comida.";
        if (cfg != null) {
            icono = cfg.optString("icono", icono);
            String franja = h < 12 ? "manana" : h < 18 ? "mediodia" : "noche";
            JSONObject msg = cfg.optJSONObject("msg");
            JSONObject f = msg != null ? msg.optJSONObject(franja) : null;
            if (f != null) { title = f.optString("t", title); body = f.optString("b", body); }
        }
        publicar(ctx, h * 100 + m, icono, title, body);
    }

    public static void mostrarPrueba(Context ctx, String icono, String title, String body) {
        publicar(ctx, PRUEBA_ID, icono, title, body);
    }

    private static void publicar(Context ctx, int id, String icono, String title, String body) {
        crearCanal(ctx);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(iconoResId(ctx, icono))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(intentAbrirApp(ctx, id));
        NotificationManagerCompat.from(ctx).notify(id, b.build());
    }

    // Al tocar la notificación: solo abre la app.
    private static PendingIntent intentAbrirApp(Context ctx, int id) {
        Intent i = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (i == null) i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, 500000 + id, i, flags);
    }
}
