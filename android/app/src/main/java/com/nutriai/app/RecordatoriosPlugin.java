package com.nutriai.app;

import android.Manifest;
import android.os.Build;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Plugin nativo propio de recordatorios. Reemplaza a
 * @capacitor/local-notifications (cuyas llamadas se cuelgan en el WebView de
 * algunos dispositivos). Toda la lógica pesada está en RecordatoriosHelper.
 */
@CapacitorPlugin(
    name = "Recordatorios",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "display")
)
public class RecordatoriosPlugin extends Plugin {

    // Estado del permiso de notificaciones ("granted" | "denied").
    @PluginMethod
    public void checkPermiso(PluginCall call) {
        JSObject r = new JSObject();
        boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        r.put("display", enabled ? "granted" : "denied");
        call.resolve(r);
    }

    // Pide POST_NOTIFICATIONS (Android 13+). Si ya está concedido o es < 13, resuelve directo.
    @PluginMethod
    public void pedirPermiso(PluginCall call) {
        boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || enabled) {
            checkPermiso(call);
            return;
        }
        requestPermissionForAlias("display", call, "permCallback");
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        checkPermiso(call);
    }

    // Guarda la config {icono, horas, msg} y (re)programa todas las alarmas.
    @PluginMethod
    public void programar(PluginCall call) {
        try {
            // 1) cancela lo anterior según la config previa guardada
            RecordatoriosHelper.cancelarTodo(getContext());
            // 2) guarda la nueva config
            JSObject cfg = new JSObject();
            cfg.put("icono", call.getString("icono", "ic_stat_default"));
            cfg.put("horas", call.getArray("horas"));
            cfg.put("msg", call.getObject("msg"));
            RecordatoriosHelper.guardarConfig(getContext(), cfg.toString());
            // 3) programa la nueva
            RecordatoriosHelper.reprogramarTodo(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? e.getClass().getName() : e.getMessage());
        }
    }

    // Cancela todas las alarmas y deja la config sin horas (para que el reinicio no reprograme).
    @PluginMethod
    public void cancelar(PluginCall call) {
        try {
            RecordatoriosHelper.cancelarTodo(getContext());
            JSObject cfg = new JSObject();
            cfg.put("icono", call.getString("icono", "ic_stat_default"));
            cfg.put("horas", new com.getcapacitor.JSArray());
            cfg.put("msg", call.getObject("msg"));
            RecordatoriosHelper.guardarConfig(getContext(), cfg.toString());
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? e.getClass().getName() : e.getMessage());
        }
    }

    // Programa la notificación anual de cumpleaños {mes, dia, hora, icono, titulo, cuerpo}.
    @PluginMethod
    public void programarCumple(PluginCall call) {
        try {
            JSObject c = new JSObject();
            c.put("mes", call.getInt("mes", 0));
            c.put("dia", call.getInt("dia", 0));
            c.put("hora", call.getInt("hora", 9));
            c.put("icono", call.getString("icono", "ic_stat_default"));
            c.put("titulo", call.getString("titulo", "🎂"));
            c.put("cuerpo", call.getString("cuerpo", ""));
            RecordatoriosHelper.guardarCumple(getContext(), c.toString());
            RecordatoriosHelper.programarCumple(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? e.getClass().getName() : e.getMessage());
        }
    }

    @PluginMethod
    public void cancelarCumple(PluginCall call) {
        RecordatoriosHelper.cancelarCumple(getContext());
        RecordatoriosHelper.guardarCumple(getContext(), null);
        call.resolve();
    }

    // Notificación de prueba inmediata.
    @PluginMethod
    public void probar(PluginCall call) {
        try {
            RecordatoriosHelper.mostrarPrueba(
                getContext(),
                call.getString("icono", "ic_stat_default"),
                call.getString("titulo", "NutriAI"),
                call.getString("cuerpo", "Notificación de prueba")
            );
            JSObject r = new JSObject();
            r.put("ok", true);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? e.getClass().getName() : e.getMessage());
        }
    }
}
