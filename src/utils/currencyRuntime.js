// Moneda del usuario fuera de React (formatters, stores). usePrefsStore la
// fija al cargar el perfil y al cambiarla en Ajustes — mismo patrón que el
// idioma en i18n/runtime.js. Default DOP: los datos históricos están en DOP.
let current = null;

export function setRuntimeCurrency(code) {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : null;
  current = c && /^[A-Z]{3}$/.test(c) ? c : null;
}

export function getCurrency() {
  return current || 'DOP';
}
