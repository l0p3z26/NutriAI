package com.nutriai.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Plugin nativo para abrir pantallas de ajustes del sistema. Útil para que el
// usuario conceda el permiso de notificaciones cuando Android ya no vuelve a
// mostrar el diálogo (denegado), y para llegar a batería / inicio automático.
@CapacitorPlugin(name = "Sistema")
public class SistemaPlugin extends Plugin {

    // Pantallas de "inicio automático / autostart" por fabricante. Se intenta
    // cada una; la primera que exista en el dispositivo se abre. Si ninguna
    // resuelve, se cae a los detalles de la app.
    private static final String[][] AUTOSTART = {
        { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
        { "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity" },
        { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
        { "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity" },
        { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
        { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
        { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
        { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
        { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
        { "com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity" },
        { "com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity" },
    };

    @PluginMethod
    public void abrirAjustesNotificaciones(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir los ajustes de notificaciones", e);
        }
    }

    @PluginMethod
    public void abrirAjustesApp(PluginCall call) {
        abrirDetallesApp(call);
    }

    // Abre la pantalla de "inicio automático / autostart" del fabricante.
    @PluginMethod
    public void abrirInicioAutomatico(PluginCall call) {
        for (String[] c : AUTOSTART) {
            Intent intent = new Intent();
            intent.setComponent(new ComponentName(c[0], c[1]));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                try { getContext().startActivity(intent); call.resolve(); return; }
                catch (Exception e) { /* probar la siguiente */ }
            }
        }
        abrirDetallesApp(call);
    }

    // Abre el diálogo de "ignorar optimización de batería" (batería sin
    // restricciones). Si no está disponible, cae a los detalles de la app.
    @PluginMethod
    public void abrirAjustesBateria(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(intent);
                call.resolve();
                return;
            }
        } catch (Exception e) { /* fallback */ }
        abrirDetallesApp(call);
    }

    // Detección REAL de "batería sin restricciones" (ignora optimización).
    // El inicio automático NO se puede detectar (no hay API pública).
    @PluginMethod
    public void estadoBateria(PluginCall call) {
        boolean ignorando = false;
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ignorando = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } catch (Exception e) { /* por defecto false */ }
        JSObject r = new JSObject();
        r.put("ignorando", ignorando);
        call.resolve(r);
    }

    private void abrirDetallesApp(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir los ajustes de la app", e);
        }
    }
}
