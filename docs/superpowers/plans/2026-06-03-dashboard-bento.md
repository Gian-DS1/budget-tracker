# Dashboard bento estético · Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer el Dashboard como un bento grid estético ordenado por importancia, con AreaChart de Recharts para el flujo y cuatro visualizaciones nuevas (donut de gastos, barra de presupuesto, anillo de salud, barra de patrimonio), reusando utilidades existentes de `src/utils/calculations.js`.

**Architecture:** Shell delgado `StitchDashboard.jsx` + carpeta `screens/dashboard/` (selectores puros testeables + sub-componentes por visualización + primitivas Ui + Stagger). Los selectores ENVUELVEN utilidades ya probadas (`getFinancialHealthScore`, `getMonthlySavingCapacity`, `groupByCategory`, `getBudgetSummary`) en vez de duplicarlas; solo se añaden helpers nuevos puros (breakdown top5+Otros, budget usage, net-worth split).

**Tech Stack:** Vite + React 19, Zustand 5, Recharts (ya en uso en Reportes), Vitest, Material Symbols.

**Spec:** `docs/superpowers/specs/2026-06-03-dashboard-bento-design.md`

**Restricción:** Rama `rebuild/stitch-pure`, todo local. NO push, NO merge.

**Hallazgo clave (reuso):** Reportes ya usa `getFinancialHealthScore({avgIncome,avgExpense,monthlyDebt})` + `getMonthlySavingCapacity(transactions, now, 3)` para la salud, y `groupByCategory(txs, categories)` para el donut. El Dashboard REUSA esas mismas funciones (no se escribe un getHealthScore nuevo). Colores de salud (de Reportes): `score>=80 '#bdd200'`, `>=60 '#50d8e9'`, `>=40 '#ffb689'`, else `'#ffb4ab'`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/stitch/screens/dashboard/selectors.js` | Crear | Helpers puros nuevos: `getCategoryBreakdown`, `getBudgetUsage`, `getNetWorthSplit`. (Salud y serie reusan utils existentes.) |
| `src/stitch/screens/dashboard/selectors.test.js` | Crear | Tests TDD de los tres helpers. |
| `src/stitch/screens/dashboard/dashboardUi.jsx` | Crear | `BentoCell`, `EmptyCell`, `Stat`. |
| `src/stitch/screens/dashboard/FlowChart.jsx` | Crear | AreaChart Recharts (flujo 6 meses). |
| `src/stitch/screens/dashboard/CategoryDonut.jsx` | Crear | Donut PieChart de gastos. |
| `src/stitch/screens/dashboard/BudgetBar.jsx` | Crear | Barra de presupuesto usado. |
| `src/stitch/screens/dashboard/NetWorthBar.jsx` | Crear | Barra apilada ahorro vs deuda. |
| `src/stitch/screens/dashboard/HealthRing.jsx` | Crear | Anillo RadialBar de salud. |
| `src/stitch/screens/dashboard/SignalsRail.jsx` | Crear | Recordatorios (lógica extraída). |
| `src/stitch/screens/StitchDashboard.jsx` | Reescribir | Shell: obtiene datos de stores, llama selectores/utils, arma el bento con Stagger. |

---

## Task 1: selectors.js — helpers puros + tests (TDD)

**Files:**
- Create: `src/stitch/screens/dashboard/selectors.js`
- Test: `src/stitch/screens/dashboard/selectors.test.js`

- [ ] **Step 1: Escribir los tests primero**

Create `src/stitch/screens/dashboard/selectors.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getCategoryBreakdown, getBudgetUsage, getNetWorthSplit } from './selectors';

const cats = [
  { id: 'c1', name: 'Supermercado', color: '#aaa' },
  { id: 'c2', name: 'Transporte', color: '#bbb' },
  { id: 'c3', name: 'Restaurantes', color: '#ccc' },
  { id: 'c4', name: 'Suscripciones', color: '#ddd' },
  { id: 'c5', name: 'Salud', color: '#eee' },
  { id: 'c6', name: 'Ropa', color: '#fff' },
  { id: 'c7', name: 'Otros gastos', color: '#111' },
];
const tx = (categoryId, amount, type = 'variable_expense', cashbackEarned = 0) => ({ categoryId, amount, type, cashbackEarned });

describe('getCategoryBreakdown', () => {
  it('sin gastos → arreglo vacío', () => {
    expect(getCategoryBreakdown([], cats)).toEqual([]);
  });

  it('ignora ingresos y ahorros; resta cashback', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c1', 500, 'savings'), tx('c1', 200, 'variable_expense', 20)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(180); // 200 - 20 cashback
  });

  it('con ≤5 categorías no agrega "Otros"', () => {
    const txs = [tx('c1', 500), tx('c2', 400), tx('c3', 300)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r.map((x) => x.name)).toEqual(['Supermercado', 'Transporte', 'Restaurantes']);
    expect(r.some((x) => x.name === 'Otros')).toBe(false);
  });

  it('con >5 categorías deja top 5 y agrega "Otros" con el resto', () => {
    const txs = [tx('c1', 600), tx('c2', 500), tx('c3', 400), tx('c4', 300), tx('c5', 200), tx('c6', 100), tx('c7', 50)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(6); // top 5 + Otros
    expect(r[5].name).toBe('Otros');
    expect(r[5].value).toBe(150); // 100 + 50
  });

  it('ordena de mayor a menor', () => {
    const txs = [tx('c2', 100), tx('c1', 900)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(900);
  });
});

describe('getBudgetUsage', () => {
  it('sin ingreso ni plan → null', () => {
    expect(getBudgetUsage({ estado: 'neutral', gastosFijosPlan: 0, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 0, variableGastado: 0, ahorroReal: 0 })).toBeNull();
  });

  it('calcula gastado, presupuestado, pct y estado', () => {
    const r = getBudgetUsage({ estado: 'good', gastosFijosPlan: 20000, gastosVariablesPlan: 10000, ahorroPlan: 5000, gastosFijosReal: 18000, variableGastado: 7000, ahorroReal: 5000 });
    expect(r.budgeted).toBe(35000); // 20000+10000+5000
    expect(r.spent).toBe(30000);    // 18000+7000+5000
    expect(r.pct).toBeCloseTo((30000 / 35000) * 100);
    expect(r.estado).toBe('good');
    expect(r.overBudget).toBe(false);
  });

  it('marca sobregiro cuando gastado supera presupuestado', () => {
    const r = getBudgetUsage({ estado: 'danger', gastosFijosPlan: 10000, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 12000, variableGastado: 0, ahorroReal: 0 });
    expect(r.overBudget).toBe(true);
    expect(r.pct).toBe(100); // tope visual
  });
});

describe('getNetWorthSplit', () => {
  it('sin datos → hasData false', () => {
    const r = getNetWorthSplit(0, 0);
    expect(r.hasData).toBe(false);
  });

  it('solo ahorro → 100% ahorro', () => {
    const r = getNetWorthSplit(50000, 0);
    expect(r.savedPct).toBe(100);
    expect(r.debtPct).toBe(0);
    expect(r.netWorth).toBe(50000);
    expect(r.hasData).toBe(true);
  });

  it('ahorro + deuda → proporciones y patrimonio neto', () => {
    const r = getNetWorthSplit(60000, 40000);
    expect(r.savedPct).toBeCloseTo(60);
    expect(r.debtPct).toBeCloseTo(40);
    expect(r.netWorth).toBe(20000);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- dashboard/selectors`
Expected: FAIL (no se resuelve `./selectors`).

- [ ] **Step 3: Implementar selectors.js**

Create `src/stitch/screens/dashboard/selectors.js`:

```js
// Selectores puros del Dashboard. Helpers NUEVOS no cubiertos por utils:
// desglose top5+Otros, uso de presupuesto, split de patrimonio. La salud
// (getFinancialHealthScore) y la capacidad (getMonthlySavingCapacity) se reusan
// directo desde utils/calculations en el shell.
import { groupByCategory } from '../../../utils/calculations';

const OTROS_COLOR = '#6b7280';

// Top 5 categorías de gasto del mes + "Otros". Reusa groupByCategory (que ya
// resta cashback vía getEffectiveAmount). Devuelve [{ name, value, color }].
export function getCategoryBreakdown(monthTransactions, categories) {
  const expenses = monthTransactions.filter((t) =>
    ['expense', 'fixed_expense', 'variable_expense'].includes(t.type));
  if (expenses.length === 0) return [];

  const grouped = groupByCategory(expenses, categories)
    .map((g) => ({ name: g.category.name, value: g.total, color: g.category.color }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
  if (grouped.length === 0) return [];

  if (grouped.length <= 5) return grouped;
  const top = grouped.slice(0, 5);
  const rest = grouped.slice(5).reduce((s, g) => s + g.value, 0);
  return [...top, { name: 'Otros', value: rest, color: OTROS_COLOR }];
}

// Uso del presupuesto del mes a partir del summary de getBudgetSummary.
// Presupuestado = planes fijos+variables+ahorro; gastado = reales+ahorro.
// null si no hay nada presupuestado.
export function getBudgetUsage(summary) {
  const budgeted = (Number(summary.gastosFijosPlan) || 0)
    + (Number(summary.gastosVariablesPlan) || 0)
    + (Number(summary.ahorroPlan) || 0);
  if (budgeted <= 0) return null;
  const spent = (Number(summary.gastosFijosReal) || 0)
    + (Number(summary.variableGastado) || 0)
    + (Number(summary.ahorroReal) || 0);
  const rawPct = (spent / budgeted) * 100;
  return {
    spent,
    budgeted,
    pct: Math.min(100, rawPct),
    overBudget: spent > budgeted,
    estado: summary.estado,
  };
}

// Split patrimonio: proporciones ahorro/deuda y patrimonio neto.
export function getNetWorthSplit(totalSaved, totalDebt) {
  const saved = Number(totalSaved) || 0;
  const debt = Number(totalDebt) || 0;
  const sum = saved + debt;
  return {
    saved,
    debt,
    savedPct: sum > 0 ? (saved / sum) * 100 : 0,
    debtPct: sum > 0 ? (debt / sum) * 100 : 0,
    netWorth: saved - debt,
    hasData: sum > 0,
  };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- dashboard/selectors`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/dashboard/selectors.js src/stitch/screens/dashboard/selectors.test.js
git commit -m "feat(dashboard): selectores puros (breakdown/budget/patrimonio) + tests"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 2: dashboardUi.jsx — primitivas del bento

**Files:**
- Create: `src/stitch/screens/dashboard/dashboardUi.jsx`

- [ ] **Step 1: Crear las primitivas**

Create `src/stitch/screens/dashboard/dashboardUi.jsx`:

```jsx
// Primitivas de UI del Dashboard (celdas del bento). Estilo glass consistente
// con el resto de la app.
import MS from '../../MS';

// Celda del bento: marco glass + título mono opcional + contenido.
export function BentoCell({ title, icon, className = '', children, span = '' }) {
  return (
    <div className={`glass-card rounded-lg inner-glow p-md flex flex-col ${span} ${className}`}>
      {title && (
        <div className="flex justify-between items-center border-b border-border-subtle pb-sm mb-md">
          <span className="font-mono-data text-mono-data text-on-surface-variant uppercase">{title}</span>
          {icon && <MS name={icon} className="!text-[14px] text-text-muted" />}
        </div>
      )}
      {children}
    </div>
  );
}

// Placeholder discreto cuando una celda no tiene datos.
export function EmptyCell({ icon = 'inbox', message }) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center gap-sm py-lg">
      <MS name={icon} className="text-[24px] text-text-muted" />
      <p className="font-body-md text-body-md text-text-muted">{message}</p>
    </div>
  );
}

// Métrica KPI compacta.
export function Stat({ label, value, cls = 'text-on-surface', sub, warn }) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="font-mono-data text-mono-data text-text-muted uppercase">{label}</span>
      <span className={`font-headline-md text-[20px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${cls}`}>{value}</span>
      {sub && <span className={`font-label-sm text-label-sm flex items-center gap-xs ${cls}`}>{warn && <MS name="warning" className="!text-[13px]" />}{sub}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/dashboard/dashboardUi.jsx
git commit -m "feat(dashboard): primitivas del bento (BentoCell/EmptyCell/Stat)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 3: FlowChart.jsx — AreaChart del flujo

**Files:**
- Create: `src/stitch/screens/dashboard/FlowChart.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/dashboard/FlowChart.jsx`:

```jsx
// Flujo 6 meses: AreaChart de Recharts (balance neto), gradiente periwinkle,
// tooltip con ingresos/gastos/neto. Mismo lenguaje visual que Reportes.
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

function FlowTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface uppercase mb-xs">{label}</div>
      <div className="font-mono-data text-mono-data text-tertiary">Ingresos {fmt(d.inc)}</div>
      <div className="font-mono-data text-mono-data text-accent-error">Gastos {fmt(d.exp)}</div>
      <div className="font-mono-data text-mono-data text-on-surface">Neto {fmt(d.net)}</div>
    </div>
  );
}

export default function FlowChart({ series }) {
  const hasData = series.some((s) => s.inc !== 0 || s.exp !== 0);
  if (!hasData) return <EmptyCell icon="show_chart" message="Aún sin movimientos para graficar." />;
  return (
    <div className="flex-grow min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="dashFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bec2ff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#bec2ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: '#9a9da3', fontSize: 10 }} axisLine={{ stroke: '#232426' }} tickLine={false} />
          <Tooltip content={<FlowTip />} />
          <Area type="monotone" dataKey="net" stroke="#bec2ff" strokeWidth={2} fill="url(#dashFlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio (confirma import de recharts).
```bash
git add src/stitch/screens/dashboard/FlowChart.jsx
git commit -m "feat(dashboard): FlowChart con Recharts (reemplaza polígono casero)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 4: CategoryDonut.jsx — donut de gastos

**Files:**
- Create: `src/stitch/screens/dashboard/CategoryDonut.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/dashboard/CategoryDonut.jsx`:

```jsx
// Donut de gastos del mes por categoría (top 5 + Otros). Centro = gasto total.
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

function DonutTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-card border border-border-subtle rounded p-sm inner-glow">
      <div className="font-mono-data text-mono-data text-on-surface">{d.name}</div>
      <div className="font-mono-data text-mono-data text-text-muted">{fmt(d.value)} · {d.pct.toFixed(0)}%</div>
    </div>
  );
}

export default function CategoryDonut({ data }) {
  if (!data || data.length === 0) return <EmptyCell icon="donut_small" message="Sin gastos registrados este mes." />;
  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));

  return (
    <div className="flex-grow flex items-center gap-md min-h-[200px]">
      <div className="relative w-[140px] h-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={withPct} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={2} stroke="none">
              {withPct.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<DonutTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono-data text-[9px] text-text-muted uppercase">Total</span>
          <span className="font-headline-md text-[13px] text-on-surface">{fmt(total)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-xs min-w-0 flex-grow">
        {withPct.map((d, i) => (
          <div key={i} className="flex items-center gap-xs font-mono-data text-mono-data">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-on-surface-variant truncate flex-grow">{d.name}</span>
            <span className="text-text-muted shrink-0">{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/dashboard/CategoryDonut.jsx
git commit -m "feat(dashboard): donut de gastos por categoría (top 5 + Otros)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 5: BudgetBar.jsx + NetWorthBar.jsx

**Files:**
- Create: `src/stitch/screens/dashboard/BudgetBar.jsx`
- Create: `src/stitch/screens/dashboard/NetWorthBar.jsx`

- [ ] **Step 1: Crear BudgetBar**

Create `src/stitch/screens/dashboard/BudgetBar.jsx`:

```jsx
// Barra de uso del presupuesto del mes (gastado vs presupuestado).
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

const COLOR = { good: 'bg-tertiary', warning: 'bg-accent-warning', danger: 'bg-accent-error', neutral: 'bg-primary' };
const TEXT = { good: 'text-tertiary', warning: 'text-accent-warning', danger: 'text-accent-error', neutral: 'text-on-surface' };

export default function BudgetBar({ usage }) {
  if (!usage) return <EmptyCell icon="savings" message="Define un presupuesto para ver tu avance." />;
  const bar = usage.overBudget ? 'bg-accent-error' : (COLOR[usage.estado] || 'bg-primary');
  const txt = usage.overBudget ? 'text-accent-error' : (TEXT[usage.estado] || 'text-on-surface');
  return (
    <div className="flex-grow flex flex-col justify-center gap-sm min-h-[120px]">
      <div className="flex justify-between items-baseline">
        <span className={`font-headline-md text-[22px] tracking-tight ${txt}`}>{usage.pct.toFixed(0)}%</span>
        <span className="font-mono-data text-mono-data text-text-muted">{fmt(usage.spent)} de {fmt(usage.budgeted)}</span>
      </div>
      <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${usage.pct}%` }} />
      </div>
      {usage.overBudget && (
        <span className="font-mono-data text-mono-data text-accent-error normal-case tracking-normal">Superaste lo presupuestado este mes.</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear NetWorthBar**

Create `src/stitch/screens/dashboard/NetWorthBar.jsx`:

```jsx
// Barra apilada ahorro vs deuda + patrimonio neto.
import { formatCurrency } from '../../../utils/formatters';
import { EmptyCell } from './dashboardUi';

const fmt = (n) => formatCurrency(n);

export default function NetWorthBar({ split }) {
  if (!split.hasData) return <EmptyCell icon="account_balance" message="Aún sin ahorros ni deudas registrados." />;
  return (
    <div className="flex-grow flex flex-col justify-center gap-md min-h-[120px]">
      <div className="flex justify-between items-baseline">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">Patrimonio neto</span>
        <span className={`font-headline-md text-[20px] tracking-tight ${split.netWorth >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>{fmt(split.netWorth)}</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-highest">
        <div className="h-full bg-tertiary" style={{ width: `${split.savedPct}%` }} />
        <div className="h-full bg-accent-error" style={{ width: `${split.debtPct}%` }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data">
        <span className="text-tertiary">Ahorro {fmt(split.saved)}</span>
        <span className="text-accent-error">Deuda {fmt(split.debt)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/dashboard/BudgetBar.jsx src/stitch/screens/dashboard/NetWorthBar.jsx
git commit -m "feat(dashboard): barra de presupuesto + barra de patrimonio"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 6: HealthRing.jsx — anillo de salud (reusa getFinancialHealthScore)

**Files:**
- Create: `src/stitch/screens/dashboard/HealthRing.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/dashboard/HealthRing.jsx`. Recibe `health` ya calculado (`{ score, label }`) y un flag `hasData`. Color por rango (mismos cortes que Reportes):

```jsx
// Anillo de salud financiera. Recibe el resultado de getFinancialHealthScore
// (calculado en el shell con getMonthlySavingCapacity). Color por rango.
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { EmptyCell } from './dashboardUi';

function ringColor(score) {
  if (score >= 80) return '#bdd200';
  if (score >= 60) return '#50d8e9';
  if (score >= 40) return '#ffb689';
  return '#ffb4ab';
}

export default function HealthRing({ health, hasData }) {
  if (!hasData) return <EmptyCell icon="favorite" message="Registra ingresos para evaluar tu salud financiera." />;
  const color = ringColor(health.score);
  const data = [{ name: 'salud', value: health.score, fill: color }];
  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[180px]">
      <div className="relative w-[150px] h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: '#232426' }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-headline-md text-[30px] tracking-tight" style={{ color }}>{health.score}</span>
          <span className="font-mono-data text-mono-data text-text-muted uppercase">/ 100</span>
        </div>
      </div>
      <span className="font-label-sm text-label-sm mt-sm" style={{ color }}>{health.label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/dashboard/HealthRing.jsx
git commit -m "feat(dashboard): anillo de salud (reusa getFinancialHealthScore)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 7: SignalsRail.jsx — recordatorios (lógica extraída)

**Files:**
- Create: `src/stitch/screens/dashboard/SignalsRail.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/dashboard/SignalsRail.jsx`. Recibe `signals` (arreglo ya calculado en el shell) + `onNavigate`. Render en grid horizontal de tarjetas (encaja en celda full-width del bento):

```jsx
// Recordatorios: tarjetas clicables. Recibe la lista ya calculada y el navigate.
import MS from '../../MS';

export default function SignalsRail({ signals, onNavigate }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center gap-sm py-lg">
        <MS name="check_circle" className="text-[24px] text-tertiary" />
        <p className="font-body-md text-body-md text-text-muted">Sin pagos próximos.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
      {signals.map((s, i) => (
        <button key={i} onClick={() => s.to && onNavigate(s.to)} className="text-left group p-sm border border-border-subtle hover:bg-surface-container-high transition-all rounded flex flex-col gap-xs">
          <div className="flex justify-between items-center">
            <span className={`font-label-sm text-label-sm ${s.tc}`}>{s.tag}</span>
            <span className="font-mono-data text-mono-data text-text-muted">{s.t}</span>
          </div>
          <div className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface">{s.body}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

Run: `npm run lint` → 0 errores. `npm run build` → limpio.
```bash
git add src/stitch/screens/dashboard/SignalsRail.jsx
git commit -m "feat(dashboard): SignalsRail de recordatorios (extraído)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 8: StitchDashboard.jsx — shell del bento

**Files:**
- Modify (reescribir): `src/stitch/screens/StitchDashboard.jsx`

- [ ] **Step 1: Reescribir el shell**

Replace the entire contents of `src/stitch/screens/StitchDashboard.jsx` with the bento shell. It computes data via stores + utils + the new selectors, then lays out the bento ordered by importance, wrapped in `Stagger`:

```jsx
// Resumen (Dashboard) — bento grid ordenado por importancia. Datos reales; la
// lógica pura vive en dashboard/selectors.js y utils/calculations. Solo lectura.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stagger } from '../StitchMotion';
import useTransactionStore from '../../stores/useTransactionStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useDebtStore from '../../stores/useDebtStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useBudgetStore from '../../stores/useBudgetStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useRateStore from '../../stores/useRateStore';
import {
  getBudgetSummary, getMonthlySavingCapacity, getFinancialHealthScore,
} from '../../utils/calculations';
import { getCardBalances } from '../../utils/creditCards';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MONTHS_SHORT_ES } from '../../utils/constants';
import { getCategoryBreakdown, getBudgetUsage, getNetWorthSplit } from './dashboard/selectors';
import { BentoCell, Stat } from './dashboard/dashboardUi';
import FlowChart from './dashboard/FlowChart';
import CategoryDonut from './dashboard/CategoryDonut';
import BudgetBar from './dashboard/BudgetBar';
import NetWorthBar from './dashboard/NetWorthBar';
import HealthRing from './dashboard/HealthRing';
import SignalsRail from './dashboard/SignalsRail';

const fmt = (n) => formatCurrency(n);

export default function StitchDashboard() {
  const navigate = useNavigate();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const { getTotalSaved } = useSavingsStore();
  const { getTotalDebt, getTotalMonthlyPayment } = useDebtStore();
  const budgets = useBudgetStore((s) => s.budgets);
  const payments = useDebtStore((s) => s.payments);
  const debts = useDebtStore((s) => s.debts);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const fxRate = useRateStore((s) => s.getRate());

  const now = useMemo(() => new Date(), []);
  const y = now.getFullYear();
  const m = now.getMonth();

  const monthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === y && d.getMonth() === m;
    }),
    [transactions, y, m],
  );

  const monthBudgets = useMemo(() => budgets.filter((b) => b.year === y && b.month === m), [budgets, y, m]);

  const debtPaidThisMonth = useMemo(() => payments.reduce((sum, p) => {
    const d = new Date(p.date + 'T00:00:00');
    if (d.getFullYear() !== y || d.getMonth() !== m) return sum;
    const debt = debts.find((dd) => dd.id === p.debtId);
    const val = Number(p.amount) || 0;
    return sum + (debt && debt.currency === 'USD' ? val * fxRate : val);
  }, 0), [payments, debts, y, m, fxRate]);

  const summary = useMemo(() => getBudgetSummary({
    monthTransactions: monthTx, monthBudgets, categories,
    debtPlanned: getTotalMonthlyPayment(), debtPaid: debtPaidThisMonth,
  }), [monthTx, monthBudgets, categories, getTotalMonthlyPayment, debtPaidThisMonth]);

  // Flujo del mes
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    monthTx.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type))
        expense += Number(t.amount) - Number(t.cashbackEarned || 0);
    });
    return { income, expense, balance: income - expense };
  }, [monthTx]);
  const savingsRate = totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0;

  // Patrimonio
  const totalSaved = getTotalSaved();
  const totalDebt = getTotalDebt();
  const netWorth = totalSaved - totalDebt;
  const split = useMemo(() => getNetWorthSplit(totalSaved, totalDebt), [totalSaved, totalDebt]);

  const totalPendingCards = useMemo(() => cards.reduce(
    (sum, c) => sum + (getCardBalances(c, transactions, now).pendingBilled || 0), 0,
  ), [cards, transactions, now]);

  // Serie 6 meses (inc/exp/net) para FlowChart
  const series = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      let mm = m - i, yy = y;
      while (mm < 0) { mm += 12; yy -= 1; }
      let inc = 0, exp = 0;
      transactions.forEach((t) => {
        const d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() !== yy || d.getMonth() !== mm) return;
        if (t.type === 'income') inc += Number(t.amount);
        else if (['expense', 'fixed_expense', 'variable_expense'].includes(t.type)) exp += Number(t.amount) - Number(t.cashbackEarned || 0);
      });
      arr.push({ label: MONTHS_SHORT_ES[mm], inc, exp, net: inc - exp });
    }
    return arr;
  }, [transactions, y, m]);

  // Donut de gastos
  const breakdown = useMemo(() => getCategoryBreakdown(monthTx, categories), [monthTx, categories]);

  // Presupuesto usado
  const budgetUsage = useMemo(() => getBudgetUsage(summary), [summary]);

  // Salud (reusa utils probadas)
  const cap = useMemo(() => getMonthlySavingCapacity(transactions, now, 3), [transactions, now]);
  const health = useMemo(() => getFinancialHealthScore({ avgIncome: cap.avgIncome, avgExpense: cap.avgExpense, monthlyDebt: getTotalMonthlyPayment() }), [cap, getTotalMonthlyPayment]);
  const healthHasData = cap.avgIncome > 0;

  // Recordatorios
  const signals = useMemo(() => {
    const out = [];
    const todayMid = new Date(y, m, now.getDate());
    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.isPaid || bal.pendingBilled <= 0) return;
      const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: 'Tarjeta por pagar', tc: days <= 2 ? 'text-accent-error' : 'text-accent-warning', t: days === 0 ? 'HOY' : `EN ${days}D`, body: `${card.name}: ${fmt(bal.pendingBilled)} vence ${formatDate(bal.cycles.dueDateISO)}.`, to: '/tarjetas' });
    });
    debts.filter((d) => d.status === 'active' && d.due_date).forEach((d) => {
      const due = new Date(String(d.due_date).slice(0, 10) + 'T00:00:00');
      const days = Math.round((due - todayMid) / 86400000);
      if (days < 0 || days > 14) return;
      out.push({ tag: 'Cuota de deuda', tc: 'text-accent-error', t: days === 0 ? 'HOY' : `EN ${days}D`, body: `${d.creditorName}: ${fmt(Number(d.monthlyPayment) * (d.currency === 'USD' ? fxRate : 1))}.`, to: '/deudas' });
    });
    goals.filter((g) => g.status !== 'completed' && g.deadline).forEach((g) => {
      const due = new Date(g.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: 'Meta próxima', tc: 'text-secondary', t: `EN ${days}D`, body: `"${g.title}" vence ${formatDate(g.deadline)}.`, to: '/ahorros' });
    });
    return out.sort((a) => (a.tc === 'text-accent-error' ? -1 : 1)).slice(0, 6);
  }, [cards, debts, goals, transactions, fxRate, y, m, now]);

  const metrics = [
    { l: 'PUEDES GASTAR', v: fmt(summary.puedesGastar), d: summary.estado === 'danger' ? 'Sin margen' : summary.estado === 'warning' ? 'Ajustado' : 'Con margen', c: summary.estado === 'danger' ? 'text-accent-error' : summary.estado === 'warning' ? 'text-accent-warning' : 'text-tertiary' },
    { l: 'TARJETAS POR PAGAR', v: fmt(totalPendingCards), d: totalPendingCards > 0 ? 'Pendiente' : 'Al día', warn: totalPendingCards > 0, c: totalPendingCards > 0 ? 'text-accent-warning' : 'text-tertiary' },
    { l: 'TASA DE AHORRO', v: `${savingsRate.toFixed(1)}%`, d: 'del ingreso', c: savingsRate >= 20 ? 'text-tertiary' : 'text-on-surface-variant' },
    { l: 'PATRIMONIO NETO', v: fmt(netWorth), d: `Ahorro ${fmt(totalSaved)}`, c: netWorth >= 0 ? 'text-tertiary' : 'text-accent-error' },
  ];

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <Stagger className="grid grid-cols-1 md:grid-cols-12 gap-md auto-rows-min">
        {/* 1 · Estado inmediato: 4 KPI */}
        {metrics.map((mx) => (
          <Stagger.Item key={mx.l} className="md:col-span-3">
            <div className="glass-card rounded-lg inner-glow p-md flex flex-col gap-sm h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs">{mx.l}</div>
              <Stat label="" value={mx.v} cls={mx.c} sub={mx.d} warn={mx.warn} />
            </div>
          </Stagger.Item>
        ))}

        {/* 2 · ¿Voy bien este mes? Presupuesto + flujo (hero) */}
        <Stagger.Item className="md:col-span-8">
          <BentoCell title={`Flujo de ${MONTHS_SHORT_ES[m]} ${y}`} icon="show_chart" className="h-full">
            <div className="grid grid-cols-3 gap-sm mb-md">
              <Stat label="Ingresos" value={`+${fmt(totals.income)}`} cls="text-tertiary" />
              <Stat label="Gastos" value={`−${fmt(totals.expense)}`} cls="text-accent-error" />
              <Stat label="Balance" value={`${totals.balance >= 0 ? '+' : '−'}${fmt(Math.abs(totals.balance))}`} cls={totals.balance >= 0 ? 'text-on-surface' : 'text-accent-error'} />
            </div>
            <BudgetBar usage={budgetUsage} />
            <FlowChart series={series} />
          </BentoCell>
        </Stagger.Item>

        {/* 3 · Salud */}
        <Stagger.Item className="md:col-span-4">
          <BentoCell title="Salud financiera" icon="favorite" className="h-full">
            <HealthRing health={health} hasData={healthHasData} />
          </BentoCell>
        </Stagger.Item>

        {/* 4 · ¿En qué gasto? */}
        <Stagger.Item className="md:col-span-5">
          <BentoCell title="Gastos por categoría" icon="donut_small" className="h-full">
            <CategoryDonut data={breakdown} />
          </BentoCell>
        </Stagger.Item>

        {/* 5 · Patrimonio */}
        <Stagger.Item className="md:col-span-7">
          <BentoCell title="Patrimonio" icon="account_balance" className="h-full">
            <NetWorthBar split={split} />
          </BentoCell>
        </Stagger.Item>

        {/* 6 · ¿Qué viene? Recordatorios */}
        <Stagger.Item className="md:col-span-12">
          <BentoCell title="Recordatorios" icon="radar">
            <SignalsRail signals={signals} onNavigate={navigate} />
          </BentoCell>
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build, lint, test**

Run: `npm run lint` → 0 errores (sin imports sin usar: el shell ya no usa MS directamente; confirma).
Run: `npm run build` → limpio.
Run: `npm run test` → 82 + nuevos de selectors pasan.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchDashboard.jsx
git commit -m "feat(dashboard): shell bento ordenado por importancia + Stagger"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 9: Verificación de carga + handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Verificación de carga (dev server)**

- `npm run build` (limpio), `npm run lint` (0), `npm run test` (82 + selectors).
- `npm run dev`; `GET /` → 200; `GET /src/stitch/screens/StitchDashboard.jsx` (transform) → 200; `GET /src/stitch/screens/dashboard/selectors.js` → 200.
- En demo: las 6 zonas del bento se ven en orden de importancia; los 4 gráficos poblados; placeholders por celda al faltar datos. Anota hallazgos; corrige (commit propio) si algo falla.

- [ ] **Step 2: Actualizar handoff.md**

In `handoff.md`:
- Mover Dashboard (`StitchDashboard.jsx`) de PENDIENTES a PULIDAS (con `screens/dashboard/`).
- Nota: el Dashboard es un bento grid con Recharts (FlowChart, CategoryDonut, HealthRing reusa `getFinancialHealthScore`, BudgetBar, NetWorthBar) + selectores puros testeados.
- "Siguiente paso lógico": Reportes (`StitchReports`) o la siguiente de solo lectura, conservando el orden (Calendario, Ajustes, Feedback).
- Actualizar conteo de tests y HEAD.

- [ ] **Step 3: Commit del handoff**

```bash
git add handoff.md
git commit -m "docs(handoff): Dashboard pulido (bento + Recharts); siguiente=Reportes"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** selectores puros + tests (T1), primitivas bento (T2), FlowChart Recharts (T3), donut (T4), budget+networth bars (T5), health ring reusando getFinancialHealthScore (T6), signals extraído (T7), shell bento ordenado por importancia con Stagger (T8), verificación+handoff (T9). Las 4 visualizaciones, el orden de importancia, los placeholders por celda y el reuso de utilidades están cubiertos.
- **Sin placeholders:** todo el código está completo y verificado contra el código vivo (getBudgetSummary devuelve gastosFijosPlan/gastosVariablesPlan/ahorroPlan/gastosFijosReal/variableGastado/ahorroReal/estado/puedesGastar; getFinancialHealthScore y getMonthlySavingCapacity existen y se usan igual que en Reportes).
- **Reuso vs. spec:** el spec proponía un getHealthScore nuevo; el plan REUSA el `getFinancialHealthScore` existente (ya testeado y usado en Reportes) — mejor que duplicar. Documentado en el header.
- **Consistencia de tipos/nombres:** `getCategoryBreakdown→[{name,value,color}]` consumido por CategoryDonut; `getBudgetUsage→{spent,budgeted,pct,overBudget,estado}|null` por BudgetBar; `getNetWorthSplit→{saved,debt,savedPct,debtPct,netWorth,hasData}` por NetWorthBar; `health={score,label}` + `hasData` por HealthRing; `series=[{label,inc,exp,net}]` por FlowChart; `signals=[{tag,tc,t,body,to}]` por SignalsRail. Coinciden entre productor y consumidor.
- **Identidad visual:** `glass-card`/`inner-glow`/tokens del tema, gradiente periwinkle `#bec2ff` y colores de salud idénticos a Reportes, `Stagger` de entrada, íconos `!text-[Npx]`.
