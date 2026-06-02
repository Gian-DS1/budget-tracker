// Helper de ícono Material Symbols Outlined (1:1 Stitch usa Material Symbols, no Lucide).
// <MS name="dashboard" /> ó <MS name="credit_card" fill className="text-[20px]" />
export default function MS({ name, fill = false, className = '', style }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}`, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
