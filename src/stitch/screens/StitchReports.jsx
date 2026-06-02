// Reportes — layout Stitch con DATOS REALES (salud financiera, categorías, tendencia).
import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import { groupByCategory, getFinancialHealthScore, getMonthlySavingCapacity } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';

const fmt = (n) => formatCurrency(n);

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded p-sm">
      <p className="font-mono-data text-mono-data text-text-muted uppercase mb-xs">{label}</p>
      <p className="font-mono-data text-[13px] text-on-surface">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function StitchReports() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Serie de balance neto 12 meses
  const series = useMemo(() => {
    const arr = [];
    for (let i = 11; i >= 0; i--) {
      let mm = m - i, yy = y;
      while (mm < 0) { mm += 12; yy -= 1; }
      let net = 0;
      transactions.forEach((t) => {
        const d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() !== yy || d.getMonth() !== mm) return;
        if (t.type === 'income') net += Number(t.amount);
        else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type)) net -= Number(t.amount) - Number(t.cashbackEarned || 0);
      });
      arr.push({ label: MONTHS_SHORT_ES[mm], net });
    }
    return arr;
  }, [transactions, y, m]);

  // Gasto del mes por categoría
  const monthExpenses = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === y && d.getMonth() === m && ['expense', 'fixed_expense', 'variable_expense'].includes(t.type);
  }), [transactions, y, m]);

  const byCat = useMemo(() => {
    const grouped = groupByCategory(monthExpenses, categories).sort((a, b) => b.total - a.total);
    const total = grouped.reduce((s, g) => s + g.total, 0);
    return grouped.slice(0, 6).map((g) => ({ name: g.category.name, total: g.total, pct: total > 0 ? (g.total / total) * 100 : 0, color: g.category.color }));
  }, [monthExpenses, categories]);

  // Salud financiera
  const health = useMemo(() => {
    const cap = getMonthlySavingCapacity(transactions, now, 3);
    return getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() });
  }, [transactions, getTotalMonthlyPayment]);

  const healthColor = health.score >= 80 ? '#bdd200' : health.score >= 60 ? '#50d8e9' : health.score >= 40 ? '#ffb689' : '#ffb4ab';

  return (
    <div className="max-w-[1728px] mx-auto p-margin-safe lg:p-xl space-y-xl w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-border-subtle pb-lg">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="bg-surface-container-highest px-sm py-xs rounded font-mono-data text-mono-data text-primary uppercase border border-border-subtle">{MONTHS_SHORT_ES[m]} {y}</span>
            <span className="flex items-center gap-xs font-mono-data text-mono-data text-tertiary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" /> Generado
            </span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">Reportes</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Análisis de salud financiera, tendencia y distribución del gasto.</p>
        </div>
      </header>

      {/* KPIs salud */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
          <div className="flex justify-between items-start">
            <span className="font-mono-data text-mono-data text-text-muted">SALUD FINANCIERA</span>
            <MS name="favorite" className="text-[16px]" style={{ color: healthColor }} />
          </div>
          <span className="font-headline-md text-headline-md tracking-tighter" style={{ color: healthColor }}>{health.score}<span className="text-text-muted text-[18px]">/100</span></span>
          <span className="font-label-sm text-label-sm" style={{ color: healthColor }}>{health.label}</span>
        </div>
        <Kpi l="TASA DE AHORRO" v={`${(health.savingsRate * 100).toFixed(0)}%`} d={health.savingsRate >= 0.2 ? 'Saludable' : 'Mejorable'} c={health.savingsRate >= 0.2 ? 'text-tertiary' : 'text-accent-warning'} icon="savings" />
        <Kpi l="GASTO DEL MES" v={fmt(monthExpenses.reduce((s, t) => s + Number(t.amount) - Number(t.cashbackEarned || 0), 0))} d={`${monthExpenses.length} mov.`} c="text-on-surface-variant" icon="payments" />
        <Kpi l="CATEGORÍAS" v={String(byCat.length)} d="con gasto" c="text-on-surface-variant" icon="category" />
      </section>

      {/* Tendencia + categorías */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">BALANCE NETO · 12 MESES</h2>
            <MS name="show_chart" className="text-text-muted text-[16px]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bec2ff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#bec2ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="net" stroke="#bec2ff" strokeWidth={2} fill="url(#repArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
          <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
            <h2 className="font-mono-data text-mono-data text-on-surface-variant">GASTO POR CATEGORÍA</h2>
            <MS name="donut_small" className="text-text-muted text-[16px]" />
          </div>
          {byCat.length === 0 ? (
            <p className="font-body-md text-body-md text-text-muted py-md text-center">Sin gastos este mes.</p>
          ) : (
            <div className="flex flex-col gap-md">
              {byCat.map((r) => (
                <div key={r.name} className="flex flex-col gap-xs">
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface">
                    <span>{r.name}</span><span className="font-mono-data text-text-muted">{fmt(r.total)}</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${r.pct}%`, background: r.color || '#bec2ff' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ l, v, d, c, icon }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-mono-data text-mono-data text-text-muted">{l}</span>
        <MS name={icon} className={`text-[16px] ${c}`} />
      </div>
      <span className="font-headline-md text-headline-md text-on-background tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">{v}</span>
      <span className={`font-label-sm text-label-sm ${c}`}>{d}</span>
    </div>
  );
}
