import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base:'./' es imprescindible para Electron: el build final se carga vía
// file:// y las rutas absolutas ("/assets/...") que genera Vite por defecto
// no resuelven bajo ese protocolo.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
