// Chip de feedback: indica que una categoría se asignó AUTOMÁTICAMENTE por
// keywords (matcheo inteligente). Estilo Stitch (lima = auto, sutil).
import MS from './MS';

export default function AutoCatChip({ show }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex items-center gap-[2px] font-mono-data text-[8px] uppercase tracking-wider text-tertiary border border-tertiary/40 rounded px-1 py-[1px] leading-none"
      title="Categoría asignada automáticamente según la descripción. Puedes cambiarla."
    >
      <MS name="auto_awesome" className="text-[9px]" />
      Auto
    </span>
  );
}
