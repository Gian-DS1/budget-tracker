// Etiquetas de horizonte temporal de una meta (etiqueta opcional, no cambia la
// lógica). Fuente única para el formulario, el filtro y el chip de la tarjeta.
// Son FUNCIONES (no constantes) para que las etiquetas se traduzcan con el
// idioma activo en el momento del render.
import { tr } from '../../../i18n/runtime';

// Opciones para el selector del formulario (incluye "Sin horizonte" = '').
export function getHorizonFormOptions() {
  return [
    { value: '', label: tr('screens.vaults.noHorizon') },
    { value: 'short', label: tr('screens.vaults.shortTermLong') },
    { value: 'medium', label: tr('screens.vaults.mediumTermLong') },
    { value: 'long', label: tr('screens.vaults.longTermLong') },
  ];
}

// Opciones para el filtro de la barra (incluye "Todas" = '').
export function getHorizonFilterOptions() {
  return [
    { value: '', label: tr('common.allHorizons') },
    { value: 'short', label: tr('screens.vaults.shortTerm') },
    { value: 'medium', label: tr('screens.vaults.mediumTerm') },
    { value: 'long', label: tr('screens.vaults.longTerm') },
    { value: 'none', label: tr('screens.vaults.noHorizon') },
  ];
}

// Etiqueta corta para el chip de la tarjeta.
export function getHorizonChip(horizon) {
  const keys = { short: 'screens.vaults.chipShort', medium: 'screens.vaults.chipMedium', long: 'screens.vaults.chipLong' };
  return keys[horizon] ? tr(keys[horizon]) : null;
}
