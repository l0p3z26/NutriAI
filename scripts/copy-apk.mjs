// Copia el APK de release firmado a versions/ con un nombre claro, para tener
// cada versión publicada del móvil en un único sitio.
import { copyFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// El buildDir de Gradle se redirige a ~/nutriai-build (fuera de OneDrive), así
// que el APK sale de ahí, no de android/app/build (ver android/build.gradle).
const src = path.join(os.homedir(), "nutriai-build", "app", "outputs", "apk", "release", "app-release.apk");
// versionName de android/app/build.gradle: única fuente de la versión del APK.
const gradle = readFileSync(path.join(root, "android", "app", "build.gradle"), "utf8");
const version = (gradle.match(/versionName\s+"([^"]+)"/) || [, "0.0"])[1];
const destDir = path.join(root, "versions");
const dest = path.join(destDir, `NutriAI-${version}.apk`);

if (!existsSync(src)) {
  console.error("No se encontró el APK de release en:\n  " + src +
    "\n(¿faltó firmar? revisa android/keystore.properties)");
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("APK copiado a: " + dest);
