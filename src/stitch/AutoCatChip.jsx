// Chip de feedback: indica que una categoría se asignó AUTOMÁTICAMENTE por
// keywords (matcheo inteligente). Estilo Stitch (lima = auto, sutil).
import MS from './MS';

export default function AutoCatChip({ show }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex items-center gap-xs font-mono-data text-[9px] uppercase tracking-wider text-tertiary border border-tertiary/40 rounded px-1.5 py-0.5"
      title="Categoría asignada automáticamente según la descripción. Puedes cambiarla."
    >
      <MS name="auto_awesome" className="text-[11px]" />
      Auto
    </span>
  );
}
