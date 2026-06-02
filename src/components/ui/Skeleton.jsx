// FinTrack — Skeleton loaders
//
// Placeholders para la carga inicial en frío (sin caché local todavía). Reusan
// las clases .skeleton* del design system. El bloque de prefers-reduced-motion
// global congela el shimmer y deja un bloque estático: comportamiento correcto.

/** Bloque base con shimmer. Ancho/alto configurables. */
export function Skeleton({ width = '100%', height = 14, radius = 'var(--radius-md)', style = {} }) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/**
 * Esqueleto de una tabla de datos: una fila de encabezado tenue + N filas.
 * Pensado para envolverse en la misma .card que la tabla real.
 */
export function SkeletonTable({ rows = 6 }) {
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden' }}
      role="status"
      aria-label="Cargando transacciones"
    >
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-primary)' }}>
        <Skeleton width="30%" height={12} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{
              gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: i < rows - 1 ? '1px solid var(--border-primary)' : 'none',
            }}
          >
            <Skeleton width={92} height={12} />
            <Skeleton width="38%" height={14} style={{ flex: 1, maxWidth: 280 }} />
            <Skeleton width={84} height={20} radius="var(--radius-full)" />
            <Skeleton width={96} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Esqueleto del resumen del dashboard: héroe + dos paneles + dos gráficos,
 * con la misma silueta que el contenido real para que no haya salto al llegar.
 */
export function SkeletonDashboard() {
  return (
    <div role="status" aria-label="Cargando el resumen financiero">
      {/* Héroe */}
      <div className="kpi-card" style={{ marginBottom: 'var(--space-6)' }}>
        <Skeleton width={160} height={12} style={{ marginBottom: 'var(--space-3)' }} />
        <Skeleton width={220} height={36} />
      </div>
      {/* Flujo + Patrimonio */}
      <div className="overview-grid">
        <div className="overview-panel">
          <Skeleton width={120} height={12} style={{ marginBottom: 'var(--space-5)' }} />
          <div className="flex" style={{ gap: 'var(--space-6)' }}>
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={12} style={{ marginBottom: 'var(--space-2)' }} />
              <Skeleton width="80%" height={28} />
            </div>
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={12} style={{ marginBottom: 'var(--space-2)' }} />
              <Skeleton width="80%" height={28} />
            </div>
          </div>
          <Skeleton width="100%" height={1} style={{ margin: 'var(--space-5) 0' }} />
          <Skeleton width="50%" height={22} />
        </div>
        <div className="overview-panel">
          <Skeleton width={120} height={12} style={{ marginBottom: 'var(--space-5)' }} />
          <Skeleton width="70%" height={28} style={{ marginBottom: 'var(--space-6)' }} />
          <Skeleton width="100%" height={14} style={{ marginBottom: 'var(--space-3)' }} />
          <Skeleton width="100%" height={14} />
        </div>
      </div>
      {/* Gráficos */}
      <div className="grid-2" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-container"><Skeleton width="100%" height={280} radius="var(--radius-lg)" /></div>
        <div className="chart-container"><Skeleton width="100%" height={280} radius="var(--radius-lg)" /></div>
      </div>
    </div>
  );
}

export default Skeleton;
