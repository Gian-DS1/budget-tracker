# Calendario — centro de planificación · Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el Calendario en un centro de planificación: además de los movimientos pasados, pinta vencimientos futuros (deuda, tarjeta, meta, recurrente) en cada día y los lista en un panel "Próximos vencimientos", con pulido Stitch (Stagger, selector mes/año, HOY marcado, resumen del mes con count-up).

**Architecture:** Shell delgado `StitchCalendar.jsx` + carpeta `screens/calendar/` con selectores PUROS testeables + sub-componentes (DayCell, DayDetail, UpcomingRail). Los selectores reciben datos ya cargados de los stores (debts/cards/goals/recurring/transactions) y devuelven mapas/listas; el shell solo orquesta.

**Tech Stack:** Vite + React 19, Zustand 5, Vitest, Material Symbols, JoyPixels (Emoji).

**Spec:** `docs/superpowers/specs/2026-06-03-calendario-planificacion-design.md`

**Restricción:** Rama `rebuild/stitch-pure`, todo local. NO push, NO merge.

**Datos verificados (código vivo):**
- `getCardBalances(card, transactions, now)` → `{ pendingBilled, isPaid, cycles: { dueDateISO } }` (de utils/creditCards).
- Deudas: `{ creditorName, monthlyPayment, due_date, status, currency }`.
- Savings: `{ title, deadline, status }` (status !== 'completed' = pendiente).
- Recurring: `{ id, description, amount, type, frequency, nextDate, active }`.
- Transacciones: `{ date:'YYYY-MM-DD', amount, type, cashbackEarned, categoryId, description }`.
- `getEffectiveAmount(t)` = amount − cashback. Tipos gasto: `['expense','fixed_expense','variable_expense']`; ingreso `'income'`.
- `DAYS_SHORT_ES` (índice 0 = Dom, coincide con Date.getDay()), `MONTHS_ES`, `MONTHS_SHORT_ES` de utils/constants.
- Color por tipo: deuda `#ffb4ab`(error), tarjeta `#ffb689`(warning), meta `#bdd200`(tertiary), recurrente `#50d8e9`(secondary).

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/stitch/screens/calendar/selectors.js` | Crear | `getDayMovements`, `getDueEvents`, `getMonthSummary`, `getUpcoming` (puros). |
| `src/stitch/screens/calendar/selectors.test.js` | Crear | Tests TDD. |
| `src/stitch/screens/calendar/DayCell.jsx` | Crear | Celda del día (número, HOY, mini montos, puntos de vencimiento). |
| `src/stitch/screens/calendar/DayDetail.jsx` | Crear | Panel del día: Movimientos / Vencimientos / total. |
| `src/stitch/screens/calendar/UpcomingRail.jsx` | Crear | Panel "Próximos vencimientos". |
| `src/stitch/screens/StitchCalendar.jsx` | Reescribir | Shell: header + selector mes/año + flechas + resumen + grid + detalle + rail, con Stagger. |

---

## Task 1: selectors.js — funciones puras + tests (TDD)

**Files:**
- Create: `src/stitch/screens/calendar/selectors.js`
- Test: `src/stitch/screens/calendar/selectors.test.js`

- [ ] **Step 1: Escribir los tests primero**

Create `src/stitch/screens/calendar/selectors.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getDayMovements, getDueEvents, getMonthSummary, getUpcoming } from './selectors';

const tx = (date, amount, type = 'variable_expense', cashbackEarned = 0) => ({ date, amount, type, cashbackEarned, categoryId: 'c1', description: 'x' });

describe('getDayMovements', () => {
  it('vacío → {}', () => {
    expect(getDayMovements([], 2026, 5)).toEqual({});
  });
  it('agrupa por día, separa income/expense, resta cashback', () => {
    const m = getDayMovements([
      tx('2026-06-10', 1000, 'income'),
      tx('2026-06-10', 200, 'variable_expense', 20),
      tx('2026-05-10', 999, 'income'), // otro mes, se ignora
    ], 2026, 5);
    expect(m[10].income).toBe(1000);
    expect(m[10].expense).toBe(180); // 200-20
    expect(m[10].list).toHaveLength(2);
    expect(m[9]).toBeUndefined();
  });
});

describe('getDueEvents', () => {
  const now = new Date(2026, 5, 1);
  it('deuda con due_date en el mes → evento tipo deuda', () => {
    const debts = [{ creditorName: 'Banco', monthlyPayment: 5000, due_date: '2026-06-28', status: 'active', currency: 'DOP' }];
    const e = getDueEvents({ debts, cards: [], goals: [], recurring: [] }, 2026, 5, now, []);
    expect(e[28]).toBeTruthy();
    expect(e[28][0].type).toBe('deuda');
    expect(e[28][0].amount).toBe(5000);
  });
  it('meta con deadline en el mes y no completada → evento meta', () => {
    const goals = [{ title: 'Viaje', deadline: '2026-06-15', status: 'active' }];
    const e = getDueEvents({ debts: [], cards: [], goals, recurring: [] }, 2026, 5, now, []);
    expect(e[15][0].type).toBe('meta');
  });
  it('meta completada se ignora', () => {
    const goals = [{ title: 'Hecho', deadline: '2026-06-15', status: 'completed' }];
    const e = getDueEvents({ debts: [], cards: [], goals, recurring: [] }, 2026, 5, now, []);
    expect(e[15]).toBeUndefined();
  });
  it('recurrente con nextDate en el mes → evento recurrente', () => {
    const recurring = [{ description: 'Netflix', amount: 590, type: 'variable_expense', nextDate: '2026-06-05', active: true }];
    const e = getDueEvents({ debts: [], cards: [], goals: [], recurring }, 2026, 5, now, []);
    expect(e[5][0].type).toBe('recurrente');
  });
  it('eventos fuera del mes se ignoran', () => {
    const debts = [{ creditorName: 'X', monthlyPayment: 1, due_date: '2026-07-10', status: 'active' }];
    const e = getDueEvents({ debts, cards: [], goals: [], recurring: [] }, 2026, 5, now, []);
    expect(Object.keys(e)).toHaveLength(0);
  });
});

describe('getMonthSummary', () => {
  it('vacío → ceros', () => {
    expect(getMonthSummary([], 2026, 5)).toEqual({ income: 0, expense: 0, balance: 0 });
  });
  it('suma neta de cashback', () => {
    const s = getMonthSummary([tx('2026-06-01', 5000, 'income'), tx('2026-06-02', 1000, 'variable_expense', 100)], 2026, 5);
    expect(s.income).toBe(5000);
    expect(s.expense).toBe(900);
    expect(s.balance).toBe(4100);
  });
});

describe('getUpcoming', () => {
  const now = new Date(2026, 5, 10);
  it('ordena por fecha ascendente y excluye pasados', () => {
    const debts = [
      { creditorName: 'A', monthlyPayment: 1, due_date: '2026-06-20', status: 'active' },
      { creditorName: 'B', monthlyPayment: 1, due_date: '2026-06-05', status: 'active' }, // pasado
      { creditorName: 'C', monthlyPayment: 1, due_date: '2026-06-15', status: 'active' },
    ];
    const list = getUpcoming({ debts, cards: [], goals: [], recurring: [] }, now, [], 30);
    expect(list.map((x) => x.label)).toEqual(['C', 'A']); // 15 antes que 20; 05 excluido
    expect(list[0].daysUntil).toBe(5);
  });
  it('respeta la ventana de N días', () => {
    const debts = [{ creditorName: 'Lejos', monthlyPayment: 1, due_date: '2026-08-01', status: 'active' }];
    const list = getUpcoming({ debts, cards: [], goals: [], recurring: [] }, now, [], 30);
    expect(list).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- calendar/selectors`
Expected: FAIL (no se resuelve `./selectors`).

- [ ] **Step 3: Implementar selectors.js**

Create `src/stitch/screens/calendar/selectors.js`:

```js
// Selectores puros del Calendario. Reciben datos ya cargados de los stores y
// devuelven mapas/listas por día. ISO local (sin toISOString).
import { getEffectiveAmount } from '../../../utils/calculations';
import { getCardBalances } from '../../../utils/creditCards';

const EXPENSE_TYPES = ['expense', 'fixed_expense', 'variable_expense'];
const isExpense = (t) => EXPENSE_TYPES.includes(t.type);

const COLOR = { deuda: '#ffb4ab', tarjeta: '#ffb689', meta: '#bdd200', recurrente: '#50d8e9' };
const TO = { deuda: '/deudas', tarjeta: '/tarjetas', meta: '/ahorros', recurrente: '/transacciones' };

const parseISO = (iso) => new Date(iso + 'T00:00:00');
const inMonth = (iso, year, month) => {
  if (!iso) return false;
  const d = parseISO(String(iso).slice(0, 10));
  return d.getFullYear() === year && d.getMonth() === month;
};
const dayOf = (iso) => parseISO(String(iso).slice(0, 10)).getDate();

// Movimientos pasados por día del mes.
export function getDayMovements(transactions, year, month) {
  const map = {};
  for (const t of transactions) {
    if (!inMonth(t.date, year, month)) continue;
    const day = dayOf(t.date);
    if (!map[day]) map[day] = { income: 0, expense: 0, list: [] };
    map[day].list.push(t);
    if (t.type === 'income') map[day].income += Number(t.amount) || 0;
    else if (isExpense(t)) map[day].expense += getEffectiveAmount(t);
  }
  return map;
}

// Eventos de vencimiento por día del mes (4 fuentes).
export function getDueEvents({ debts = [], cards = [], goals = [], recurring = [] }, year, month, now, transactions = []) {
  const map = {};
  const push = (day, ev) => { (map[day] = map[day] || []).push(ev); };

  debts.forEach((d) => {
    if (d.status !== 'active' || !d.due_date || !inMonth(d.due_date, year, month)) return;
    push(dayOf(d.due_date), { type: 'deuda', label: d.creditorName, amount: Number(d.monthlyPayment) || 0, color: COLOR.deuda, to: TO.deuda });
  });

  cards.forEach((c) => {
    const bal = getCardBalances(c, transactions, now);
    if (!bal || bal.isPaid || (bal.pendingBilled || 0) <= 0) return;
    const iso = bal.cycles?.dueDateISO;
    if (!inMonth(iso, year, month)) return;
    push(dayOf(iso), { type: 'tarjeta', label: c.name, amount: bal.pendingBilled, color: COLOR.tarjeta, to: TO.tarjeta });
  });

  goals.forEach((g) => {
    if (g.status === 'completed' || !g.deadline || !inMonth(g.deadline, year, month)) return;
    push(dayOf(g.deadline), { type: 'meta', label: g.title, amount: Number(g.targetAmount) || 0, color: COLOR.meta, to: TO.meta });
  });

  recurring.forEach((r) => {
    if (!r.active || !r.nextDate || !inMonth(r.nextDate, year, month)) return;
    push(dayOf(r.nextDate), { type: 'recurrente', label: r.description || 'Recurrente', amount: Number(r.amount) || 0, color: COLOR.recurrente, to: TO.recurrente });
  });

  return map;
}

// Resumen del mes (ingreso/gasto/balance, neto de cashback).
export function getMonthSummary(transactions, year, month) {
  let income = 0, expense = 0;
  for (const t of transactions) {
    if (!inMonth(t.date, year, month)) continue;
    if (t.type === 'income') income += Number(t.amount) || 0;
    else if (isExpense(t)) expense += getEffectiveAmount(t);
  }
  return { income, expense, balance: income - expense };
}

// Próximos vencimientos: desde hoy hasta +days, ordenados por fecha.
export function getUpcoming({ debts = [], cards = [], goals = [], recurring = [] }, now, transactions = [], days = 30) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(today); limit.setDate(limit.getDate() + days);
  const out = [];
  const add = (iso, type, label, amount) => {
    if (!iso) return;
    const d = parseISO(String(iso).slice(0, 10));
    if (d < today || d > limit) return;
    const daysUntil = Math.round((d - today) / 86400000);
    out.push({ date: String(iso).slice(0, 10), daysUntil, type, label, amount, color: COLOR[type], to: TO[type] });
  };

  debts.forEach((d) => { if (d.status === 'active') add(d.due_date, 'deuda', d.creditorName, Number(d.monthlyPayment) || 0); });
  cards.forEach((c) => {
    const bal = getCardBalances(c, transactions, now);
    if (bal && !bal.isPaid && (bal.pendingBilled || 0) > 0) add(bal.cycles?.dueDateISO, 'tarjeta', c.name, bal.pendingBilled);
  });
  goals.forEach((g) => { if (g.status !== 'completed') add(g.deadline, 'meta', g.title, Number(g.targetAmount) || 0); });
  recurring.forEach((r) => { if (r.active) add(r.nextDate, 'recurrente', r.description || 'Recurrente', Number(r.amount) || 0); });

  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- calendar/selectors`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/calendar/selectors.js src/stitch/screens/calendar/selectors.test.js
git commit -m "feat(calendario): selectores puros (movimientos + vencimientos + próximos) + tests"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 2: DayCell.jsx

**Files:**
- Create: `src/stitch/screens/calendar/DayCell.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/calendar/DayCell.jsx`:

```jsx
// Celda de un día: número, marca de HOY (anillo periwinkle), mini montos de
// movimientos y puntos de color de vencimientos. Clicable si hay algo que ver.
export default function DayCell({ day, movement, dues, isToday, isSelected, onClick }) {
  const hasMov = !!movement;
  const hasDue = dues && dues.length > 0;
  const clickable = hasMov || hasDue;
  return (
    <button
      onClick={() => clickable && onClick(day)}
      className={`aspect-square border rounded-sm p-xs flex flex-col text-left transition-colors ${clickable ? 'cursor-pointer hover:border-primary' : 'cursor-default'} ${isSelected ? 'border-primary bg-primary/10' : isToday ? 'border-primary/60 bg-surface-card' : 'border-border-subtle bg-surface-card'}`}
    >
      <span className={`font-mono-data text-mono-data ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{day}</span>
      {/* Puntos de vencimiento */}
      {hasDue && (
        <div className="flex flex-wrap gap-px mt-px">
          {dues.slice(0, 4).map((d, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
          ))}
        </div>
      )}
      {/* Movimientos pasados (mini montos) */}
      {hasMov && (
        <div className="mt-auto flex flex-col gap-px">
          {movement.income > 0 && <span className="font-mono-data text-[7px] text-tertiary">+{Math.round(movement.income / 1000)}K</span>}
          {movement.expense > 0 && <span className="font-mono-data text-[7px] text-accent-error">−{Math.round(movement.expense / 1000)}K</span>}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/calendar/DayCell.jsx
git commit -m "feat(calendario): celda de día con HOY + vencimientos + movimientos"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 3: DayDetail.jsx

**Files:**
- Create: `src/stitch/screens/calendar/DayDetail.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/calendar/DayDetail.jsx`:

```jsx
// Panel del día seleccionado: secciones Movimientos y Vencimientos + total.
import MS from '../../MS';
import Emoji from '../../Emoji';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function DayDetail({ iso, movement, dues, categories }) {
  const txs = movement?.list || [];
  const events = dues || [];
  const catCell = (id) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return '—';
    return <span className="inline-flex items-center gap-xs"><Emoji e={c.icon} size={13} />{c.name}</span>;
  };
  const dayTotal = (movement?.income || 0) - (movement?.expense || 0);

  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg h-full">
      <div className="flex justify-between items-center mb-lg border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant">{iso ? formatDate(iso).toUpperCase() : 'SELECCIONA UN DÍA'}</h2>
        <MS name="event" className="!text-[16px] text-text-muted" />
      </div>

      {!iso ? (
        <p className="font-body-md text-body-md text-text-muted py-lg text-center">Toca un día con actividad o vencimientos.</p>
      ) : (txs.length === 0 && events.length === 0) ? (
        <p className="font-body-md text-body-md text-text-muted py-lg text-center">Sin movimientos ni vencimientos este día.</p>
      ) : (
        <div className="flex flex-col gap-lg">
          {events.length > 0 && (
            <div className="flex flex-col gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">Vencimientos</span>
              {events.map((e, i) => (
                <div key={i} className="flex justify-between items-center bg-surface-card border border-border-subtle rounded p-sm inner-glow">
                  <span className="flex items-center gap-xs min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="font-label-sm text-label-sm text-on-surface truncate">{e.label}</span>
                    <span className="font-mono-data text-[8px] text-text-muted uppercase shrink-0">{e.type}</span>
                  </span>
                  <span className="font-mono-data text-[13px] tabular-nums ml-sm text-on-surface-variant">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {txs.length > 0 && (
            <div className="flex flex-col gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">Movimientos</span>
              {txs.map((t) => {
                const inc = t.type === 'income';
                return (
                  <div key={t.id} className="flex justify-between items-center bg-surface-card border border-border-subtle rounded p-sm inner-glow">
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface truncate">{t.description || '—'}</span>
                      <span className="font-mono-data text-mono-data text-text-muted">{catCell(t.categoryId)}</span>
                    </div>
                    <span className={`font-mono-data text-[13px] tabular-nums ml-sm ${inc ? 'text-tertiary' : 'text-on-surface'}`}>{inc ? '+' : '−'}{fmt(Math.abs(Number(t.amount)))}</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-xs border-t border-border-subtle">
                <span className="font-mono-data text-mono-data text-text-muted uppercase">Balance del día</span>
                <span className={`font-mono-data text-[13px] tabular-nums ${dayTotal >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>{dayTotal >= 0 ? '+' : '−'}{fmt(Math.abs(dayTotal))}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/calendar/DayDetail.jsx
git commit -m "feat(calendario): panel de día con movimientos y vencimientos"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 4: UpcomingRail.jsx

**Files:**
- Create: `src/stitch/screens/calendar/UpcomingRail.jsx`

- [ ] **Step 1: Crear el componente**

Create `src/stitch/screens/calendar/UpcomingRail.jsx`:

```jsx
// Panel "Próximos vencimientos": lista lo que viene en los próximos ~30 días.
import MS from '../../MS';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function UpcomingRail({ items, onNavigate }) {
  return (
    <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg">
      <div className="flex justify-between items-center mb-md border-b border-border-subtle pb-sm">
        <h2 className="font-mono-data text-mono-data text-on-surface-variant uppercase flex items-center gap-xs">
          <MS name="upcoming" className="!text-[16px] text-text-muted" /> Próximos vencimientos
        </h2>
        <span className="font-mono-data text-mono-data text-text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-lg flex flex-col items-center text-center gap-sm">
          <MS name="check_circle" className="text-[24px] text-tertiary" />
          <p className="font-body-md text-body-md text-text-muted">Sin vencimientos en los próximos 30 días.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
          {items.map((it, i) => (
            <button key={i} onClick={() => it.to && onNavigate(it.to)} className="text-left group p-sm border border-border-subtle rounded hover:bg-surface-container-high transition-colors flex flex-col gap-xs">
              <div className="flex items-center justify-between gap-xs">
                <span className="flex items-center gap-xs min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
                  <span className="font-label-sm text-label-sm text-on-surface truncate">{it.label}</span>
                </span>
                <span className="font-mono-data text-mono-data text-text-muted shrink-0">{it.daysUntil === 0 ? 'HOY' : `EN ${it.daysUntil}D`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono-data text-mono-data text-text-muted">{formatDate(it.date)}</span>
                <span className="font-mono-data text-mono-data text-on-surface-variant">{fmt(it.amount)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint` → 0 errores.
```bash
git add src/stitch/screens/calendar/UpcomingRail.jsx
git commit -m "feat(calendario): panel de próximos vencimientos"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 5: StitchCalendar.jsx — shell + selector mes/año + integración

**Files:**
- Modify (reescribir): `src/stitch/screens/StitchCalendar.jsx`

- [ ] **Step 1: Reescribir el shell**

Replace the entire contents of `src/stitch/screens/StitchCalendar.jsx` with:

```jsx
// Calendario — centro de planificación: movimientos pasados + vencimientos
// futuros + próximos pagos. Lógica pura en calendar/selectors.js. Solo lectura.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import StitchSelect from '../StitchSelect';
import CountUp from '../CountUp';
import useTransactionStore from '../../stores/useTransactionStore';
import useCategoryStore from '../../stores/useCategoryStore';
import useDebtStore from '../../stores/useDebtStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useSavingsStore from '../../stores/useSavingsStore';
import useRecurringStore from '../../stores/useRecurringStore';
import { formatCurrency } from '../../utils/formatters';
import { MONTHS_ES, MONTHS_SHORT_ES, DAYS_SHORT_ES } from '../../utils/constants';
import { getDayMovements, getDueEvents, getMonthSummary, getUpcoming } from './calendar/selectors';
import DayCell from './calendar/DayCell';
import DayDetail from './calendar/DayDetail';
import UpcomingRail from './calendar/UpcomingRail';

const fmt = (n) => formatCurrency(n);
const LEGEND = [
  { c: '#ffb4ab', l: 'Deuda' }, { c: '#ffb689', l: 'Tarjeta' },
  { c: '#bdd200', l: 'Meta' }, { c: '#50d8e9', l: 'Recurrente' },
];

export default function StitchCalendar() {
  const navigate = useNavigate();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  const debts = useDebtStore((s) => s.debts);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const recurring = useRecurringStore((s) => s.recurring);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const navMonth = (dir) => {
    let mm = month + dir, yy = year;
    if (mm < 0) { mm = 11; yy--; } else if (mm > 11) { mm = 0; yy++; }
    setMonth(mm); setYear(yy); setSelected(null);
  };

  const movements = useMemo(() => getDayMovements(transactions, year, month), [transactions, year, month]);
  const dueEvents = useMemo(() => getDueEvents({ debts, cards, goals, recurring }, year, month, now, transactions), [debts, cards, goals, recurring, year, month, now, transactions]);
  const summary = useMemo(() => getMonthSummary(transactions, year, month), [transactions, year, month]);
  const upcoming = useMemo(() => getUpcoming({ debts, cards, goals, recurring }, now, transactions, 30), [debts, cards, goals, recurring, now, transactions]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const todayDay = now.getDate();
  const selectedISO = selected ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}` : null;

  const monthOptions = MONTHS_ES.map((label, i) => ({ value: String(i), label }));
  const yearOptions = [];
  for (let yy = now.getFullYear() + 1; yy >= now.getFullYear() - 5; yy--) yearOptions.push({ value: String(yy), label: String(yy) });

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="w-2 h-2 rounded-full bg-secondary live-dot" />
            <span className="font-mono-data text-mono-data text-secondary uppercase tracking-wider">Vista mensual</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{MONTHS_ES[month]} {year}</h1>
        </div>
        <div className="flex items-center gap-sm self-start">
          <div className="w-[140px]"><StitchSelect value={String(month)} onChange={(v) => { setMonth(Number(v)); setSelected(null); }} options={monthOptions} compact /></div>
          <div className="w-[100px]"><StitchSelect value={String(year)} onChange={(v) => { setYear(Number(v)); setSelected(null); }} options={yearOptions} compact /></div>
          <button onClick={() => navMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_left" className="text-[18px]" /></button>
          <button onClick={() => navMonth(1)} className="w-9 h-9 flex items-center justify-center rounded border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors inner-glow"><MS name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>

      <Stagger className="flex flex-col gap-gutter">
        {/* Resumen del mes */}
        <Stagger.Item className="grid grid-cols-3 gap-md">
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Ingresos</span>
            <span className="font-headline-md text-[20px] tracking-tight text-tertiary whitespace-nowrap"><CountUp value={summary.income} format={(n) => `+${fmt(n)}`} /></span>
          </div>
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Gastos</span>
            <span className="font-headline-md text-[20px] tracking-tight text-accent-error whitespace-nowrap"><CountUp value={summary.expense} format={(n) => `−${fmt(n)}`} /></span>
          </div>
          <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md flex flex-col gap-xs">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">Balance</span>
            <span className={`font-headline-md text-[20px] tracking-tight whitespace-nowrap ${summary.balance >= 0 ? 'text-on-surface' : 'text-accent-error'}`}><CountUp value={summary.balance} format={(n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`} /></span>
          </div>
        </Stagger.Item>

        {/* Grid + detalle */}
        <Stagger.Item className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-md">
            <div className="grid grid-cols-7 gap-px mb-sm">
              {DAYS_SHORT_ES.map((d) => <div key={d} className="font-mono-data text-mono-data text-text-muted uppercase text-center py-sm">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {cells.map((d, i) => d === null
                ? <div key={i} className="aspect-square" />
                : <DayCell key={i} day={d} movement={movements[d]} dues={dueEvents[d]} isToday={isCurrentMonth && d === todayDay} isSelected={selected === d} onClick={(day) => setSelected(selected === day ? null : day)} />)}
            </div>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-md mt-md pt-sm border-t border-border-subtle">
              {LEGEND.map((x) => (
                <span key={x.l} className="flex items-center gap-xs font-mono-data text-mono-data text-text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ background: x.c }} /> {x.l}
                </span>
              ))}
            </div>
          </div>

          <DayDetail iso={selectedISO} movement={selected ? movements[selected] : null} dues={selected ? dueEvents[selected] : null} categories={categories} />
        </Stagger.Item>

        {/* Próximos vencimientos */}
        <Stagger.Item>
          <UpcomingRail items={upcoming} onNavigate={navigate} />
        </Stagger.Item>
      </Stagger>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build, lint, test**

Run: `npm run lint` → 0 errores (confirma que no quedan imports sin usar; `MONTHS_SHORT_ES` se importó — si no se usa, quitarlo).
Run: `npm run build` → limpio.
Run: `npm run test` → 115 + nuevos de calendar/selectors pasan.

NOTA: si `MONTHS_SHORT_ES` no se usa en el shell final, quitarlo del import para que el lint quede en 0. (El shell de arriba NO lo usa → quitarlo del import deja solo `MONTHS_ES, DAYS_SHORT_ES`.)

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchCalendar.jsx
git commit -m "feat(calendario): shell con vencimientos + selector mes/año + resumen + Stagger"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 6: Verificación de carga + handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Verificación de carga (dev server)**

- `npm run build` (limpio), `npm run lint` (0), `npm run test` (115 + nuevos).
- `npm run dev`; `GET /` → 200; `GET /src/stitch/screens/StitchCalendar.jsx` (transform) → 200; `GET /src/stitch/screens/calendar/selectors.js` → 200.
- En demo: navegar meses (flechas y selector); ver movimientos (mini montos) y vencimientos (puntos de color) en celdas; HOY marcado; seleccionar día abre detalle con Movimientos/Vencimientos; "Próximos vencimientos" lista lo que viene; clic navega.

Anota hallazgos; corrige (commit propio) si algo falla.

- [ ] **Step 2: Actualizar handoff.md**

In `handoff.md`:
- Mover Calendario (`StitchCalendar.jsx`) de PENDIENTES a PULIDAS (con `screens/calendar/`).
- Nota: el Calendario es un centro de planificación — movimientos pasados + vencimientos futuros (deuda/tarjeta/meta/recurrente) en el grid + panel "Próximos vencimientos"; selectores puros testeados; selector mes/año; HOY marcado; resumen con count-up.
- "Siguiente paso lógico": Ajustes (`StitchSettings`), luego Feedback (`StitchFeedback`).
- Actualizar conteo de tests y HEAD.

- [ ] **Step 3: Commit del handoff**

```bash
git add handoff.md
git commit -m "docs(handoff): Calendario pulido (centro de planificación); siguiente=Ajustes"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** 4 selectores + tests (T1), DayCell con HOY/movimientos/vencimientos (T2), DayDetail dos secciones (T3), UpcomingRail (T4), shell con selector mes/año + flechas + resumen count-up + Stagger + leyenda (T5), verificación + handoff (T6). Las 4 fuentes de vencimientos, la distinción visual, el panel de próximos y el pulido están cubiertos.
- **Placeholder scan:** todo el código completo. Anotada la posible limpieza de `MONTHS_SHORT_ES` si queda sin uso (el shell final no lo usa → quitarlo).
- **Consistencia de tipos/nombres:** `getDayMovements→{[day]:{income,expense,list}}` → DayCell.movement/DayDetail; `getDueEvents→{[day]:[{type,label,amount,color,to}]}` → DayCell.dues/DayDetail; `getMonthSummary→{income,expense,balance}` → resumen; `getUpcoming→[{date,daysUntil,type,label,amount,color,to}]` → UpcomingRail. Coinciden productor↔consumidor. Colores por tipo idénticos en selectors y leyenda.
- **Reuso:** `getEffectiveAmount`, `getCardBalances`, stores existentes; ISO local sin toISOString; CountUp ya creado; Stagger; StitchSelect. Identidad alineada con lo pulido.
