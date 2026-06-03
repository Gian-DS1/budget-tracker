# Reportes — centro de análisis · Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Reportes en un centro de análisis temporal con 4 visualizaciones nuevas (ingresos vs gastos por mes, tendencia de categorías, comparativa mes vs anterior, tarjetas de insight) + selector de rango (6/12/24 meses), alineado en identidad con el Dashboard pero con visualizaciones distintas.

**Architecture:** Shell delgado `StitchReports.jsx` + carpeta `screens/reports/` con selectores PUROS testeables + sub-componentes de visualización + primitivas Ui. Los selectores reusan `getEffectiveAmount`/`groupByCategory` de utils; la salud reusa `getFinancialHealthScore` + `getMonthlySavingCapacity(..,3,true)` (incluye mes actual, como el Dashboard).

**Tech Stack:** Vite + React 19, Zustand 5, Recharts, Vitest, Material Symbols.

**Spec:** `docs/superpowers/specs/2026-06-03-reportes-centro-analisis-design.md`

**Restricción:** Rama `rebuild/stitch-pure`, todo local. NO push, NO merge.

**Datos verificados (código vivo):**
- `getEffectiveAmount(t)` = `Number(t.amount) - Number(t.cashbackEarned||0)` (utils/calculations.js).
- `groupByCategory(txs, categories)` → `[{ category:{name,color,...}, transactions, total }]`, `total` ya neto de cashback. Categoría faltante → `{ name:'Sin Categoría', color:'#94a3b8' }`.
- `getMonthlySavingCapacity(txs, refDate, monthsBack, includeCurrent)` y `getFinancialHealthScore({avgIncome,avgExpense,monthlyDebt})` → `{score,label,savingsRate}`.
- Tipos de gasto: `['expense','fixed_expense','variable_expense']`. Ingreso: `'income'`.
- `MONTHS_SHORT_ES` de `utils/constants`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/stitch/screens/reports/selectors.js` | Crear | 4 selectores puros: `getIncomeVsExpenseSeries`, `getCategoryTrend`, `getMonthComparison`, `getInsights`. |
| `src/stitch/screens/reports/selectors.test.js` | Crear | Tests TDD de los 4 selectores. |
| `src/stitch/screens/reports/reportsUi.jsx` | Crear | `ReportCard`, `InsightCard`, `Kpi`. |
| `src/stitch/screens/reports/IncomeExpenseBars.jsx` | Crear | Barras agrupadas ingresos vs gastos. |
| `src/stitch/screens/reports/CategoryTrendLines.jsx` | Crear | Líneas multi-serie de tendencia. |
| `src/stitch/screens/reports/MonthComparison.jsx` | Crear | Barras divergentes vs mes anterior. |
| `src/stitch/screens/reports/InsightsRow.jsx` | Crear | 4 tarjetas de insight. |
| `src/stitch/screens/StitchReports.jsx` | Reescribir | Shell: header + selector de rango + KPIs salud + las 4 visualizaciones, con Stagger. |

---

## Task 1: selectors.js — 4 selectores puros + tests (TDD)

**Files:**
- Create: `src/stitch/screens/reports/selectors.js`
- Test: `src/stitch/screens/reports/selectors.test.js`

- [ ] **Step 1: Escribir los tests primero**

Create `src/stitch/screens/reports/selectors.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getIncomeVsExpenseSeries, getCategoryTrend, getMonthComparison, getInsights } from './selectors';

// refDate fijo para tests deterministas: 15 jun 2026.
const REF = new Date(2026, 5, 15);
const cats = [
  { id: 'c1', name: 'Supermercado', color: '#aaa' },
  { id: 'c2', name: 'Transporte', color: '#bbb' },
];
// helper: transacción en un mes/año dado
const tx = (y, m, categoryId, amount, type = 'variable_expense', cashbackEarned = 0) =>
  ({ date: `${y}-${String(m + 1).padStart(2, '0')}-10`, categoryId, amount, type, cashbackEarned });

describe('getIncomeVsExpenseSeries', () => {
  it('devuelve un punto por mes del rango terminando en refDate', () => {
    const r = getIncomeVsExpenseSeries([], 6, REF);
    expect(r).toHaveLength(6);
    expect(r[5].label).toBe('Jun'); // último = mes de refDate
    expect(r[0]).toEqual({ label: 'Ene', income: 0, expense: 0 });
  });

  it('separa ingreso y gasto y resta cashback del gasto', () => {
    const txs = [
      tx(2026, 5, 'c1', 5000, 'income'),
      tx(2026, 5, 'c1', 1000, 'variable_expense', 100),
      tx(2026, 5, 'c2', 500, 'fixed_expense'),
    ];
    const r = getIncomeVsExpenseSeries(txs, 6, REF);
    const jun = r[5];
    expect(jun.income).toBe(5000);
    expect(jun.expense).toBe(1400); // (1000-100) + 500
  });

  it('respeta el largo del rango (12, 24)', () => {
    expect(getIncomeVsExpenseSeries([], 12, REF)).toHaveLength(12);
    expect(getIncomeVsExpenseSeries([], 24, REF)).toHaveLength(24);
  });
});

describe('getCategoryTrend', () => {
  it('sin gastos → series vacías', () => {
    const r = getCategoryTrend([], cats, 6, REF);
    expect(r.series).toEqual([]);
  });

  it('una serie por top categoría con un punto por mes', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), // may
      tx(2026, 5, 'c1', 2000), // jun
      tx(2026, 5, 'c2', 300),
    ];
    const r = getCategoryTrend(txs, cats, 6, REF, 5);
    expect(r.months).toHaveLength(6);
    const sm = r.series.find((s) => s.name === 'Supermercado');
    expect(sm).toBeTruthy();
    expect(sm.data).toHaveLength(6);
    expect(sm.data[4]).toBe(1000); // may
    expect(sm.data[5]).toBe(2000); // jun
  });

  it('limita a topN categorías por gasto total', () => {
    const txs = [tx(2026, 5, 'c1', 5000), tx(2026, 5, 'c2', 100)];
    const r = getCategoryTrend(txs, cats, 6, REF, 1);
    expect(r.series).toHaveLength(1);
    expect(r.series[0].name).toBe('Supermercado');
  });
});

describe('getMonthComparison', () => {
  it('calcula delta vs mes anterior por categoría', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), // may (anterior)
      tx(2026, 5, 'c1', 1500), // jun (actual)
    ];
    const r = getMonthComparison(txs, cats, REF);
    const sm = r.find((x) => x.name === 'Supermercado');
    expect(sm.current).toBe(1500);
    expect(sm.previous).toBe(1000);
    expect(sm.deltaPct).toBeCloseTo(50);
  });

  it('categoría nueva (sin mes anterior) → deltaPct null', () => {
    const txs = [tx(2026, 5, 'c2', 800)];
    const r = getMonthComparison(txs, cats, REF);
    const tr = r.find((x) => x.name === 'Transporte');
    expect(tr.previous).toBe(0);
    expect(tr.deltaPct).toBeNull();
  });

  it('ordena por magnitud de cambio absoluto desc', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), tx(2026, 5, 'c1', 1100), // delta 100
      tx(2026, 4, 'c2', 200), tx(2026, 5, 'c2', 900),  // delta 700
    ];
    const r = getMonthComparison(txs, cats, REF);
    expect(r[0].name).toBe('Transporte'); // mayor cambio absoluto primero
  });
});

describe('getInsights', () => {
  it('sin datos → valores seguros', () => {
    const r = getInsights([], 6, REF);
    expect(r.avgMonthlyExpense).toBe(0);
    expect(r.topMonth).toBeNull();
    expect(r.topCategory).toBeNull();
    expect(r.avgSavingsRate).toBe(0);
  });

  it('promedio de gasto solo sobre meses con actividad + mes y categoría top', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000, 'variable_expense'),
      tx(2026, 5, 'c1', 3000, 'variable_expense'),
      tx(2026, 5, 'c2', 500, 'fixed_expense'),
      tx(2026, 5, 'c1', 8000, 'income'),
    ];
    const r = getInsights(txs, 6, REF);
    // meses con gasto: may (1000) y jun (3500) → promedio 2250
    expect(r.avgMonthlyExpense).toBeCloseTo(2250);
    expect(r.topMonth.label).toBe('Jun');
    expect(r.topMonth.amount).toBeCloseTo(3500);
    expect(r.topCategory.name).toBe('Supermercado'); // 1000+3000=4000 > 500
    expect(r.topCategory.amount).toBeCloseTo(4000);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- reports/selectors`
Expected: FAIL (no se resuelve `./selectors`).

- [ ] **Step 3: Implementar selectors.js**

Create `src/stitch/screens/reports/selectors.js`:

```js
// Selectores analíticos puros de Reportes. Operan sobre transacciones ya
// cargadas; reusan getEffectiveAmount/groupByCategory de utils. Todos toman un
// rango en meses y una refDate (último mes del rango).
import { getEffectiveAmount, groupByCategory } from '../../../utils/calculations';
import { MONTHS_SHORT_ES } from '../../../utils/constants';

const EXPENSE_TYPES = ['expense', 'fixed_expense', 'variable_expense'];
const isExpense = (t) => EXPENSE_TYPES.includes(t.type);

// Lista de {y, m} para los `range` meses que terminan en refDate (incluido).
function monthsRange(range, refDate) {
  const out = [];
  for (let i = range - 1; i >= 0; i--) {
    let m = refDate.getMonth() - i;
    let y = refDate.getFullYear();
    while (m < 0) { m += 12; y -= 1; }
    out.push({ y, m });
  }
  return out;
}

const inMonth = (t, y, m) => {
  if (!t.date) return false;
  const d = new Date(t.date + 'T00:00:00');
  return d.getFullYear() === y && d.getMonth() === m;
};

// Ingreso y gasto (neto de cashback) por mes del rango.
export function getIncomeVsExpenseSeries(transactions, range, refDate = new Date()) {
  return monthsRange(range, refDate).map(({ y, m }) => {
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (!inMonth(t, y, m)) continue;
      if (t.type === 'income') income += Number(t.amount) || 0;
      else if (isExpense(t)) expense += getEffectiveAmount(t);
    }
    return { label: MONTHS_SHORT_ES[m], income, expense };
  });
}

// Tendencia de gasto de las topN categorías a lo largo del rango.
export function getCategoryTrend(transactions, categories, range, refDate = new Date(), topN = 5) {
  const months = monthsRange(range, refDate);
  const expenses = transactions.filter(isExpense);
  if (expenses.length === 0) return { months: months.map((x) => MONTHS_SHORT_ES[x.m]), series: [] };

  // Top categorías por gasto total en el rango.
  const inRange = expenses.filter((t) => months.some(({ y, m }) => inMonth(t, y, m)));
  const grouped = groupByCategory(inRange, categories).sort((a, b) => b.total - a.total).slice(0, topN);

  const series = grouped.map((g) => ({
    name: g.category.name,
    color: g.category.color || '#bec2ff',
    data: months.map(({ y, m }) => g.transactions
      .filter((t) => inMonth(t, y, m))
      .reduce((s, t) => s + getEffectiveAmount(t), 0)),
  }));
  return { months: months.map((x) => MONTHS_SHORT_ES[x.m]), series };
}

// Comparativa por categoría: mes actual vs mes anterior (relativo a refDate).
export function getMonthComparison(transactions, categories, refDate = new Date()) {
  const curY = refDate.getFullYear(), curM = refDate.getMonth();
  let prevM = curM - 1, prevY = curY;
  if (prevM < 0) { prevM = 11; prevY -= 1; }

  const expenses = transactions.filter(isExpense);
  const map = new Map(); // name -> { name, color, current, previous }
  const bump = (t, key) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const name = cat?.name || 'Sin categoría';
    const color = cat?.color || '#94a3b8';
    if (!map.has(name)) map.set(name, { name, color, current: 0, previous: 0 });
    map.get(name)[key] += getEffectiveAmount(t);
  };
  for (const t of expenses) {
    if (inMonth(t, curY, curM)) bump(t, 'current');
    else if (inMonth(t, prevY, prevM)) bump(t, 'previous');
  }
  return [...map.values()]
    .map((x) => ({
      ...x,
      deltaPct: x.previous > 0 ? ((x.current - x.previous) / x.previous) * 100 : null,
    }))
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous));
}

// Insights derivados del rango.
export function getInsights(transactions, range, refDate = new Date()) {
  const months = monthsRange(range, refDate);
  const expenses = transactions.filter(isExpense);

  // Gasto por mes (del rango).
  const perMonth = months.map(({ y, m }) => ({
    label: MONTHS_SHORT_ES[m],
    amount: expenses.filter((t) => inMonth(t, y, m)).reduce((s, t) => s + getEffectiveAmount(t), 0),
  }));
  const monthsWithExpense = perMonth.filter((x) => x.amount > 0);
  const avgMonthlyExpense = monthsWithExpense.length
    ? monthsWithExpense.reduce((s, x) => s + x.amount, 0) / monthsWithExpense.length
    : 0;
  const topMonth = monthsWithExpense.length
    ? monthsWithExpense.reduce((best, x) => (x.amount > best.amount ? x : best))
    : null;

  // Categoría más cara del rango.
  const inRange = expenses.filter((t) => months.some(({ y, m }) => inMonth(t, y, m)));
  const grouped = groupByCategory(inRange, []).sort((a, b) => b.total - a.total);
  const topCategory = grouped.length ? { name: grouped[0].category.name, amount: grouped[0].total } : null;

  // Tasa de ahorro promedio sobre meses con ingreso.
  const rates = [];
  for (const { y, m } of months) {
    let inc = 0, exp = 0;
    for (const t of transactions) {
      if (!inMonth(t, y, m)) continue;
      if (t.type === 'income') inc += Number(t.amount) || 0;
      else if (isExpense(t)) exp += getEffectiveAmount(t);
    }
    if (inc > 0) rates.push((inc - exp) / inc);
  }
  const avgSavingsRate = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;

  return { avgMonthlyExpense, topMonth, topCategory, avgSavingsRate };
}
```

NOTA sobre `getInsights` topCategory: se llama `groupByCategory(inRange, [])` con
categorías vacías a propósito — `groupByCategory` cae a `{ name:'Sin Categoría' }`
solo si no encuentra la categoría; como aquí pasamos `[]`, SIEMPRE caería a "Sin
Categoría", perdiendo el nombre. CORRECCIÓN: pasar las categorías reales. El
`getInsights` recibe solo transactions/range/refDate por firma; para resolver el
nombre necesita las categorías. **Ajuste de firma:** `getInsights(transactions,
categories, range, refDate)`. Ver Step 3b.

- [ ] **Step 3b: Corregir la firma de getInsights para recibir categories**

En `selectors.js`, cambiar la firma y el uso de `groupByCategory`:
```js
export function getInsights(transactions, categories, range, refDate = new Date()) {
```
y dentro:
```js
  const grouped = groupByCategory(inRange, categories).sort((a, b) => b.total - a.total);
```
En `selectors.test.js`, actualizar las dos llamadas de `getInsights` para pasar `cats`:
```js
    const r = getInsights([], cats, 6, REF);
```
```js
    const r = getInsights(txs, cats, 6, REF);
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- reports/selectors`
Expected: PASS (todos los describe).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/reports/selectors.js src/stitch/screens/reports/selectors.test.js
git commit -m "feat(reportes): selectores analíticos puros + tests"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 2: reportsUi.jsx — primitivas

**Files:**
- Create: `src/stitch/screens/reports/reportsUi.jsx`

- [ ] **Step 1: Crear las primitivas**

Create `src/stitch/screens/reports/reportsUi.jsx`:

```jsx
// Primitivas de UI de Reportes. Estilo surface-panel/glass consistente con el tema.
import MS from '../../MS';

// Panel de reporte: marco + título mono + icono + contenido.
export function ReportCard({ title, icon, className = '', children }) {
  return (
    <div className={`bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-md border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant uppercase">{title}</h2>
        {icon && <MS name={icon} className="!text-[16px] text-text-muted" />}
      </div>
      {children}
    </div>
  );
}

// Tarjeta de insight: número grande + etiqueta + icono.
export function InsightCard({ label, value, sub, icon, cls = 'text-on-surface' }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>
        {icon && <MS name={icon} className={`!text-[16px] ${cls}`} />}
      </div>
      <span className={`font-headline-md text-[22px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${cls}`}>{value}</span>
      {sub && <span className="font-label-sm text-label-sm text-text-muted">{sub}</span>}
    </div>
  );
}

// KPI de salud (igual estilo que InsightCard pero con color semántico en el valor).
export function Kpi({ l, v, d, c = 'text-on-surface-variant', icon }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">{l}</span>
        {icon && <MS name={icon} className={`!text-[16px] ${c}`} />}
      </div>
      <span className="font-headline-md text-headline-md tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{v}</span>
      <span className={`font-label-sm text-label-sm ${c}`}>{d}</span>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/reports/reportsUi.jsx
git commit -m "feat(reportes): primitivas de UI (ReportCard/InsightCard/Kpi)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 3: IncomeExpenseBars.jsx

**Files:**
- Create: `src/stitch/screens/reports/IncomeExpenseBars.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/reports/IncomeExpenseBars.jsx`:

```jsx
// Barras agrupadas: ingreso vs gasto por mes. Tooltip fijo con ambos + balance.
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const bal = d.income - d.expense;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-tertiary">Ingresos {fmt(d.income)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">Gastos {fmt(d.expense)}</div>
      <div className="font-mono-data text-mono-data text-on-surface">Balance {fmt(bal)}</div>
    </div>
  );
}

export default function IncomeExpenseBars({ data }) {
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0);
  if (!hasData) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Sin movimientos en el periodo.</p>;
  }
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2} barCategoryGap="20%">
          <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
          <Tooltip content={<Tip />} isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9a9da3' }} />
          <Bar dataKey="income" name="Ingresos" fill="#bdd200" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expense" name="Gastos" fill="#ffb4ab" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/reports/IncomeExpenseBars.jsx
git commit -m "feat(reportes): barras agrupadas ingresos vs gastos"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 4: CategoryTrendLines.jsx

**Files:**
- Create: `src/stitch/screens/reports/CategoryTrendLines.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/reports/CategoryTrendLines.jsx`:

```jsx
// Líneas multi-serie: gasto de las top categorías a lo largo del periodo.
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="font-mono-data text-mono-data" style={{ color: p.stroke }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

export default function CategoryTrendLines({ months, series }) {
  if (!series || series.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Sin gastos para analizar tendencia.</p>;
  }
  // Recharts consume filas: [{ label, <catName>: value, ... }]
  const rows = months.map((label, i) => {
    const row = { label };
    series.forEach((s) => { row[s.name] = s.data[i]; });
    return row;
  });
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
          <Tooltip content={<Tip />} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9a9da3' }} />
          {series.map((s) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/reports/CategoryTrendLines.jsx
git commit -m "feat(reportes): líneas de tendencia de categorías"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 5: MonthComparison.jsx

**Files:**
- Create: `src/stitch/screens/reports/MonthComparison.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/reports/MonthComparison.jsx`. Lista de categorías con
barra divergente centrada: subió (error, derecha), bajó (tertiary, izquierda).
Recibe `data` de `getMonthComparison` (ya ordenada). Muestra top 8.

```jsx
// Comparativa mes actual vs anterior por categoría: barra divergente + delta %.
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function MonthComparison({ data }) {
  const rows = (data || []).filter((d) => d.current > 0 || d.previous > 0).slice(0, 8);
  if (rows.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">Necesita dos meses de datos para comparar.</p>;
  }
  // Escala: mayor cambio absoluto define el 100% de la mitad de la barra.
  const maxDelta = Math.max(1, ...rows.map((d) => Math.abs(d.current - d.previous)));

  return (
    <div className="flex flex-col gap-md">
      {rows.map((d) => {
        const delta = d.current - d.previous;
        const up = delta > 0;
        const widthPct = (Math.abs(delta) / maxDelta) * 50; // 0..50% del ancho total
        const isNew = d.previous === 0;
        return (
          <div key={d.name} className="flex items-center gap-sm">
            <span className="font-label-sm text-label-sm text-on-surface w-[120px] truncate shrink-0">{d.name}</span>
            {/* riel divergente: centro = sin cambio */}
            <div className="relative flex-grow h-3 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border-subtle" />
              <div
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  background: up ? '#ffb4ab' : '#bdd200',
                  width: `${widthPct}%`,
                  left: up ? '50%' : `${50 - widthPct}%`,
                }}
              />
            </div>
            <span className={`font-mono-data text-mono-data shrink-0 w-[64px] text-right ${up ? 'text-accent-error' : 'text-tertiary'}`}>
              {isNew ? 'nuevo' : `${up ? '+' : ''}${d.deltaPct.toFixed(0)}%`}
            </span>
            <span className="font-mono-data text-mono-data text-text-muted shrink-0 w-[90px] text-right hidden sm:inline">{fmt(d.current)}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/reports/MonthComparison.jsx
git commit -m "feat(reportes): comparativa divergente mes vs anterior"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 6: InsightsRow.jsx

**Files:**
- Create: `src/stitch/screens/reports/InsightsRow.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/reports/InsightsRow.jsx`:

```jsx
// 4 tarjetas de insight derivadas del periodo. Recibe el objeto de getInsights.
import { InsightCard } from './reportsUi';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function InsightsRow({ insights }) {
  const { avgMonthlyExpense, topMonth, topCategory, avgSavingsRate } = insights;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
      <InsightCard label="Gasto mensual promedio" icon="trending_flat" value={fmt(avgMonthlyExpense)} sub="en el periodo" />
      <InsightCard label="Mes de mayor gasto" icon="trending_up" cls="text-accent-warning"
        value={topMonth ? topMonth.label : '—'} sub={topMonth ? fmt(topMonth.amount) : 'Sin datos'} />
      <InsightCard label="Categoría más cara" icon="local_fire_department" cls="text-accent-error"
        value={topCategory ? topCategory.name : '—'} sub={topCategory ? fmt(topCategory.amount) : 'Sin datos'} />
      <InsightCard label="Tasa de ahorro promedio" icon="savings"
        cls={avgSavingsRate >= 0.2 ? 'text-tertiary' : 'text-on-surface-variant'}
        value={`${(avgSavingsRate * 100).toFixed(0)}%`} sub="del ingreso" />
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/reports/InsightsRow.jsx
git commit -m "feat(reportes): tarjetas de insight (promedios y récords)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 7: StitchReports.jsx — shell + selector de rango + integración

**Files:**
- Modify (reescribir): `src/stitch/screens/StitchReports.jsx`

- [ ] **Step 1: Reescribir el shell**

Replace the entire contents of `src/stitch/screens/StitchReports.jsx` with:

```jsx
// Reportes — centro de análisis: KPIs de salud + 4 visualizaciones temporales
// con selector de rango (6/12/24 meses). Lógica pura en reports/selectors.js;
// salud reusa utils (incluye mes actual, como el Dashboard). Solo lectura.
import { useMemo, useState } from 'react';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import MS from '../MS';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import { getFinancialHealthScore, getMonthlySavingCapacity } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';
import { getIncomeVsExpenseSeries, getCategoryTrend, getMonthComparison, getInsights } from './reports/selectors';
import { ReportCard, Kpi } from './reports/reportsUi';
import IncomeExpenseBars from './reports/IncomeExpenseBars';
import CategoryTrendLines from './reports/CategoryTrendLines';
import MonthComparison from './reports/MonthComparison';
import InsightsRow from './reports/InsightsRow';

const fmt = (n) => formatCurrency(n);

const RANGE_OPTIONS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
];

export default function StitchReports() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const now = useMemo(() => new Date(), []);
  const y = now.getFullYear();
  const m = now.getMonth();
  const [range, setRange] = useState(12);

  // Salud (incluye el mes actual, honesta y reactiva — como el Dashboard).
  const cap = useMemo(() => getMonthlySavingCapacity(transactions, now, 3, true), [transactions, now]);
  const health = useMemo(() => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() }), [cap, getTotalMonthlyPayment]);
  const healthColor = health.score >= 80 ? '#bdd200' : health.score >= 60 ? '#50d8e9' : health.score >= 40 ? '#ffb689' : '#ffb4ab';

  // Gasto del mes actual (para el KPI).
  const monthExpenses = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === y && d.getMonth() === m && ['expense', 'fixed_expense', 'variable_expense'].includes(t.type);
  }), [transactions, y, m]);
  const monthExpenseTotal = useMemo(() => monthExpenses.reduce((s, t) => s + Number(t.amount) - Number(t.cashbackEarned || 0), 0), [monthExpenses]);

  // Análisis temporales (dependen del rango).
  const incomeExpense = useMemo(() => getIncomeVsExpenseSeries(transactions, range, now), [transactions, range, now]);
  const trend = useMemo(() => getCategoryTrend(transactions, categories, range, now, 5), [transactions, categories, range, now]);
  const comparison = useMemo(() => getMonthComparison(transactions, categories, now), [transactions, categories, now]);
  const insights = useMemo(() => getInsights(transactions, categories, range, now), [transactions, categories, range, now]);

  return (
    <div className="max-w-[1728px] mx-auto p-md sm:p-margin-safe w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-lg border-b border-border-subtle pb-lg mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="bg-surface-container-highest px-sm py-xs rounded font-mono-data text-mono-data text-primary uppercase border border-border-subtle">{MONTHS_SHORT_ES[m]} {y}</span>
            <span className="flex items-center gap-xs font-mono-data text-mono-data text-tertiary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary status-glow-live" /> Centro de análisis
            </span>
          </div>
          <h1 className="font-hero-headline text-headline-lg md:text-[56px] text-on-background tracking-tighter leading-none">Reportes</h1>
          <p className="font-body-md text-body-md text-text-muted mt-sm max-w-2xl">Análisis de salud financiera, tendencias y distribución del gasto en el tiempo.</p>
        </div>
        <div className="w-[200px] self-start md:self-end">
          <StitchSelect value={String(range)} onChange={(v) => setRange(Number(v))} options={RANGE_OPTIONS} compact />
        </div>
      </header>

      <Stagger className="flex flex-col gap-gutter">
        {/* KPIs salud */}
        <Stagger.Item className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">SALUD FINANCIERA</span>
              <MS name="favorite" className="!text-[16px]" style={{ color: healthColor }} />
            </div>
            <span className="font-headline-md text-headline-md tracking-tight" style={{ color: healthColor }}>{health.score}<span className="text-text-muted text-[18px]">/100</span></span>
            <span className="font-label-sm text-label-sm" style={{ color: healthColor }}>{health.label}</span>
          </div>
          <Kpi l="TASA DE AHORRO" v={`${(health.savingsRate * 100).toFixed(0)}%`} d={health.savingsRate >= 0.2 ? 'Saludable' : 'Mejorable'} c={health.savingsRate >= 0.2 ? 'text-tertiary' : 'text-accent-warning'} icon="savings" />
          <Kpi l="GASTO DEL MES" v={fmt(monthExpenseTotal)} d={`${monthExpenses.length} mov.`} icon="payments" />
          <Kpi l="MOVIMIENTOS" v={String(transactions.length)} d="en total" icon="receipt_long" />
        </Stagger.Item>

        {/* Ingresos vs gastos por mes */}
        <Stagger.Item>
          <ReportCard title={`Ingresos vs gastos · ${range} meses`} icon="bar_chart">
            <IncomeExpenseBars data={incomeExpense} />
          </ReportCard>
        </Stagger.Item>

        {/* Tendencia de categorías + insights */}
        <Stagger.Item className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2">
            <ReportCard title="Tendencia de categorías" icon="show_chart" className="h-full">
              <CategoryTrendLines months={trend.months} series={trend.series} />
            </ReportCard>
          </div>
          <div className="lg:col-span-1">
            <InsightsRow insights={insights} />
          </div>
        </Stagger.Item>

        {/* Comparativa mes vs anterior */}
        <Stagger.Item>
          <ReportCard title="Cambios vs mes anterior" icon="compare_arrows">
            <MonthComparison data={comparison} />
          </ReportCard>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build, lint, test**

Run: `npm run lint` → 0 errores (sin imports sin usar: confirma que el shell ya no importa AreaChart/Area/groupByCategory directamente).
Run: `npm run build` → limpio (confirma que todos los sub-componentes y Recharts resuelven).
Run: `npm run test` → 93 + nuevos de reports/selectors pasan.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchReports.jsx
git commit -m "feat(reportes): shell centro de análisis + selector de rango + Stagger"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 8: Verificación de carga + handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Verificación de carga (dev server)**

- `npm run build` (limpio), `npm run lint` (0), `npm run test` (93 + nuevos).
- `npm run dev`; `GET /` → 200; `GET /src/stitch/screens/StitchReports.jsx` (transform) → 200; `GET /src/stitch/screens/reports/selectors.js` → 200.
- En demo: cambiar el rango (6/12/24) recalcula las 4 visualizaciones; barras ingresos/gastos, líneas de tendencia, comparativa divergente, e insights pobladas; placeholders cuando falte data; salud incluye el mes actual.

Anota hallazgos; corrige (commit propio) si algo falla.

- [ ] **Step 2: Actualizar handoff.md**

In `handoff.md`:
- Mover Reportes (`StitchReports.jsx`) de PENDIENTES a PULIDAS (con `screens/reports/`).
- Nota: Reportes es un centro de análisis con 4 visualizaciones temporales nuevas (barras ingreso/gasto, líneas de tendencia, comparativa divergente, insights) + selector de rango; selectores puros testeados; reusa getFinancialHealthScore/groupByCategory.
- "Siguiente paso lógico": Calendario (`StitchCalendar`), conservando el orden (Ajustes, Feedback).
- Actualizar conteo de tests y HEAD.

- [ ] **Step 3: Commit del handoff**

```bash
git add handoff.md
git commit -m "docs(handoff): Reportes pulido (centro de análisis); siguiente=Calendario"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** 4 selectores + tests (T1), primitivas (T2), barras ingreso/gasto (T3), líneas tendencia (T4), comparativa divergente (T5), insights (T6), shell + selector de rango + salud con includeCurrent + Stagger (T7), verificación + handoff (T8). Las 4 visualizaciones, el rango, los 4 insights y la identidad alineada están cubiertos.
- **Placeholder scan:** todo el código está completo. La nota de Step 3/3b corrige conscientemente la firma de `getInsights` (necesita `categories` para resolver el nombre de la categoría top) — queda como `getInsights(transactions, categories, range, refDate)`, y el shell la llama así.
- **Consistencia de tipos/nombres:** `getIncomeVsExpenseSeries→[{label,income,expense}]` → IncomeExpenseBars; `getCategoryTrend→{months,series:[{name,color,data}]}` → CategoryTrendLines; `getMonthComparison→[{name,color,current,previous,deltaPct}]` → MonthComparison; `getInsights→{avgMonthlyExpense,topMonth,topCategory,avgSavingsRate}` → InsightsRow. Coinciden productor↔consumidor.
- **Identidad alineada / visualizaciones distintas:** tooltips `isAnimationActive={false}`, tokens del tema, gradiente/colores consistentes, Stagger, salud con includeCurrent (igual que Dashboard). NO reusa CategoryDonut/FlowChart — usa BarChart/LineChart/divergentes nuevos.
- **YAGNI:** sin export, sin filtros extra, sin persistencia de rango.
