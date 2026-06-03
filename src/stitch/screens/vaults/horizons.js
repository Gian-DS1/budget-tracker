// Etiquetas de horizonte temporal de una meta (etiqueta opcional, no cambia la
// lógica). Fuente única para el formulario, el filtro y el chip de la tarjeta.

// Opciones para el selector del formulario (incluye "Sin horizonte" = '').
export const HORIZON_FORM_OPTIONS = [
  { value: '', label: 'Sin horizonte' },
  { value: 'short', label: 'Corto plazo (< 1 año)' },
  { value: 'medium', label: 'Mediano plazo (1–5 años)' },
  { value: 'long', label: 'Largo plazo (5+ años)' },
];

// Opciones para el filtro de la barra (incluye "Todas" = '').
export const HORIZON_FILTER_OPTIONS = [
  { value: '', label: 'Todos los horizontes' },
  { value: 'short', label: 'Corto plazo' },
  { value: 'medium', label: 'Mediano plazo' },
  { value: 'long', label: 'Largo plazo' },
  { value: 'none', label: 'Sin horizonte' },
];

// Etiqueta corta para el chip de la tarjeta.
export const HORIZON_CHIP = { short: 'CORTO', medium: 'MEDIANO', long: 'LARGO' };
