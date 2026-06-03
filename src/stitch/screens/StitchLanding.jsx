// Landing pública (visitantes no logueados) — estilo Stitch nativo, español.
// CTA → onAccess() lleva a la pantalla de acceso (StitchAuth).

import MS from '../MS';
import Logo from '../Logo';
import { isLocalhost, enterDemo } from '../demoMode';

const FEATURES = [
  { icon: 'account_balance', title: 'Presupuesto base cero', desc: 'Asigna cada peso hasta llegar a cero y sabe exactamente cuánto puedes gastar.' },
  { icon: 'list_alt', title: 'Transacciones y recurrentes', desc: 'Registra ingresos y gastos en segundos. Las recurrentes se materializan solas.' },
  { icon: 'credit_card', title: 'Tarjetas de crédito', desc: 'Ciclos de corte y pago, cashback por categoría y control de saldo sin sorpresas.' },
  { icon: 'trending_down', title: 'Deudas inteligentes', desc: 'Estrategia avalancha para salir de deudas más rápido y pagar menos intereses.' },
  { icon: 'account_balance_wallet', title: 'Metas de ahorro', desc: 'Define objetivos, aporta poco a poco y mira tu progreso crecer.' },
  { icon: 'analytics', title: 'Reportes y salud financiera', desc: 'Tendencias, categorías y tu score de salud en gráficos claros.' },
];

export default function StitchLanding({ onAccess }) {
  return (
    <div className="stitch-root grid-pattern min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe h-16 flex items-center justify-between">
          <Logo size={28} withText />
          <button onClick={onAccess} className="bg-surface-container-high border border-border-subtle text-on-surface font-label-sm text-label-sm uppercase tracking-widest px-md py-xs rounded hover:bg-surface-container-highest transition-colors inner-glow">
            Acceder
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-grow flex items-center">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-section-padding w-full grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-sm mb-md">
              <span className="w-2 h-2 rounded-full bg-tertiary status-glow-live" />
              <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest">Control financiero · RD</span>
            </div>
            <h1 className="font-hero-headline text-[clamp(40px,8vw,72px)] text-on-surface tracking-tighter leading-[1.05] mb-md">
              Cada peso,<br />bajo control.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[34rem] mb-lg">
              Presupuesto base cero, tarjetas, deudas y ahorro en una sola app pensada para
              República Dominicana. Clara, rápida y sin complicaciones.
            </p>
            <div className="flex flex-wrap gap-sm">
              <button onClick={onAccess} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-lg py-md rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-sm">
                <MS name="rocket_launch" className="text-[18px]" /> Empezar gratis
              </button>
              {isLocalhost() && (
                <button onClick={() => { enterDemo(); window.location.reload(); }} className="border border-dashed border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase tracking-widest px-lg py-md rounded hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-sm">
                  <MS name="science" className="text-[16px]" /> Ver demo
                </button>
              )}
            </div>
          </div>

          {/* Mock visual */}
          <div className="hidden lg:block">
            <div className="glass-card rounded-lg p-lg inner-glow">
              <div className="flex items-center justify-between mb-lg">
                <span className="font-mono-data text-mono-data text-text-muted uppercase">Puedes gastar</span>
                <span className="flex items-center gap-xs font-mono-data text-mono-data text-secondary uppercase"><span className="w-1.5 h-1.5 rounded-full bg-secondary status-glow-live" /> En vivo</span>
              </div>
              <div className="font-hero-headline text-[56px] text-tertiary tracking-tighter leading-none mb-lg">RD$ 87,980</div>
              <div className="grid grid-cols-3 gap-sm">
                {[['Ingresos', '+170K', 'text-tertiary'], ['Gastos', '−44.5K', 'text-accent-error'], ['Ahorro', '73.8%', 'text-secondary']].map(([l, v, c]) => (
                  <div key={l} className="bg-surface-card border border-border-subtle rounded p-sm">
                    <div className="font-mono-data text-mono-data text-text-muted uppercase">{l}</div>
                    <div className={`font-headline-md text-[18px] tracking-tight ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          <h2 className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest mb-lg">Todo lo que necesitas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors">
                <div className="w-10 h-10 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center inner-glow mb-md">
                  <MS name={f.icon} className="text-[20px] text-primary" />
                </div>
                <h3 className="font-headline-md text-[18px] text-on-surface tracking-tight mb-xs">{f.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl flex flex-col items-center text-center gap-md">
          <h2 className="font-hero-headline text-[clamp(28px,5vw,44px)] text-on-surface tracking-tighter">Empieza a controlar tu dinero hoy</h2>
          <button onClick={onAccess} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-xl py-md rounded hover:bg-primary-container transition-colors inner-glow">
            Crear cuenta gratis
          </button>
        </div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-md font-mono-data text-mono-data text-text-muted">
          © {new Date().getFullYear()} FinTrack · Control financiero
        </div>
      </footer>
    </div>
  );
}
