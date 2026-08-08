// Oculta el splash NATIVO de Android en cuanto el splash HTML (ruedita + texto)
// ya está pintado en pantalla. Así el usuario ve la carga desde el primer
// instante, en vez de unos segundos de fondo oscuro vacío mientras se descarga
// y monta el bundle de React. main.jsx retira luego el splash HTML.
(function () {
  function ocultar() {
    try {
      var C = window.Capacitor;
      if (C && C.Plugins && C.Plugins.SplashScreen && C.Plugins.SplashScreen.hide) {
        C.Plugins.SplashScreen.hide();
      }
    } catch (e) { /* sin plugin: no hay splash nativo que ocultar */ }
  }
  var C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform()) {
    // Tras el primer paint del splash HTML, retira el nativo (ambos son #06080F,
    // así que la transición es continua, sin parpadeos).
    requestAnimationFrame(function () { requestAnimationFrame(ocultar); });
  }
})();
