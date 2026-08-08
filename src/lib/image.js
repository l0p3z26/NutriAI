// ═══════════════════════════════════════════════════════
// COMPRESIÓN DE IMAGEN EN EL CLIENTE
// ═══════════════════════════════════════════════════════
// Reescala la imagen a un máximo de 1024px en su lado mayor y la reencoda
// como JPEG antes de mandarla a Gemini. Reduce tokens, coste y latencia sin
// pérdida perceptible de calidad de análisis. Devuelve el dataURL (para la
// vista previa) y el base64 + mime (para la llamada a la IA).
const MAX_LADO = 1024;
const CALIDAD_JPEG = 0.85;

export function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen. Prueba con otro archivo."));
      img.onload = () => {
        let { width, height } = img;

        if (width > MAX_LADO || height > MAX_LADO) {
          if (width >= height) {
            height = Math.round(height * (MAX_LADO / width));
            width = MAX_LADO;
          } else {
            width = Math.round(width * (MAX_LADO / height));
            height = MAX_LADO;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", CALIDAD_JPEG);
        resolve({ dataUrl, base64: dataUrl.split(",")[1], mime: "image/jpeg" });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
