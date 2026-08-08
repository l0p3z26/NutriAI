package com.nutriai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Tras reiniciar el móvil, Android borra las alarmas de AlarmManager. Este
 * receptor las vuelve a programar leyendo la config guardada en SharedPreferences.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (action.equals(Intent.ACTION_BOOT_COMPLETED)
            || action.equals("android.intent.action.QUICKBOOT_POWERON")
            || action.equals("com.htc.intent.action.QUICKBOOT_POWERON")) {
            RecordatoriosHelper.reprogramarTodo(ctx);
        }
    }
}
