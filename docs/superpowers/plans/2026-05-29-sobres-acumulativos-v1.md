# Sobres acumulativos v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NOTA (git solo-lectura):** en la sesión actual el asistente NO puede commitear. Implementa y verifica (`npm run test`/`lint`/`build`); los `git commit` los corre el usuario. Los comandos de commit quedan documentados en cada tarea.

**Goal:** Categorías "acumulativas" (sinking funds) que arrastran saldo mes a mes; el gasto grande se mide contra el bote acumulado y no hunde el "Puedes gastar".

**Architecture:** Dos columnas nuevas en `categories` (`is_accumulative`, `accumulation_start`). Una función pura `getAccumulatedBalance` calcula el bote (presupuestado − gastado desde el mes de inicio). `getBudgetSummary` trata las categorías acumulativas como ahorro (aporte reservado, gasto excluido del "Puedes gastar"). `BudgetPage` añade un mini-modal de configuración por fila y muestra el bote.

**Tech Stack:** React 19, Vite 8, Zustand 5, Supabase, Vitest, ESLint. Verificación: `npm run test`, `npm run lint`, `npm run build`, comprobación manual `npm run dev`.

---

## Notas de contexto

- `budgets` (de `useBudgetStore`) tiene `{ categoryId, year, month (0-indexado), estimatedAmount }`.
- Las transacciones tienen `{ categoryId, date ('YYYY-MM-DD'), amount }`, en DOP.
- `accumulation_start` es `'YYYY-MM'` (mes 1-indexado, como lo da `<input type="month">`).
- Las categorías ya se mapean snake→camel en `useCategoryStore`; hay que añadir los dos campos.
- `getBudgetSummary` ya recibe `categories` y clasifica por tipo; hay que añadir la rama acumulativa.

---

## Task 1: Migración SQL en Supabase (PRERREQUISITO — lo corre el usuario)

- [ ] **Step 1: Correr el SQL**

**Dónde:** Supabase → SQL Editor → New query → Run. **Cuándo:** antes de probar la función (Task 5).

```sql
alter table public.categories add column if not exists is_accumulative boolean not null default false;
alter table public.categories add column if not exists accumulation_start text; -- 'YYYY-MM'
```

Expected: "Success. No rows returned." (Las columnas de una tabla existente heredan los GRANT de `categories`, no hace falta GRANT extra.)

---

## Task 2: `getAccumulatedBalance` (función pura, TDD)

**Files:**
- Modify: `src/utils/calculations.js`
- Test: `src/utils/calculations.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Primero añade `getAccumulatedBalance` al import existente del tope del archivo:
```js
import { getBudgetSummary, getAccumulatedBalance } from './calculations';
```
Luego añade al final de `src/utils/calculations.test.js`:

```js
describe('getAccumulatedBalance', () => {
  const budgets = [
    { categoryId: 'mar', year: 2026, month: 0, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 1, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 2, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 3, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 4, estimatedAmount: 1000 },
    { categoryId: 'otra', year: 2026, month: 0, estimatedAmount: 9999 },
  ];

  it('bote = presupuestado acumulado - gastado, desde el mes de inicio', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-01',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-05-10', amount: 4000 }],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(5000);
    expect(r.spent).toBe(4000);
    expect(r.available).toBe(1000);
  });

  it('ignora meses anteriores al inicio', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-03',
      budgets,
      transactions: [],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(3000); // marzo, abril, mayo (month 2,3,4)
  });

  it('bote 0 si el inicio es futuro', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-12',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-05-10', amount: 500 }],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(0);
    expect(r.spent).toBe(0);
    expect(r.available).toBe(0);
  });

  it('permite sobregiro del bote (available negativo)', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-01',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-02-10', amount: 5000 }],
      uptoYear: 2026,
      uptoMonth: 1,
    });
    expect(r.budgeted).toBe(2000); // ene + feb
    expect(r.spent).toBe(5000);
    expect(r.available).toBe(-3000);
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm run test`
Expected: FAIL — `getAccumulatedBalance is not a function`.

- [ ] **Step 3: Implementar**

Añade en `src/utils/calculations.js` (después de `getBudgetSummary`, antes de `detectAnomalies`):

```js
/**
 * Bote acumulado (sinking fund) de una categoría: suma de aportes presupuestados
 * menos lo gastado, desde `accumulationStart` ('YYYY-MM') hasta (uptoYear, uptoMonth).
 * Todo en DOP. Devuelve { budgeted, spent, available }.
 */
export function getAccumulatedBalance({
  categoryId,
  accumulationStart,
  budgets = [],
  transactions = [],
  uptoYear,
  uptoMonth,
}) {
  const uptoIdx = uptoYear * 12 + uptoMonth;

  let startIdx;
  let startISO;
  if (accumulationStart && /^\d{4}-\d{2}$/.test(accumulationStart)) {
    const [sy, sm] = accumulationStart.split('-').map(Number);
    startIdx = sy * 12 + (sm - 1);
    startISO = `${accumulationStart}-01`;
  } else {
    startIdx = uptoIdx;
    startISO = `${uptoYear}-${String(uptoMonth + 1).padStart(2, '0')}-01`;
  }

  // Primer día del mes siguiente a `upto` (límite superior exclusivo para fechas).
  let nextMonth = uptoMonth + 1;
  let nextYear = uptoYear;
  if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
  const endExclusiveISO = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;

  let budgeted = 0;
  for (const b of budgets) {
    if (b.categoryId !== categoryId) continue;
    const idx = b.year * 12 + b.month;
    if (idx >= startIdx && idx <= uptoIdx) budgeted += Number(b.estimatedAmount) || 0;
  }

  let spent = 0;
  for (const t of transactions) {
    if (t.categoryId !== categoryId) continue;
    if (t.date >= startISO && t.date < endExclusiveISO) spent += Number(t.amount) || 0;
  }

  return { budgeted, spent, available: budgeted - spent };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npm run test`
Expected: PASS — todos verdes (incluye los existentes).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` (0 problemas).
Commit (lo corre el usuario):
```bash
git add src/utils/calculations.js src/utils/calculations.test.js
git commit -m "feat: add getAccumulatedBalance (sinking fund pot) with tests"
```

---

## Task 3: `getBudgetSummary` trata categorías acumulativas como ahorro (TDD)

**Files:**
- Modify: `src/utils/calculations.js` (función `getBudgetSummary`)
- Test: `src/utils/calculations.test.js`

- [ ] **Step 1: Escribir el test que falla**

Añade dentro de `describe('getBudgetSummary', ...)` en `src/utils/calculations.test.js` (o como un nuevo bloque `describe` al final):

```js
describe('getBudgetSummary — categorías acumulativas', () => {
  const cats = [
    { id: 'inc', type: 'income' },
    { id: 'var', type: 'variable_expense' },
    { id: 'mar', type: 'variable_expense', isAccumulative: true },
  ];

  it('reserva el aporte y excluye el gasto del bote de puedesGastar', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 2000 },
        { categoryId: 'mar', amount: 11000 }, // pago grande del sobre
      ],
      monthBudgets: [{ categoryId: 'mar', estimatedAmount: 1000 }],
      categories: cats,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.accumulativePlan).toBe(1000);
    expect(r.accumulativeSpent).toBe(11000);
    expect(r.variableGastado).toBe(2000); // mar excluido
    expect(r.comprometido).toBe(1000); // aporte acumulativo reservado
    expect(r.puedesGastar).toBe(47000); // 50000 - 1000 - 2000 (sin los 11000 del bote)
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npm run test`
Expected: FAIL — `accumulativePlan` es `undefined` / `puedesGastar` no es 47000.

- [ ] **Step 3: Modificar `getBudgetSummary`**

Reemplaza el cuerpo desde `const typeById = ...` hasta el `return { ... }` por:

```js
  const catById = new Map(categories.map((c) => [c.id, c]));

  const estimatedByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativePlan = 0;
  for (const b of monthBudgets) {
    const cat = catById.get(b.categoryId);
    if (!cat) continue;
    const amt = Number(b.estimatedAmount) || 0;
    if (cat.isAccumulative) { accumulativePlan += amt; continue; }
    if (cat.type in estimatedByType) estimatedByType[cat.type] += amt;
  }

  const actualByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  let accumulativeSpent = 0;
  for (const t of monthTransactions) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    const amt = Number(t.amount) || 0;
    if (cat.isAccumulative) { accumulativeSpent += amt; continue; }
    if (cat.type in actualByType) actualByType[cat.type] += amt;
  }

  const ingresoRecibido = actualByType.income;
  const ingresoEstimado = estimatedByType.income;
  const gastosFijosPlan = estimatedByType.fixed_expense;
  const gastosVariablesPlan = estimatedByType.variable_expense;
  const ahorroPlan = estimatedByType.savings;
  const variableGastado = actualByType.variable_expense;
  const planDebt = Number(debtPlanned) || 0;

  const comprometido = gastosFijosPlan + planDebt + ahorroPlan + accumulativePlan;
  const disponible = ingresoRecibido - comprometido - variableGastado;
  const puedesGastar = Math.max(0, disponible);

  const porAsignar =
    ingresoEstimado - gastosFijosPlan - gastosVariablesPlan - ahorroPlan - accumulativePlan - planDebt;

  let estado;
  if (ingresoRecibido === 0) estado = 'neutral';
  else if (disponible < 0) estado = 'danger';
  else if (disponible < 0.1 * ingresoRecibido) estado = 'warning';
  else estado = 'good';

  return {
    ingresoRecibido,
    ingresoEstimado,
    gastosFijosPlan,
    gastosVariablesPlan,
    ahorroPlan,
    variableGastado,
    accumulativePlan,
    accumulativeSpent,
    debtPlanned: planDebt,
    debtPaid: Number(debtPaid) || 0,
    comprometido,
    disponible,
    puedesGastar,
    porAsignar,
    estado,
  };
```

- [ ] **Step 4: Verificar que pasa (incl. los 6 tests previos de getBudgetSummary)**

Run: `npm run test`
Expected: PASS — los tests previos siguen verdes (sin `isAccumulative`, `accumulativePlan/Spent` = 0 y todo igual) y el nuevo pasa.

- [ ] **Step 5: Lint + commit**

Run: `npm run lint` (0 problemas).
Commit (usuario):
```bash
git add src/utils/calculations.js src/utils/calculations.test.js
git commit -m "feat: treat accumulative categories as savings in getBudgetSummary"
```

---

## Task 4: Mapeo de columnas en `useCategoryStore`

**Files:**
- Modify: `src/stores/useCategoryStore.js`

- [ ] **Step 1: Mapear las columnas al leer**

En `fetchCategories`, en el `map` de `finalCategories` (el que produce `formattedData`):

```js
    const formattedData = finalCategories.map(c => ({
      ...c,
      isActive: c.is_active,
      sortOrder: c.sort_order,
      isAccumulative: c.is_accumulative || false,
      accumulationStart: c.accumulation_start || null
    }));
```

- [ ] **Step 2: Convertir camel→snake en `updateCategory`**

En `updateCategory`, junto a las conversiones de `isActive`/`sortOrder`, añade:

```js
    if (updates.isAccumulative !== undefined) {
      dbUpdates.is_accumulative = updates.isAccumulative;
      delete dbUpdates.isAccumulative;
    }
    if (updates.accumulationStart !== undefined) {
      dbUpdates.accumulation_start = updates.accumulationStart;
      delete dbUpdates.accumulationStart;
    }
```

(El `set` local ya hace `{ ...c, ...updates }`, así que la categoría en memoria queda con `isAccumulative`/`accumulationStart` camelCase correctos.)

- [ ] **Step 3: Lint + build + commit**

Run: `npm run lint && npm run build` (0 problemas, build OK).
Commit (usuario):
```bash
git add src/stores/useCategoryStore.js
git commit -m "feat: map is_accumulative/accumulation_start in category store"
```

---

## Task 5: BudgetPage — configurar y mostrar el sobre acumulativo

**Files:**
- Modify: `src/pages/BudgetPage.jsx`

- [ ] **Step 1: Imports y componente PotProgress**

Añade a los imports de calculations:
```js
import { calculateBudgetProgress, getProgressStatus, sumAmounts, getBudgetSummary, getAccumulatedBalance } from '../utils/calculations';
```
Añade el import de Modal (debajo del import de `CurrencyInput`):
```js
import Modal from '../components/ui/Modal';
```
Y añade `PiggyBank` al import existente de `lucide-react` (NO crees una segunda línea de import). Es decir, cambia:
```js
import { ChevronLeft, ChevronRight, Copy, AlertTriangle, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
```
por:
```js
import { ChevronLeft, ChevronRight, Copy, AlertTriangle, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
```

Define `PotProgress` junto a `BudgetEstimatedInput` (arriba del componente `BudgetPage`):
```jsx
function PotProgress({ pot }) {
  const pct = pot.budgeted > 0 ? (pot.spent / pot.budgeted) * 100 : 0;
  const ok = pot.available >= 0;
  return (
    <div>
      <div className={`progress-bar progress-${ok ? 'good' : 'danger'}`}>
        <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-xs mt-1" style={{ color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
        Bote: {formatCurrency(pot.available)} <span className="text-muted">de {formatCurrency(pot.budgeted)} acumulado</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Store, estado y cálculo del bote**

Cambia el destructuring de categorías:
```js
  const { categories, updateCategory } = useCategoryStore();
```

Añade estado del modal (junto a los otros `useState`):
```js
  const [configCat, setConfigCat] = useState(null);
  const [configForm, setConfigForm] = useState({ isAccumulative: false, accumulationStart: '' });
```

Añade el cálculo del bote por categoría acumulativa (después del `useMemo` de `summary`):
```js
  const accumulatedById = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      if (c.isAccumulative) {
        map[c.id] = getAccumulatedBalance({
          categoryId: c.id,
          accumulationStart: c.accumulationStart,
          budgets,
          transactions,
          uptoYear: year,
          uptoMonth: month,
        });
      }
    });
    return map;
  }, [categories, budgets, transactions, year, month]);
```

Añade los handlers del modal (junto a `handleEstimatedChange`):
```js
  const openConfig = (cat) => {
    const d = new Date();
    setConfigForm({
      isAccumulative: !!cat.isAccumulative,
      accumulationStart: cat.accumulationStart || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
    setConfigCat(cat);
  };

  const handleSaveConfig = () => {
    updateCategory(configCat.id, {
      isAccumulative: configForm.isAccumulative,
      accumulationStart: configForm.isAccumulative ? configForm.accumulationStart : null,
    });
    setConfigCat(null);
  };
```

- [ ] **Step 3: Badge + botón de config en la celda "Categoría"**

Reemplaza la celda de la categoría en `renderSection`:
```jsx
                  <td>
                    <span className="flex items-center gap-2">
                      <span>{row.category.icon}</span>
                      <span className="font-semibold">{row.category.name}</span>
                      {row.category.isAccumulative && (
                        <span className="badge badge-savings" title="Sobre acumulativo">🔁 Sobre</span>
                      )}
                      {row.category.type !== 'income' && (
                        <button
                          className="btn-icon"
                          title="Configurar sobre acumulativo"
                          onClick={() => openConfig(row.category)}
                          style={{ marginLeft: 'auto' }}
                        >
                          <PiggyBank size={14} />
                        </button>
                      )}
                    </span>
                  </td>
```

- [ ] **Step 4: Mostrar el bote en la celda "Progreso" para categorías acumulativas**

En la celda de progreso, antes del ternario `row.estimated > 0 ? ... : row.actual > 0 ? ... : ...`, antepón la rama acumulativa:
```jsx
                  <td>
                    {row.category.isAccumulative && accumulatedById[row.category.id] ? (
                      <PotProgress pot={accumulatedById[row.category.id]} />
                    ) : row.estimated > 0 ? (
```
(El resto del ternario existente queda igual; solo se añadió la primera condición y se cierra al final con el `)` ya presente.)

- [ ] **Step 5: El modal de configuración**

Antes del cierre `</div>` del `page-container` (junto a las demás secciones renderizadas, p.ej. después del bloque de "Pago de Deuda"):
```jsx
      <Modal
        isOpen={!!configCat}
        onClose={() => setConfigCat(null)}
        title={`Sobre acumulativo — ${configCat?.name || ''}`}
      >
        <div className="form-group">
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={configForm.isAccumulative}
              onChange={(e) => setConfigForm({ ...configForm, isAccumulative: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>
              Tratar como sobre acumulativo (arrastra el saldo no gastado mes a mes)
            </span>
          </label>
        </div>
        {configForm.isAccumulative && (
          <div className="form-group">
            <label className="form-label">Mes de inicio del bote</label>
            <input
              type="month"
              value={configForm.accumulationStart}
              onChange={(e) => setConfigForm({ ...configForm, accumulationStart: e.target.value })}
            />
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setConfigCat(null)}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSaveConfig}>Guardar</button>
        </div>
      </Modal>
```

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build OK.

- [ ] **Step 7: Verificación manual** (requiere la migración de la Task 1)

Run: `npm run dev`
1. En **Presupuesto**, clic en el ícono 🐷 de una categoría de gasto → activar "Sobre acumulativo", elegir mes de inicio → Guardar. Aparece el badge "🔁 Sobre".
2. Pon un presupuesto mensual (ej. 1,000) varios meses; registra un gasto grande de esa categoría. En su fila, el progreso muestra el **bote** (disponible / acumulado) y no sale rojo si había saldo.
3. En el **Dashboard**, confirma que "Puedes gastar" NO se hundió por ese gasto grande.

- [ ] **Step 8: Commit (usuario)**
```bash
git add src/pages/BudgetPage.jsx
git commit -m "feat: configure and display accumulative envelopes in BudgetPage"
```

---

## Fuera de alcance (no implementar)

- Reusar el módulo de Ahorros para esto.
- Múltiples botes por categoría / historial de retiros.
- Proyección de cuándo el bote llega a una meta.
