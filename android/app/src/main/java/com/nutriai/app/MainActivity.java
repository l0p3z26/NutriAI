package com.nutriai.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registrar plugins propios ANTES de super.onCreate (requisito de Capacitor).
        registerPlugin(AppIconPlugin.class);
        registerPlugin(SistemaPlugin.class);
        registerPlugin(RecordatoriosPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
