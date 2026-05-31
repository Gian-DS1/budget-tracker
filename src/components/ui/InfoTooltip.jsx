import { Info } from 'lucide-react';

// Pequeño ícono de información con un tooltip explicativo al pasar el mouse (o al
// enfocarlo con teclado/táctil). Pensado para aclarar cómo se calcula un KPI.
export default function InfoTooltip({ text, label = 'Cómo se calcula este número' }) {
  return (
    <span className="info-tip" tabIndex={0} role="button" aria-label={label}>
      <Info size={13} aria-hidden="true" />
      <span className="info-tip-content" role="tooltip">{text}</span>
    </span>
  );
}
