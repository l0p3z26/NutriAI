package com.nutriai.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Cambia el icono del lanzador entre los alias declarados en el manifest
 * (IconDefault, IconLeaf). Habilita el elegido y desactiva el resto. El cambio
 * es por dispositivo: solo afecta al móvil del usuario que lo elige.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    // Deben coincidir con los android:name de los <activity-alias> del manifest.
    private static final String[] ALIASES = { "IconDefault", "IconLeaf" };

    @PluginMethod
    public void setIcon(PluginCall call) {
        String target = call.getString("name", "IconDefault");

        boolean valido = false;
        for (String a : ALIASES) { if (a.equals(target)) { valido = true; break; } }
        if (!valido) { call.reject("Icono desconocido: " + target); return; }

        String pkg = getContext().getPackageName();
        PackageManager pm = getContext().getPackageManager();
        try {
            for (String alias : ALIASES) {
                int estado = alias.equals(target)
                        ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                pm.setComponentEnabledSetting(
                        new ComponentName(pkg, pkg + "." + alias),
                        estado,
                        PackageManager.DONT_KILL_APP);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo cambiar el icono: " + e.getMessage());
        }
    }
}
