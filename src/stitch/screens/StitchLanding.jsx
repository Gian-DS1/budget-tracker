// Landing pública (visitantes no logueados) — estilo Stitch nativo, i18n es/en.
// CTA → onAccess() lleva a la pantalla de acceso (StitchAuth).
//
// Narrativa: producto GLOBAL en beta abierta (sin promesas de precio). La
// prueba de "global" es real: el marquee formatea las monedas soportadas con
// Intl.NumberFormat en vivo, igual que la app.
//
// Motion: físicas SPRING con bounce sutil (landingMotion.js), exclusivas de la
// landing (marketing → "delight" permitido). Sistema 3D: el mockup hero vive
// en un escenario con perspective y se inclina siguiendo el puntero (springs
// interrumpibles); chips flotantes a distinta profundidad (translateZ) venden
// la dimensión. Todo respeta prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
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
import { COMMON_CURRENCIES } from '../../utils/currencyOptions';
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

// Encabezado de sección consistente: label mono + titular Manrope.
function SectionHeader({ label, title, subtitle, v, failsafe, center = false }) {
  return (
    <motion.div
      className={`mb-lg ${center ? 'text-center flex flex-col items-center' : ''}`}
      variants={v.container}
      initial="hidden"
      whileInView="show"
      animate={failsafe}
      viewport={inViewport}
    >
      <motion.span variants={v.inItem} className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest block mb-sm">
        {label}
      </motion.span>
      <motion.h2 variants={v.inItem} className="font-headline-md text-[clamp(24px,3.5vw,32px)] text-on-surface tracking-tight">
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p variants={v.inItem} className="font-body-lg text-body-lg text-on-surface-variant max-w-[44rem] mt-sm">
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

// ── Escenario 3D del hero ─────────────────────────────────────────────────────
// El mockup vive bajo perspective y se inclina siguiendo el puntero. Springs
// suaves e interrumpibles (nunca "persiguen" bruscamente). Con reduced-motion
// se degrada a un contenedor estático.

function Tilt3D({ children, reduce, className = '' }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), SPRING_SCROLL);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), SPRING_SCROLL);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div
      className={className}
      style={{ perspective: 1200 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  );
}

// Chip flotante del escenario 3D: vive a otra profundidad (translateZ) y
// levita en bucle lento. Decorativo → aria-hidden.
function FloatChip({ className = '', z = 48, delay = 0, reduce, children }) {
  return (
    <motion.div
      aria-hidden
      className={`absolute bg-surface-card border border-border-subtle rounded p-sm inner-glow shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${className}`}
      style={{ transform: `translateZ(${z}px)` }}
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={reduce ? undefined : { duration: 5.5, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// ── Mockups de UI en vivo (construidos con tokens reales del tema) ────────────
// No son screenshots: son réplicas en vivo de pantallas reales con los mismos
// tokens. Cantidades en "$" neutro: cada usuario elige su moneda en la app.

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
        $ <CountUp value={87980} duration={900} format={(v) => Math.round(v).toLocaleString('en-US')} />
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
          <span className="font-headline-md text-[15px] tracking-tight text-on-surface shrink-0">$ 36,000 <span className="text-text-muted font-mono-data text-mono-data">/ 50K</span></span>
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
    ['shopping_cart', t('landing.mockup.groceryStore'), '−$ 4,250', 'text-accent-error'],
    ['payments', t('landing.mockup.biweeklySalary'), '+$ 85,000', 'text-tertiary'],
    ['local_gas_station', t('landing.mockup.gas'), '−$ 1,800', 'text-accent-error'],
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

// ── Marquee de monedas ────────────────────────────────────────────────────────
// Prueba viva de "global": formatea las MISMAS monedas que ofrece el onboarding
// con Intl.NumberFormat (idéntico al runtime de la app). Cantidades de ejemplo
// con magnitudes plausibles por moneda.

const MARQUEE_AMOUNTS = {
  USD: 1250, EUR: 1180, MXN: 21500, COP: 4800000, ARS: 985000, PEN: 4350,
  CLP: 890000, BRL: 6240, DOP: 58400, GTQ: 9100, CRC: 612000, UYU: 47800,
  PYG: 8400000, BOB: 8100, HNL: 29500, NIO: 43000, PAB: 1250, CAD: 1690, GBP: 980,
};

function CurrencyMarquee({ language }) {
  const locale = language === 'es' ? 'es' : 'en';
  const items = COMMON_CURRENCIES.map((code) => {
    let amount = code;
    try {
      amount = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 })
        .format(MARQUEE_AMOUNTS[code] ?? 1000);
    } catch { /* código pelado como fallback */ }
    return { code, amount };
  });

  // El track duplica la fila (la copia es aria-hidden) para el loop sin costura.
  const row = (key, hidden) => (
    <div key={key} className="flex items-center gap-md pr-md" aria-hidden={hidden || undefined}>
      {items.map(({ code, amount }) => (
        <span key={code} className="flex items-center gap-sm bg-surface-card border border-border-subtle rounded px-md py-sm inner-glow shrink-0">
          <span className="font-mono-data text-mono-data text-primary uppercase">{code}</span>
          <span className="font-headline-md text-[15px] tracking-tight text-on-surface whitespace-nowrap">{amount}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="landing-marquee">
      <div className="landing-marquee-track">
        {row('a', false)}
        {row('b', true)}
      </div>
    </div>
  );
}

// ── FAQ (acordeón animado con AnimatePresence) ────────────────────────────────

function FaqItem({ q, a, open, onToggle, reduce }) {
  return (
    <div className="border border-border-subtle rounded-lg bg-surface-card inner-glow overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-md p-lg text-left hover:bg-surface-container-low transition-colors"
      >
        <span className="font-headline-md text-[16px] text-on-surface tracking-tight">{q}</span>
        <motion.span
          className="shrink-0 flex"
          animate={{ rotate: open ? 45 : 0 }}
          transition={reduce ? { duration: 0.1 } : SPRING_SNAP}
        >
          <MS name="add" className="text-[20px] text-primary" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0.1 } : { duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="px-lg pb-lg font-body-md text-body-md text-on-surface-variant max-w-[62ch]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pantalla ─────────────────────────────────────────────────────────────────

export default function StitchLanding({ onAccess }) {
  const { t, language } = useI18n();
  const v = useLandingVariants();
  const heroRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(0);

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

  // Stats con valor para el visitante (nada de métricas internas; nada de
  // promesas de precio). Las monedas salen del catálogo real del onboarding.
  const stats = [
    { value: COMMON_CURRENCIES.length, label: t('landing.stats.currencies') },
    { value: 2, label: t('landing.stats.languages') },
    { value: 3, label: t('landing.stats.levels') },
    { value: 0, label: t('landing.stats.ads') },
  ];

  const steps = [
    { n: '01', title: t('landing.how.step1'), desc: t('landing.how.step1Desc'), icon: 'edit_note' },
    { n: '02', title: t('landing.how.step2'), desc: t('landing.how.step2Desc'), icon: 'stairs' },
    { n: '03', title: t('landing.how.step3'), desc: t('landing.how.step3Desc'), icon: 'insights' },
  ];

  const levels = [
    { tag: t('landing.levels.l1Tag'), title: t('landing.levels.l1'), desc: t('landing.levels.l1Desc'), icon: 'visibility', accent: 'text-secondary' },
    { tag: t('landing.levels.l2Tag'), title: t('landing.levels.l2'), desc: t('landing.levels.l2Desc'), icon: 'donut_small', accent: 'text-primary' },
    { tag: t('landing.levels.l3Tag'), title: t('landing.levels.l3'), desc: t('landing.levels.l3Desc'), icon: 'verified', accent: 'text-tertiary' },
  ];

  const privacyCards = [
    { icon: 'lock', title: t('landing.privacy.p1'), desc: t('landing.privacy.p1Desc') },
    { icon: 'download', title: t('landing.privacy.p2'), desc: t('landing.privacy.p2Desc') },
    { icon: 'visibility_off', title: t('landing.privacy.p3'), desc: t('landing.privacy.p3Desc') },
  ];

  const faqs = [1, 2, 3, 4, 5].map((i) => ({
    q: t(`landing.faq.q${i}`),
    a: t(`landing.faq.a${i}`),
  }));

  return (
    <div className="stitch-root grid-pattern min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border-subtle relative z-10">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe h-16 flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Logo size={28} withText />
            <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest border border-border-subtle rounded px-sm py-xs">
              Beta
            </span>
          </div>
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
      <section ref={heroRef} className="relative flex-grow flex items-center overflow-hidden">
        <div className="landing-aurora" aria-hidden />
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-section-padding w-full grid grid-cols-1 lg:grid-cols-2 gap-xl items-center relative">
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
              {t('landing.hero.title1')}<br />
              {t('landing.hero.title2')}
            </motion.h1>
            <motion.p
              variants={v.item}
              className="font-body-lg text-body-lg text-on-surface-variant max-w-[34rem] mb-lg"
            >
              {t('landing.hero.subtitle')}
            </motion.p>
            <motion.div variants={v.item} className="flex flex-wrap gap-sm">
              <PrimaryCTA onClick={onAccess} snap={v.snap} className="px-lg py-md">
                <MS name="rocket_launch" className="text-[18px]" /> {t('landing.hero.cta')}
              </PrimaryCTA>
              {isLocalhost() && (
                <motion.button
                  onClick={() => { enterDemo(); window.location.reload(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={v.snap}
                  className="border border-dashed border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase tracking-widest px-lg py-md rounded hover:bg-surface-container-high hover:text-on-surface inline-flex items-center gap-sm"
                >
                  <MS name="science" className="text-[16px]" /> {t('landing.hero.demo')}
                </motion.button>
              )}
            </motion.div>
            <motion.p variants={v.item} className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest mt-md">
              {t('landing.hero.note')}
            </motion.p>
          </motion.div>

          {/* Escenario 3D: mockup con tilt por puntero + parallax de scroll +
              chips flotantes a distinta profundidad. También visible en móvil. */}
          <motion.div
            className="mt-lg lg:mt-0"
            style={{ y: mockY }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={v.reduce ? { duration: 0.2 } : { ...SPRING_SOFT, delay: 0.15 }}
          >
            <Tilt3D reduce={v.reduce} className="relative">
              <HeroMockup t={t} />
              <FloatChip reduce={v.reduce} z={56} className="-top-4 -right-3 sm:-right-6 flex items-center gap-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" />
                <span className="font-mono-data text-mono-data text-on-surface uppercase">{t('landing.mockup.biweeklySalary')}</span>
                <span className="font-headline-md text-[14px] tracking-tight text-tertiary">+$ 85,000</span>
              </FloatChip>
              <FloatChip reduce={v.reduce} z={40} delay={1.6} className="-bottom-5 -left-3 sm:-left-6 flex items-center gap-sm">
                <MS name="savings" className="text-[16px] text-primary" />
                <span className="font-mono-data text-mono-data text-on-surface uppercase">{t('landing.mockup.emergencyFund')}</span>
                <span className="font-headline-md text-[14px] tracking-tight text-primary">72%</span>
              </FloatChip>
            </Tilt3D>
          </motion.div>
        </div>
      </section>

      {/* Marquee global de monedas (prueba viva de Intl) */}
      <section className="border-t border-border-subtle py-lg overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe flex flex-col sm:flex-row sm:items-center gap-sm sm:gap-lg mb-md">
          <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-widest shrink-0">{t('landing.marquee.label')}</span>
          <span className="font-body-md text-body-md text-on-surface-variant">{t('landing.marquee.title')}</span>
        </div>
        <CurrencyMarquee language={language} />
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
                <CountUp value={s.value} duration={900} format={(val) => String(Math.round(val))} />
              </div>
              <div className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Cómo funciona: tres pasos */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          <SectionHeader label={t('landing.how.label')} title={t('landing.how.title')} v={v} failsafe={failsafe} />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-md"
            variants={v.container}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {steps.map((s) => (
              <motion.div
                key={s.n}
                variants={v.inItem}
                whileHover={v.reduce ? undefined : { y: -4 }}
                transition={v.spring}
                className="relative bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow overflow-hidden"
              >
                <span className="absolute -top-3 right-2 font-hero-headline text-[88px] leading-none tracking-tighter text-on-surface opacity-[0.06] select-none" aria-hidden>
                  {s.n}
                </span>
                <MS name={s.icon} className="text-[24px] text-primary mb-md" />
                <h3 className="font-headline-md text-[18px] text-on-surface tracking-tight mb-xs">
                  <span className="font-mono-data text-mono-data text-tertiary uppercase mr-sm">{s.n}</span>
                  {s.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bento de features con mockups en vivo */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          <motion.h2
            className="font-headline-md text-[clamp(24px,3.5vw,32px)] text-on-surface tracking-tight mb-lg"
            variants={v.inItem}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {t('landing.bentoTitle')}
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
                {language === 'es' ? 'Presupuesto base cero' : 'Zero-based budget'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t('landing.levels.l3Desc')}
              </p>
            </motion.div>

            {/* Celda mediana: movimientos (3 cols) */}
            <motion.div
              variants={v.inItem}
              className="sm:col-span-2 lg:col-span-3 bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
            >
              <LedgerMockup t={t} />
            </motion.div>

            {/* Mini-mockups en vivo: deudas (avalancha) y meta de ahorro. */}
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

      {/* Niveles progresivos */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          <SectionHeader
            label={t('landing.levels.label')}
            title={t('landing.levels.title')}
            subtitle={t('landing.levels.subtitle')}
            v={v}
            failsafe={failsafe}
          />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-md"
            variants={v.container}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {levels.map((l, i) => (
              <motion.div
                key={l.tag}
                variants={v.inItem}
                whileHover={v.reduce ? undefined : { y: -6 }}
                transition={v.spring}
                className={`bg-surface-card border rounded-lg p-lg inner-glow flex flex-col gap-sm ${i === 2 ? 'border-primary' : 'border-border-subtle hover:border-outline-variant'} transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest border border-border-subtle rounded px-sm py-xs">{l.tag}</span>
                  <MS name={l.icon} className={`text-[20px] ${l.accent}`} />
                </div>
                <h3 className={`font-headline-md text-[22px] tracking-tight mt-sm ${l.accent}`}>{l.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{l.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Privacidad */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-xl">
          <SectionHeader label={t('landing.privacy.label')} title={t('landing.privacy.title')} v={v} failsafe={failsafe} />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-md"
            variants={v.container}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {privacyCards.map((p) => (
              <motion.div
                key={p.title}
                variants={v.inItem}
                className="bg-surface-card border border-border-subtle rounded-lg p-lg inner-glow hover:border-primary transition-colors"
              >
                <div className="w-10 h-10 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center inner-glow mb-md">
                  <MS name={p.icon} className="text-[20px] text-secondary" />
                </div>
                <h3 className="font-headline-md text-[18px] text-on-surface tracking-tight mb-xs">{p.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border-subtle">
        <div className="max-w-[760px] mx-auto px-md sm:px-margin-safe py-xl">
          <SectionHeader label={t('landing.faq.label')} title={t('landing.faq.title')} v={v} failsafe={failsafe} center />
          <motion.div
            className="space-y-sm"
            variants={v.container}
            initial="hidden"
            whileInView="show"
            animate={failsafe}
            viewport={inViewport}
          >
            {faqs.map((f, i) => (
              <motion.div key={f.q} variants={v.inItem}>
                <FaqItem
                  q={f.q}
                  a={f.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                  reduce={v.reduce}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative border-t border-border-subtle overflow-hidden">
        <div className="landing-aurora" aria-hidden />
        <motion.div
          className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-section-padding flex flex-col items-center text-center gap-md relative"
          variants={v.container}
          initial="hidden"
          whileInView="show"
          animate={failsafe}
          viewport={inViewport}
        >
          <motion.span variants={v.inItem} className="flex items-center gap-sm font-mono-data text-mono-data text-tertiary uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" />
            {t('landing.final.label')}
          </motion.span>
          <motion.h2
            variants={v.inItem}
            className="font-hero-headline text-[clamp(28px,5vw,48px)] text-on-surface tracking-tighter leading-[1.05] max-w-[20ch]"
          >
            {t('landing.final.title')}
          </motion.h2>
          <motion.p variants={v.inItem} className="font-body-lg text-body-lg text-on-surface-variant max-w-[36rem]">
            {t('landing.final.subtitle')}
          </motion.p>
          <motion.div variants={v.inItem}>
            <PrimaryCTA onClick={onAccess} snap={v.snap} className="px-xl py-md">
              <MS name="rocket_launch" className="text-[18px]" /> {t('landing.final.cta')}
            </PrimaryCTA>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="max-w-[1100px] mx-auto px-md sm:px-margin-safe py-md font-mono-data text-mono-data text-text-muted">
          © {new Date().getFullYear()} FinTrack · {t('nav.tagline')} · Beta
        </div>
      </footer>
    </div>
  );
}
