package com.nutriai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Se dispara cuando salta una alarma diaria. Publica la notificación de esa hora
 * y REPROGRAMA la misma alarma para el día siguiente (setExact es de un disparo).
 */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        // Cumpleaños: notificación anual → mostrar y reprogramar para el año siguiente.
        if (intent.getBooleanExtra(RecordatoriosHelper.EXTRA_CUMPLE, false)) {
            RecordatoriosHelper.mostrarCumple(ctx);
            RecordatoriosHelper.programarCumple(ctx);
            return;
        }
        // Entrenador: resumen diario → mostrar y reprogramar para mañana.
        if (intent.getBooleanExtra(RecordatoriosHelper.EXTRA_COACH, false)) {
            RecordatoriosHelper.mostrarCoach(ctx);
            RecordatoriosHelper.programarCoach(ctx);
            return;
        }
        int h = intent.getIntExtra(RecordatoriosHelper.EXTRA_HOUR, -1);
        int m = intent.getIntExtra(RecordatoriosHelper.EXTRA_MIN, -1);
        if (h < 0 || m < 0) return;
        RecordatoriosHelper.mostrarNotificacion(ctx, h, m);
        RecordatoriosHelper.programarUna(ctx, h, m); // siguiente día
    }
}
