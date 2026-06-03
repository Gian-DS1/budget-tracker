// Logo FinTrack — monograma 'F' geométrico periwinkle (acorde al favicon).
// <Logo size={28} /> para el ícono; <Logo size={28} withText /> para ícono + palabra.

export default function Logo({ size = 28, withText = false, className = '' }) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ftk" x1="120" y1="100" x2="280" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d6d9ff" />
          <stop offset="100%" stopColor="#bec2ff" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="92" fill="#070708" />
      <rect x="4" y="4" width="392" height="392" rx="88" fill="none" stroke="#232426" strokeWidth="6" />
      <rect x="10" y="8" width="380" height="3" rx="1.5" fill="#ffffff" opacity="0.06" />
      <rect x="120" y="100" width="46" height="200" rx="8" fill="url(#ftk)" />
      <rect x="120" y="100" width="160" height="46" rx="8" fill="url(#ftk)" />
      <rect x="120" y="178" width="118" height="44" rx="8" fill="#bec2ff" />
      <circle cx="300" cy="282" r="14" fill="#50d8e9" />
    </svg>
  );

  if (!withText) return <span className={className} style={{ display: 'inline-flex' }}>{mark}</span>;

  return (
    <span className={`inline-flex items-center gap-sm ${className}`}>
      {mark}
      <span className="font-headline-md font-bold tracking-tight text-on-surface" style={{ fontSize: size * 0.7 }}>
        FinTrack
      </span>
    </span>
  );
}
