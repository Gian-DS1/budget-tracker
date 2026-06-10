// Chip de feedback: indica que una categoría se asignó AUTOMÁTICAMENTE por
// keywords (matcheo inteligente). Estilo Stitch (lima = auto, sutil).
import MS from './MS';
import { tr } from '../i18n/runtime';

export default function AutoCatChip({ show }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex items-center gap-[2px] font-mono-data text-[8px] uppercase tracking-wider text-tertiary/90 leading-none"
      title={tr('common.autoCategoryHint')}
    >
      <MS name="auto_awesome" className="!text-[10px] leading-none" />
      {tr('common.autoCategory')}
    </span>
  );
}
