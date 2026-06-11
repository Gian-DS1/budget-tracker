// Landing pública (visitantes no logueados) — estilo Stitch nativo, español.
// CTA → onAccess() lleva a la pantalla de acceso (StitchAuth).
//
// Motion: físicas SPRING con bounce sutil (landingMotion.js), exclusivas de la
// landing (marketing → "delight" permitido). El dashboard interno usa easing
// crujiente sin bounce; aquí la personalidad es más viva pero contenida.
// Todo respeta prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from 'framer-motion';

import MS from '../MS';
import Logo from '../Logo';
import CountUp from '../CountUp';
import LanguageSelector from '../LanguageSelector';
import { isLocalhost, enterDemo } from '../demoMode';
import { useI18n } from '../../contexts/I18nContext';
import { monthShort } from '../../i18n/runtime';
import {
  SPRING_SOFT,
  SPRING_SNAP,
  SPRING_SCROLL,
  staggerContainer,
  staggerItem,
  inViewItem,
  inViewport,
  reducedContainer,
  reducedItem,
} from '../landingMotion';

// ── Helpers de motion (eligen variante según reduced-motion) ──────────────────

function useLandingVariants() {
  const reduce = useReducedMotion();
  return {
    reduce,
    container: reduce ? reducedContainer : staggerContainer,
    item: reduce ? reducedItem : staggerItem,
    inItem: reduce ? reducedItem : inViewItem,
    spring: reduce ? { duration: 0.2 } : SPRING_SOFT,
    snap: reduce ? { duration: 0.15 } : SPRING_SNAP,
  };
}

// Botón primario con feedback de press/hover por spring (interrumpible).
function PrimaryCTA({ children, onClick, className = '', snap }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={snap}
      className={`bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded inner-glow inline-flex items-center justify-center gap-sm ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ── Mockups de UI en vivo (construidos con tokens reales del tema) ────────────
// No son screenshots: son réplicas en vivo de pantallas reales con los mismos
// tokens, así la landing muestra el producto sin necesitar capturas.

// Mockup hero: tarjeta "Puedes gastar" con KPIs (CountUp).
function HeroMockup({ t }) {
  const mockupLabels = [
    { label: t('dashboard.income'), value: '+170K', color: 'text-tertiary' },
    { label: t('dashboard.expenses'), value: '−44.5K', color: 'text-accent-error' },
    { label: t('dashboard.savings'), value: '73.8%', color: 'text-secondary' },
  ];

  return (
    <div className="glass-card rounded-lg p-lg inner-glow">
      <div className="flex items-center justify-between mb-lg">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('dashboard.canSpend')}</span>
        <span className="flex items-center gap-xs font-mono-data text-mono-data text-secondary uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary status-glow-live" /> {t('dashboard.live')}
        </span>
      </div>
      <div className="font-hero-headline text-[clamp(40px,6vw,56px)] text-tertiary tracking-tighter leading-none mb-lg">
        RD$ <CountUp value={87980} duration={900} format={(v) => Math.round(v).toLocaleString('es-DO')} />
      </div>
      <div className="grid grid-cols-3 gap-sm">
        {mockupLabels.map(({ label, value, color }) => (
          <div key={label} className="bg-surface-card border border-border-subtle rounded p-sm">
            <div className="font-mono-data text-mono-data text-text-muted uppercase">{label}</div>
            <div className={`font-headline-md text-[18px] tracking-tight ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mockup grande del bento: anillo de salud financiera + resumen base cero.
function HealthMockup({ t }) {
  const pct = 0.87;
  const C = 2 * Math.PI * 52;
  const healthDetails = [
    { label: t('pages.zeroBudget'), value: t('landing.mockup.assigned'), color: 'text-tertiary' },
    { label: t('landing.mockup.cardsUpToDate'), value: t('landing.mockup.overdue'), color: 'text-secondary' },
    { label: t('dashboard.savingsRate'), value: '73.8%', color: 'text-primary' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-lg">
        <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t('dashboard.financialHealth')}</span>
        <span className="font-mono-data text-mono-data text-tertiary uppercase">{t('dashboard.excellent')}</span>
      </div>
      <div className="flex items-center gap-lg flex-grow">
        <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
          <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
            <circle cx="66" cy="66" r="52" fill="none" stroke="#232426" strokeWidth="10" />
            <circle
              cx="66" cy="66" r="52" fill="none" stroke="#bdd200" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-hero-headline text-[34px] text-on-surface tracking-tighter leading-none">
              <CountUp value={87} duration={900} format={(v) => String(Math.round(v))} />
            </span>
            <span className="font-mono-data text-mono-data text-text-muted uppercase mt-xs">{t('landing.mockup.of100')}</span>
          </div>
        </div>
        <div className="min-w-0 flex-grow space-y-sm">
          {healthDetails.map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between border-b border-border-subtle pb-sm last:border-0 last:pb-0">
              <span className="font-body-md text-body-md text-on-surface-variant truncate">{label}</span>
              <span className={`font-headline-md text-[15px] tracking-tight ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mockup mediano: barras de presupuesto base cero por categoría.
function BudgetMockup({ t }) {
  const rows = [
    [t('landing.mockup.rent'), 100, 'bg-tertiary'],
    [t('landing.mockup.groceries'), 64, 'bg-primary'],
    [t('landing.mockup.transport'), 38, 'bg-secondary'],
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-md">
        <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t('budget.title')}</span>
        <span className="font-mono-data text-mono-data text-tertiary uppercase">{t('landing.mockup.zeroBased')}</span>
      </div>
      <div className="space-y-md flex-grow flex flex-col justify-center">
        {rows.map(([l, w, bg]) => (
          <div key={l}>
            <div className="flex items-center justify-between mb-xs">
              <span className="font-body-md text-body-md text-on-surface-variant">{l}</span>
              <span className="font-mono-data text-mono-data text-text-muted">{w}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${bg}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${w}%` }}
                viewport={inViewport}
                transition={SPRING_SCROLL}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mockup pequeño: deudas con estrategia avalancha (progreso de pago).
function DebtsMockup({ t }) {
  const rows = [
    [t('landing.mockup.carLoan'), 68, 'bg-tertiary'],
    [t('landing.mockup.personalLoan'), 41, 'bg-secondary'],
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-md">
        <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t('landing.features.debts')}</span>
        <span className="font-mono-data text-mono-data text-secondary uppercase">{t('landing.mockup.avalanche')}</span>
      </div>
      <div className="space-y-md flex-grow flex flex-col justify-center">
        {rows.map(([l, w, bg]) => (
          <div key={l}>
            <div className="flex items-center justify-between mb-xs">
              <span className="font-body-md text-body-md text-on-surface-variant">{l}</span>
              <span className="font-mono-data text-mono-data text-text-muted">{w}% {t('landing.mockup.paid')}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${bg}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${w}%` }}
                viewport={inViewport}
                transition={SPRING_SCROLL}
              />
            </div>
          </div>
        ))}
        <p className="font-mono-data text-mono-data text-tertiary uppercase">{t('landing.mockup.debtFreeIn').replace('{n}', '14')}</p>
      </div>
    </div>
  );
}

// Mockup pequeño: meta de ahorro con progreso.
function SavingsMockup({ t }) {
  const pct = 72;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-md">
        <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t('landing.features.savings')}</span>
        <span className="font-mono-data text-mono-data text-tertiary uppercase">{t('landing.mockup.onTrack')}</span>
      </div>
      <div className="flex-grow flex flex-col justify-center gap-sm">
        <div className="flex items-baseline justify-between gap-sm">
          <span className="font-body-md text-body-md text-on-surface-variant truncate">{t('landing.mockup.emergencyFund')}</span>
          <span className="font-headline-md text-[15px] tracking-tight text-on-surface shrink-0">RD$ 36,000 <span className="text-text-muted font-mono-data text-mono-data">/ 50K</span></span>
        </div>
        <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={inViewport}
            transition={SPRING_SCROLL}
          />
        </div>
        <div className="flex justify-between font-mono-data text-mono-data text-text-muted uppercase">
          <span>{pct}%</span>
          <span>{t('landing.mockup.goal')}: {monthShort(11)} 2026</span>
        </div>
      </div>
    </div>
  );
}

// Mockup mediano: lista de transacciones recientes.
function LedgerMockup({ t }) {
  const rows = [
    ['shopping_cart', t('landing.mockup.groceryStore'), '−RD$ 4,250', 'text-accent-error'],
    ['payments', t('landing.mockup.biweeklySalary'), '+RD$ 85,000', 'text-tertiary'],
    ['local_gas_station', t('landing.mockup.gas'), '−RD$ 1,800', 'text-accent-error'],
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-md">
        <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{t('transactions.title')}</span>
        <span className="font-mono-data text-mono-data text-secondary uppercase">{t('calendar.today')}</span>
      </div>
      <div className="space-y-sm flex-grow flex flex-col justify-center">
        {rows.map(([icon, name, amt, c]) => (
          <div key={name} className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center inner-glow shrink-0">
              <MS name={icon} className="text-[16px] text-primary" />
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant truncate flex-grow">{name}</span>
            <span className={`font-headline-md text-[14px] tracking-tight shrink-0 ${c}`}>{amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pantalla ─────────────────────────────────────────────────────────────────

export default function StitchLanding({ onAccess }) {
  const { t, language } = useI18n();
  const v = useLandingVariants();
  const heroRef = useRef(null);

  // Parallax sutil del mockup hero, ligado al scroll y suavizado por spring.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], [0, v.reduce ? 0 : -48]);
  const mockY = useSpring(rawY, SPRING_SCROLL);

  // Failsafe de revelado: las secciones bajo el fold entran con whileInView,
  // pero si el IntersectionObserver no dispara (prerender, capturas full-page),
  // a los 2.5s se fuerza "show" para que el contenido NUNCA quede invisible.
  const [revealAll, setRevealAll] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealAll(true), 2500);
    return () => clearTimeout(id);
  }, []);
  const failsafe = revealAll ? 'show' : undefined;

  // Features de texto (deudas y ahorro tienen mini-mockup propio en el bento).
  const features = [
    { icon: 'list_alt', title: t('landing.features.transactions'), desc: t('landing.features.transactionsDesc') },
    { icon: 'credit_card', title: t('landing.features.creditCards'), desc: t('landing.features.creditCardsDesc') },
  ];

  // Stats con valor para el visitante (nada de métricas internas).
  const stats = [
    { value: 0, prefix: 'RD$ ', label: t('landing.stats.free') },
    { value: 37, label: t('landing.stats.categories') },
    { value: 2, label: t('landing.stats.languages') },
    { value: 100, suffix: '%', label: t('landing.stats.dominican') },
  ];

  return (
    <div className="stitch-root grid-pattern min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe h-16 flex items-center justify-between">
          <Logo size={28} withText />
          <div className="flex items-center gap-sm">
            <LanguageSelector />
            <motion.button
              onClick={onAccess}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={v.snap}
              className="bg-surface-container-high border border-border-subtle text-on-surface font-label-sm text-label-sm uppercase tracking-widest px-md py-xs rounded hover:bg-surface-container-highest inner-glow"
            >
              {t('landing.cta')}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="flex-grow flex items-center">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-section-padding w-full grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
          {/* Columna de texto: stagger spring */}
          <motion.div className="min-w-0" variants={v.container} initial="hidden" animate="show">
            <motion.div variants={v.item} className="flex items-center gap-sm mb-md">
              <span className="w-2 h-2 rounded-full bg-tertiary status-glow-live" />
              <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest">{t('landing.tagline')}</span>
            </motion.div>
            <motion.h1
              variants={v.item}
              className="font-hero-headline text-[clamp(40px,8vw,72px)] text-on-surface tracking-tighter leading-[1.05] mb-md"
            >
              {language === 'es' ? 'Cada peso,' : 'Take control'}<br />
              {language === 'es' ? 'bajo control.' : 'of your money.'}
            </motion.h1>
            <motion.p
              variants={v.item}
              className="font-body-lg text-body-lg text-on-surface-variant max-w-[34rem] mb-lg"
            >
              {language === 'es'
                ? 'Presupuesto base cero, tarjetas, deudas y ahorro en una sola app pensada para República Dominicana. Clara, rápida y sin complicaciones.'
                : 'Zero-based budget, credit cards, debts and savings in one app designed for the Dominican Republic. Clear, fast and straightforward.'}
            </motion.p>
            <motion.div variants={v.item} className="flex flex-wrap gap-sm">
              <PrimaryCTA onClick={onAccess} snap={v.snap} className="px-lg py-md">
                <MS name="rocket_launch" className="text-[18px]" /> {language === 'es' ? 'Empezar gratis' : 'Get started free'}
              </PrimaryCTA>
              {isLocalhost() && (
                <motion.button
                  onClick={() => { enterDemo(); window.location.reload(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={v.snap}
                  className="border border-dashed border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase tracking-widest px-lg py-md rounded hover:bg-surface-container-high hover:text-on-surface inline-flex items-center gap-sm"
                >
                  <MS name="science" className="text-[16px]" /> {language === 'es' ? 'Ver demo' : 'See demo'}
                </motion.button>
              )}
            </motion.div>
          </motion.div>

          {/* Mockup hero con parallax. También visible en móvil (debajo del
              CTA): la landing debe mostrar el producto en todos los tamaños. */}
          <motion.div
            className="mt-lg lg:mt-0"
            style={{ y: mockY }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={v.reduce ? { duration: 0.2 } : { ...SPRING_SOFT, delay: 0.15 }}
          >
            <HeroMockup t={t} />
          </motion.div>
        </div>
      </section>

      {/* Strip de métricas con CountUp */}
      <section className="border-t border-border-subtle">
        <motion.div
          className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl grid grid-cols-2 lg:grid-cols-4 gap-md"
          variants={v.container}
          initial="hidden"
          whileInView="show"
          animate={failsafe}
          viewport={inViewport}
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={v.inItem} className="text-center sm:text-left">
              <div className="font-hero-headline text-[clamp(32px,5vw,44px)] text-on-surface tracking-tighter leading-none mb-xs">
                {s.prefix || ''}
                <CountUp value={s.value} duration={900} format={(val) => String(Math.round(val))} />
                {s.suffix || ''}
              </div>
              <div className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bento de features con mockups en vivo */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          {/* Titular real de sección (Manrope), no un label de 10px: la sección
              más rica de la página merece un encabezado visible. */}
          <motion.h2
            className="font-headline-md text-[clamp(24px,3.5vw,32px)] text-on-surface tracking-tight mb-lg"
            variants={v.inItem}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {language === 'es' ? 'Todo tu dinero, en una vista' : 'All your money, in one place'}
          </motion.h2>

          {/* Grid asimétrico (bento). 6 columnas en lg para mezclar tamaños. */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-md auto-rows-[200px]"
            variants={v.container}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {/* Celda grande: salud financiera (4 cols × 2 filas) */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-2 lg:col-span-4 lg:row-span-2 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <HealthMockup t={t} />
            </motion.div>

            {/* Celda mediana: presupuesto base cero (2 cols × 2 filas) */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-2 lg:col-span-2 lg:row-span-2 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <BudgetMockup t={t} />
            </motion.div>

            {/* Texto destacado: presupuesto base cero (3 cols) */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-2 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors flex flex-col justify-center"
            >
              <h3 className="font-headline-md text-[18px] text-on-surface tracking-tight mb-xs flex items-center gap-sm">
                <MS name="account_balance" className="text-[18px] text-primary" />
                {language === 'es' ? 'Presupuesto base cero' : 'Zero-based Budget'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {language === 'es'
                  ? 'Asigna cada peso hasta llegar a cero y sabe exactamente cuánto puedes gastar.'
                  : 'Allocate each dollar until you reach zero and know exactly how much you can spend.'}
              </p>
            </motion.div>

            {/* Celda mediana: movimientos (3 cols) */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-2 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <LedgerMockup t={t} />
            </motion.div>

            {/* Mini-mockups en vivo: deudas (avalancha) y meta de ahorro.
                Muestran el producto en vez de describirlo con otra card. */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-1 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <DebtsMockup t={t} />
            </motion.div>
            <motion.div
              variants={v.inItem}
              className="sm:col-span-1 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <SavingsMockup t={t} />
            </motion.div>

            {/* Features de texto: transacciones y tarjetas */}
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={v.inItem}
                className="sm:col-span-1 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors flex flex-col justify-center"
              >
                <h3 className="font-headline-md text-[18px] text-on-surface tracking-tight mb-xs flex items-center gap-sm">
                  <MS name={f.icon} className="text-[18px] text-primary" />
                  {f.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border-subtle">
        <motion.div
          className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-section-padding flex flex-col items-center text-center gap-md"
          variants={v.container}
          initial="hidden"
          whileInView="show"
          animate={failsafe}
          viewport={inViewport}
        >
          <motion.span variants={v.inItem} className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest">
            {language === 'es' ? 'Empieza hoy' : 'Start today'}
          </motion.span>
          <motion.h2
            variants={v.inItem}
            className="font-hero-headline text-[clamp(28px,5vw,48px)] text-on-surface tracking-tighter leading-[1.05] max-w-[20ch]"
          >
            {/* En EN el hero ya dice "Take control of your money": aquí se usa
                el espejo del hero ES para no repetir titular. */}
            {language === 'es' ? 'Toma el control de tu dinero' : 'Every peso, under control'}
          </motion.h2>
          <motion.p variants={v.inItem} className="font-body-lg text-body-lg text-on-surface-variant max-w-[36rem]">
            {language === 'es'
              ? 'Gratis, sin tarjetas y pensada para República Dominicana. Empieza en menos de un minuto.'
              : 'Free, no credit card required, and built for the Dominican Republic. Get started in under a minute.'}
          </motion.p>
          <motion.div variants={v.inItem}>
            <PrimaryCTA onClick={onAccess} snap={v.snap} className="px-xl py-md">
              <MS name="rocket_launch" className="text-[18px]" /> {language === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
            </PrimaryCTA>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-md font-mono-data text-mono-data text-text-muted">
          © {new Date().getFullYear()} FinTrack · {t('nav.tagline')}
        </div>
      </footer>
    </div>
  );
}
