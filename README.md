# NutriAI

Registro de comidas con IA. Analiza tus platos por **foto** o **texto** con Google Gemini y obtén calorías y macros al instante, con objetivos personalizados, recordatorios y seguimiento diario. App **Android** (Capacitor) con build de escritorio (Electron).

> Hecho por **l0p3z.26** · [Portfolio](https://l0p3z26.github.io/portfolio)

## ⬇️ Release (descargar la app)

**👉 [Descargar el APK para Android](https://github.com/l0p3z26/NutriAI/releases/latest/download/NutriAI-1.5.0.apk)** — instálalo permitiendo "orígenes desconocidos".

Todas las versiones (carpeta de Releases): **[github.com/l0p3z26/NutriAI/releases](https://github.com/l0p3z26/NutriAI/releases)**

### Versiones descargables

| Versión | Descarga |
|---|---|
| **1.5.0** (última) | [NutriAI-1.5.0.apk](https://github.com/l0p3z26/NutriAI/releases/download/v1.5.0/NutriAI-1.5.0.apk) |
| 1.0.0 (primera versión) | [NutriAI-1.0.0.apk](https://github.com/l0p3z26/NutriAI/releases/download/v1.0.0/NutriAI-1.0.0.apk) |

Las versiones intermedias (1.1.0–1.4.1) fueron builds internos de desarrollo; su evolución está en el **Historial de Versiones** dentro de la app.

## 💻 Código

Todo el código fuente está en este repositorio:

- **[`src/`](src/)** — la app (React): pantallas, componentes y librerías (`src/lib/`).
- **[`android/`](android/)** — proyecto Android (Capacitor) y plugins nativos.
- **[`electron/`](electron/)** — versión de escritorio.

## Características

- 📷 **Análisis con IA** por foto o texto (calorías + macros).
- ✏️ Corrección de alimentos y aclaración cuando la IA no está segura.
- 🍽️ **Crear comidas**: por preferencias o despensa, con varias ideas, ingredientes y paso a paso.
- 🎯 Objetivos de calorías y macros según tu perfil.
- 📅 Registro diario y seguimiento del progreso.
- 🔔 **Recordatorios** locales personalizables (funcionan con la app cerrada y tras reiniciar).
- 🌍 Multiidioma (es · en · fr · it · pt).
- 🔐 Cada usuario usa su **propia clave de Gemini**; los datos se guardan **localmente** en el dispositivo.
- 💾 Copia de seguridad: exporta e importa tus datos.

## Tecnología

Vite · React 19 · Capacitor 8 (Android) · Electron 43 (escritorio) · Google Gemini (`@google/genai`).

## Requisitos

- Node.js 18+
- Para Android: Android Studio / SDK (compileSdk 36) y JDK 17.

## Puesta en marcha

```bash
npm install
npm run dev          # desarrollo (web + Electron)
```

### Construir el APK de Android

```bash
npm run build:renderer          # compila la web (Vite)
npx cap sync android            # copia la web al proyecto Android
cd android && ./gradlew assembleRelease
```

El APK sale en `android/app/build/outputs/apk/release/`. Para firmarlo como *release*, crea `android/keystore.properties` con tu keystore (ver más abajo); si no existe, se firma en modo *debug*.

### Clave de Gemini

- **Android/Web**: cada usuario introduce su propia clave en la app (Ajustes → Conectar IA). Consíguela en [Google AI Studio](https://aistudio.google.com/apikey).
- **Escritorio (Electron)**: usa una clave incrustada vía `.env` (no incluido en el repo).

## Seguridad

Estos archivos **no** están en el repositorio (ver `.gitignore`) y **no** deben publicarse:
`\.env`, `android/keystore.properties`, `*.jks` / `*.keystore`.

## Aviso

Proyecto personal, sin afiliación con Google. "Gemini" es marca de Google LLC. Las estimaciones nutricionales son orientativas.
