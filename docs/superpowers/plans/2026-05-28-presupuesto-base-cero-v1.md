# Presupuesto base cero v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer efectivo el presupuesto base cero: meter el pago de deuda en la ecuación "Por Asignar", mostrar un número "Puedes gastar" calculado sobre ingreso real recibido, y permitir un Modo Simple/Avanzado por usuario.

**Architecture:** Una función pura única (`getBudgetSummary`) en `src/utils/calculations.js` se vuelve la fuente de verdad del resumen mensual (ingreso recibido, comprometido, puedes gastar, por asignar, semáforo). `BudgetPage` y `DashboardPage` la consumen para mostrar cifras idénticas. Una preferencia `viewMode` en `useThemeStore` controla la densidad de la UI (Simple vs. Avanzado). Todo opera en moneda base DOP (las transacciones ya se almacenan convertidas a DOP).

**Tech Stack:** React 19, Vite 8, Zustand 5 (con `persist`), Vitest (nuevo, para la lógica pura), ESLint 10. Verificación: `npm run test`, `npm run lint`, `npm run build`, y comprobación manual con `npm run dev`.

---

## Notas de contexto para el implementador

- **Clasificación por tipo de categoría, no por `transaction.type`.** Cada transacción tiene `categoryId`; el tipo (`income` / `fixed_expense` / `variable_expense` / `savings`) se resuelve desde la categoría. Esto refleja cómo `BudgetPage` ya computa los "actual" por categoría, garantizando consistencia.
- **Las deudas viven en `useDebtStore`** (no son categorías). El pago mensual planificado se obtiene con `getTotalMonthlyPayment()` (ya convierte USD→DOP). El pago real del mes se suma desde `payments` filtrando por fecha.
- **Moneda base DOP.** `useTransactionStore.addTransaction` ya convierte USD→DOP al guardar; los montos en el store están en DOP.
- **No hay tests hoy.** Este plan instala Vitest y solo testea la capa pura. La UI/stores se verifican con lint + build + manual.
- **Tasa USD:** la constante `USD_TO_DOP_RATE` está en `src/utils/constants.js` (usada para convertir pagos de deuda en USD).

---

## Task 1: Instalar y configurar Vitest

**Files:**
- Modify: `package.json` (scripts)
- Create: `vitest.config.js`

- [ ] **Step 1: Instalar Vitest como devDependency**

Run:
```bash
npm install -D vitest@^2
```
Expected: `package.json` queda con `vitest` en `devDependencies`; se actualiza `package-lock.json`.

- [ ] **Step 2: Añadir scripts de test a package.json**

En `package.json`, dentro de `"scripts"`, añade `test` y `test:watch` (deja los existentes intactos):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: Crear la configuración de Vitest**

Crea `vitest.config.js` en la raíz del proyecto:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
```

- [ ] **Step 4: Verificar que el runner arranca**

Run:
```bash
npm run test
```
Expected: Vitest arranca y reporta "No test files found" (todavía no hay tests). El comando termina sin crash de configuración.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "chore: add vitest for unit testing pure logic"
```

---

## Task 2: `getBudgetSummary` — fuente única de verdad (TDD)

**Files:**
- Test: `src/utils/calculations.test.js` (crear)
- Modify: `src/utils/calculations.js` (añadir la función al final, antes de cualquier export default si lo hubiera — el archivo solo tiene named exports)

- [ ] **Step 1: Escribir el test que falla**

Crea `src/utils/calculations.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getBudgetSummary } from './calculations';

const categories = [
  { id: 'inc', type: 'income' },
  { id: 'fix', type: 'fixed_expense' },
  { id: 'var', type: 'variable_expense' },
  { id: 'sav', type: 'savings' },
];

describe('getBudgetSummary', () => {
  it('calcula puedesGastar = ingresoRecibido - comprometido - variableGastado', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 3000 },
      ],
      monthBudgets: [
        { categoryId: 'fix', estimatedAmount: 20000 },
        { categoryId: 'sav', estimatedAmount: 5000 },
      ],
      categories,
      debtPlanned: 10000,
      debtPaid: 0,
    });
    expect(r.ingresoRecibido).toBe(50000);
    expect(r.comprometido).toBe(35000); // 20000 fijo + 10000 deuda + 5000 ahorro
    expect(r.variableGastado).toBe(3000);
    expect(r.puedesGastar).toBe(12000);
    expect(r.estado).toBe('good');
  });

  it('marca danger y puedesGastar 0 cuando lo comprometido supera el ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [{ categoryId: 'inc', amount: 30000 }],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 35000 }],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.disponible).toBe(-5000);
    expect(r.puedesGastar).toBe(0);
    expect(r.estado).toBe('danger');
  });

  it('marca warning cuando el colchón es menor al 10% del ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 1000 },
      ],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 46000 }],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.disponible).toBe(3000); // < 5000 (10% de 50000)
    expect(r.estado).toBe('warning');
  });

  it('devuelve estado neutral cuando no hay ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 20000 }],
      categories,
      debtPlanned: 5000,
      debtPaid: 0,
    });
    expect(r.ingresoRecibido).toBe(0);
    expect(r.puedesGastar).toBe(0);
    expect(r.estado).toBe('neutral');
  });

  it('calcula porAsignar = ingresoEstimado - fijos - variables - ahorro - deuda', () => {
    const r = getBudgetSummary({
      monthTransactions: [],
      monthBudgets: [
        { categoryId: 'inc', estimatedAmount: 60000 },
        { categoryId: 'fix', estimatedAmount: 20000 },
        { categoryId: 'var', estimatedAmount: 15000 },
        { categoryId: 'sav', estimatedAmount: 5000 },
      ],
      categories,
      debtPlanned: 10000,
      debtPaid: 0,
    });
    expect(r.porAsignar).toBe(10000);
  });

  it('clasifica el gasto por el tipo de la categoría, no por transaction.type', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 40000 },
        { categoryId: 'var', amount: 2500, type: 'expense' }, // type genérico ignorado
      ],
      monthBudgets: [],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.variableGastado).toBe(2500);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run:
```bash
npm run test
```
Expected: FAIL — `getBudgetSummary is not a function` / `not exported`.

- [ ] **Step 3: Implementar `getBudgetSummary`**

Añade al final de `src/utils/calculations.js`:

```js
/**
 * Fuente única de verdad del resumen mensual del presupuesto base cero.
 * Todos los montos están en moneda base (DOP); el llamante debe pasar los
 * totales de deuda ya convertidos a DOP.
 *
 * Clasifica ingresos/gastos/ahorro por el TIPO DE LA CATEGORÍA (resuelto vía
 * categoryId), igual que BudgetPage, para garantizar cifras consistentes.
 *
 * @param {Object} params
 * @param {Array}  params.monthTransactions - transacciones del mes (DOP)
 * @param {Array}  params.monthBudgets - filas de presupuesto del mes ({categoryId, estimatedAmount})
 * @param {Array}  params.categories - todas las categorías ({id, type})
 * @param {number} params.debtPlanned - pago mensual de deuda planificado (DOP)
 * @param {number} params.debtPaid - pago de deuda real del mes (DOP)
 */
export function getBudgetSummary({
  monthTransactions = [],
  monthBudgets = [],
  categories = [],
  debtPlanned = 0,
  debtPaid = 0,
}) {
  const typeById = new Map(categories.map((c) => [c.id, c.type]));

  const estimatedByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  for (const b of monthBudgets) {
    const type = typeById.get(b.categoryId);
    if (type && type in estimatedByType) {
      estimatedByType[type] += Number(b.estimatedAmount) || 0;
    }
  }

  const actualByType = { income: 0, fixed_expense: 0, variable_expense: 0, savings: 0 };
  for (const t of monthTransactions) {
    const type = typeById.get(t.categoryId);
    if (type && type in actualByType) {
      actualByType[type] += Number(t.amount) || 0;
    }
  }

  const ingresoRecibido = actualByType.income;
  const ingresoEstimado = estimatedByType.income;
  const gastosFijosPlan = estimatedByType.fixed_expense;
  const gastosVariablesPlan = estimatedByType.variable_expense;
  const ahorroPlan = estimatedByType.savings;
  const variableGastado = actualByType.variable_expense;
  const planDebt = Number(debtPlanned) || 0;

  const comprometido = gastosFijosPlan + planDebt + ahorroPlan;
  const disponible = ingresoRecibido - comprometido - variableGastado;
  const puedesGastar = Math.max(0, disponible);

  const porAsignar =
    ingresoEstimado - gastosFijosPlan - gastosVariablesPlan - ahorroPlan - planDebt;

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
    debtPlanned: planDebt,
    debtPaid: Number(debtPaid) || 0,
    comprometido,
    disponible,
    puedesGastar,
    porAsignar,
    estado,
  };
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run:
```bash
npm run test
```
Expected: PASS — 6 tests verdes en `calculations.test.js`.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint
```
Expected: 0 problemas.

- [ ] **Step 6: Commit**

```bash
git add src/utils/calculations.js src/utils/calculations.test.js
git commit -m "feat: add getBudgetSummary single source of truth for budget math"
```

---

## Task 3: Preferencia `viewMode` (Simple/Avanzado) en el store de tema

**Files:**
- Modify: `src/stores/useThemeStore.js`

- [ ] **Step 1: Añadir estado y setter `viewMode`**

En `src/stores/useThemeStore.js`, dentro del objeto de estado (después de `mobileMenuOpen: false,`), añade el estado por defecto:

```js
      viewMode: 'simple', // 'simple' | 'advanced'
```

Y añade el setter (después de `setTheme: (theme) => set({ theme }),`):

```js
      setViewMode: (mode) => set({ viewMode: mode === 'advanced' ? 'advanced' : 'simple' }),
```

(El store ya usa `persist` con `name: 'fintrack-theme'` y sin `partialize`, así que `viewMode` se persiste automáticamente.)

- [ ] **Step 2: Lint**

Run:
```bash
npm run lint
```
Expected: 0 problemas.

- [ ] **Step 3: Build (verifica que no rompe nada)**

Run:
```bash
npm run build
```
Expected: build exitoso, sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/stores/useThemeStore.js
git commit -m "feat: add viewMode (simple/advanced) preference to theme store"
```

---

## Task 4: Deuda en la ecuación + resumen en BudgetPage

**Files:**
- Modify: `src/pages/BudgetPage.jsx`

Objetivo: traer el pago de deuda (planificado y real) al presupuesto, recalcular "Por Asignar" restando la deuda, añadir una tarjeta "Puedes gastar", y renderizar una sección "Pago de Deuda".

- [ ] **Step 1: Importar el store de deudas, la tasa USD y la nueva función**

En `src/pages/BudgetPage.jsx`:

Cambia la línea de import de calculations (actualmente):
```js
import { calculateBudgetProgress, getProgressStatus, sumAmounts } from '../utils/calculations';
```
por:
```js
import { calculateBudgetProgress, getProgressStatus, sumAmounts, getBudgetSummary } from '../utils/calculations';
```

Añade junto a los demás imports de stores (debajo de `import useCategoryStore from '../stores/useCategoryStore';`):
```js
import useDebtStore from '../stores/useDebtStore';
```

Cambia el import de constants (actualmente `import { MONTHS_ES } from '../utils/constants';`) por:
```js
import { MONTHS_ES, USD_TO_DOP_RATE } from '../utils/constants';
```

- [ ] **Step 2: Leer datos de deuda y calcular planificado/real del mes**

Dentro de `BudgetPage`, después de la línea `const { categories } = useCategoryStore();`, añade:

```js
  const debts = useDebtStore((s) => s.debts);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);

  const debtPlanned = getTotalMonthlyPayment();

  const debtPaid = useMemo(() => {
    return payments.reduce((sum, p) => {
      const d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return sum;
      const debt = debts.find((dd) => dd.id === p.debtId);
      const val = Number(p.amount) || 0;
      return sum + (debt && debt.currency === 'USD' ? val * USD_TO_DOP_RATE : val);
    }, 0);
  }, [payments, debts, year, month]);
```

- [ ] **Step 3: Calcular el resumen con la función única y reemplazar `balanceEstimated`**

Después del bloque `budgetRows` (después de su cierre `}, [categories, monthBudgets, monthTransactions]);`), añade:

```js
  const summary = useMemo(
    () =>
      getBudgetSummary({
        monthTransactions,
        monthBudgets,
        categories,
        debtPlanned,
        debtPaid,
      }),
    [monthTransactions, monthBudgets, categories, debtPlanned, debtPaid]
  );
```

Luego, reemplaza la línea existente:
```js
  const balanceEstimated = totalIncomeEstimated - totalExpenseEstimated - totalSavingsEstimated;
```
por:
```js
  const balanceEstimated = summary.porAsignar;
```

(Deja `balanceActual` como está.)

- [ ] **Step 4: Añadir la tarjeta "Puedes gastar" como primera KPI**

Dentro del `<div className="kpi-grid" ...>` de "Zero-Based Budget Summary Cards", inserta esta tarjeta **antes** de la tarjeta "Card 1: Ingresos":

```jsx
        {/* Card 0: Puedes gastar */}
        <div className="kpi-card" style={{
          '--kpi-accent':
            summary.estado === 'danger' ? 'var(--color-danger)'
            : summary.estado === 'warning' ? 'var(--color-warning)'
            : summary.estado === 'good' ? 'var(--color-success)'
            : 'var(--text-tertiary)'
        }}>
          <div className="kpi-label">💚 Puedes gastar</div>
          <div className="kpi-value" style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
            color:
              summary.estado === 'danger' ? 'var(--color-danger)'
              : summary.estado === 'warning' ? 'var(--color-warning)'
              : summary.estado === 'good' ? 'var(--color-success)'
              : 'var(--text-primary)'
          }}>
            {formatCurrency(summary.puedesGastar)}
          </div>
          <div className="text-xs text-muted mt-2 font-semibold">
            {summary.estado === 'neutral'
              ? 'Aún no has registrado ingresos este mes'
              : 'Disponible este mes sin atrasar pagos ni metas'}
          </div>
        </div>
```

- [ ] **Step 5: Añadir la sección "Pago de Deuda"**

Justo después de la línea que renderiza la sección de Ahorro:
```jsx
      {renderSection('Ahorro', <TrendingUp size={18} style={{ color: 'var(--color-savings)' }} />, savingsRows)}
```
añade este bloque (las deudas no son categorías, por eso es una tarjeta propia, no `renderSection`):

```jsx
      {(debtPlanned > 0 || debtPaid > 0) && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingDown size={18} style={{ color: 'var(--color-danger)' }} /> Pago de Deuda
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Planificado</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Pagado</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="font-semibold">Pagos del mes (deudas activas)</span></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(debtPlanned)}</td>
                  <td style={{ textAlign: 'right' }} className={debtPaid > 0 ? 'font-semibold' : 'text-muted'}>
                    {formatCurrency(debtPaid)}
                  </td>
                  <td style={{ textAlign: 'right' }} className={debtPlanned - debtPaid > 0 ? 'amount-negative' : 'text-muted'}>
                    {formatCurrency(debtPlanned - debtPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Lint**

Run:
```bash
npm run lint
```
Expected: 0 problemas (sin variables sin usar; `summary` y `debtPaid` se usan).

- [ ] **Step 7: Build**

Run:
```bash
npm run build
```
Expected: build exitoso.

- [ ] **Step 8: Verificación manual**

Run:
```bash
npm run dev
```
Abre la app → **Presupuesto**. Verifica:
- Aparece la tarjeta "💚 Puedes gastar" con color según semáforo.
- Si hay deudas activas con pago mensual, aparece la sección "Pago de Deuda" con Planificado/Pagado.
- "Por Asignar" ahora resta la deuda planificada (compara: debe bajar respecto a antes si tienes deuda).
- Detén el server (Ctrl+C) al terminar.

- [ ] **Step 9: Commit**

```bash
git add src/pages/BudgetPage.jsx
git commit -m "feat: integrate debt into zero-based equation and add safe-to-spend card"
```

---

## Task 5: Héroe "Puedes gastar" + consistencia en el Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Importar stores y función necesarios**

En `src/pages/DashboardPage.jsx`:

Añade a los imports de stores (debajo de `import useCategoryStore from '../stores/useCategoryStore';`):
```js
import useBudgetStore from '../stores/useBudgetStore';
```

Añade `getBudgetSummary` y la tasa. Tras los imports de `formatters`, añade:
```js
import { getBudgetSummary } from '../utils/calculations';
import { USD_TO_DOP_RATE } from '../utils/constants';
```

- [ ] **Step 2: Leer presupuestos y deudas del mes actual y calcular el resumen**

Dentro de `DashboardPage`, después de `const { getTotalDebt } = useDebtStore();`, añade:
```js
  const budgets = useBudgetStore((s) => s.budgets);
  const debts = useDebtStore((s) => s.debts);
  const payments = useDebtStore((s) => s.payments);
  const getTotalMonthlyPayment = useDebtStore((s) => s.getTotalMonthlyPayment);
```

Después del bloque `currentMonthTransactions` (tras su cierre `}, [transactions, currentMonth, currentYear]);`), añade:
```js
  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.year === currentYear && b.month === currentMonth),
    [budgets, currentYear, currentMonth]
  );

  const debtPaidThisMonth = useMemo(() => {
    return payments.reduce((sum, p) => {
      const d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return sum;
      const debt = debts.find((dd) => dd.id === p.debtId);
      const val = Number(p.amount) || 0;
      return sum + (debt && debt.currency === 'USD' ? val * USD_TO_DOP_RATE : val);
    }, 0);
  }, [payments, debts, currentYear, currentMonth]);

  const summary = useMemo(
    () =>
      getBudgetSummary({
        monthTransactions: currentMonthTransactions,
        monthBudgets,
        categories,
        debtPlanned: getTotalMonthlyPayment(),
        debtPaid: debtPaidThisMonth,
      }),
    [currentMonthTransactions, monthBudgets, categories, getTotalMonthlyPayment, debtPaidThisMonth]
  );
```

- [ ] **Step 3: Renderizar el héroe "Puedes gastar" antes del grid de KPIs**

Justo después de:
```jsx
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen financiero de {MONTHS_SHORT_ES[currentMonth]} {currentYear}</p>
      </div>
```
inserta:
```jsx
      {/* Héroe: Puedes gastar */}
      <div className="kpi-card" style={{
        marginBottom: 'var(--space-6)',
        '--kpi-accent':
          summary.estado === 'danger' ? 'var(--color-danger)'
          : summary.estado === 'warning' ? 'var(--color-warning)'
          : summary.estado === 'good' ? 'var(--color-success)'
          : 'var(--text-tertiary)'
      }}>
        <div className="kpi-label">💚 Puedes gastar este mes</div>
        <div className="kpi-value" style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          color:
            summary.estado === 'danger' ? 'var(--color-danger)'
            : summary.estado === 'warning' ? 'var(--color-warning)'
            : summary.estado === 'good' ? 'var(--color-success)'
            : 'var(--text-primary)'
        }}>
          {formatCurrency(summary.puedesGastar)}
        </div>
        <div className="text-sm text-muted mt-2">
          {summary.estado === 'neutral'
            ? 'Aún no has registrado ingresos este mes.'
            : 'Disponible sin atrasarte en pagos ni metas.'}
        </div>
      </div>
```

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint
```
Expected: 0 problemas.

- [ ] **Step 5: Build**

Run:
```bash
npm run build
```
Expected: build exitoso.

- [ ] **Step 6: Verificación manual**

Run:
```bash
npm run dev
```
Abre **Dashboard**. Verifica:
- El número "Puedes gastar" aparece arriba, grande, con color de semáforo.
- El número coincide con el de la página Presupuesto para el mes actual.
- Detén el server al terminar.

- [ ] **Step 7: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: add safe-to-spend hero to dashboard using shared summary"
```

---

## Task 6: Modo Simple vs. Avanzado (toggle + render condicional)

**Files:**
- Modify: `src/pages/SettingsPage.jsx` (toggle)
- Modify: `src/pages/DashboardPage.jsx` (ocultar detalle en Simple)
- Modify: `src/pages/BudgetPage.jsx` (ocultar tablas en Simple)

- [ ] **Step 1: Añadir el toggle Simple/Avanzado en Ajustes**

En `src/pages/SettingsPage.jsx`, cambia el destructuring del store de tema (actualmente `const { theme, setTheme } = useThemeStore();`) por:
```js
  const { theme, setTheme, viewMode, setViewMode } = useThemeStore();
```

Dentro de la tarjeta "Appearance Settings", después del `<div className="flex gap-2 mt-auto"> ... </div>` que contiene los botones Claro/Oscuro, añade un segundo grupo:
```jsx
          <div className="text-sm text-muted mb-2 mt-4">
            Nivel de detalle de la interfaz.
          </div>
          <div className="flex gap-2">
            <button
              className={`btn flex-1 justify-center ${viewMode === 'simple' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('simple')}
            >
              Simple
            </button>
            <button
              className={`btn flex-1 justify-center ${viewMode === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('advanced')}
            >
              Avanzado
            </button>
          </div>
```

- [ ] **Step 2: En Dashboard, mostrar el detalle solo en modo Avanzado**

En `src/pages/DashboardPage.jsx`, añade `viewMode` al import del store de tema. Como el Dashboard aún no importa `useThemeStore`, añade el import (debajo de `import useBudgetStore from '../stores/useBudgetStore';`):
```js
import useThemeStore from '../stores/useThemeStore';
```
Y dentro del componente, junto a los otros hooks de store, añade:
```js
  const viewMode = useThemeStore((s) => s.viewMode);
```

Envuelve el contenido de detalle (los dos `<div className="grid-2">` — el de los gráficos y el de transacciones/calendario) en una condición. Localiza el primer `<div className="grid-2">` (gráfico de tendencia + dona) y el segundo `<div className="grid-2" style={{ marginTop: 'var(--space-6)' }}>` (recientes + calendario). Envuélvelos juntos así:

```jsx
      {viewMode === 'advanced' && (
        <>
          {/* ...el primer grid-2 (gráficos)... */}
          {/* ...el segundo grid-2 (recientes + calendario)... */}
        </>
      )}
```

Es decir: inserta `{viewMode === 'advanced' && (` y `<>` antes del primer `<div className="grid-2">`, y `</>` y `)}` después del cierre del segundo grid-2 (antes del `</div>` que cierra `page-container`). El grid de KPIs (`kpi-grid`) y el héroe permanecen visibles en ambos modos.

- [ ] **Step 3: En Presupuesto, colapsar las tablas por categoría en modo Simple**

En `src/pages/BudgetPage.jsx`, añade el import del store de tema (debajo de `import useDebtStore from '../stores/useDebtStore';`):
```js
import useThemeStore from '../stores/useThemeStore';
```
Dentro del componente, añade:
```js
  const viewMode = useThemeStore((s) => s.viewMode);
```

Localiza el bloque de las 4 secciones renderizadas:
```jsx
      {/* Budget Tables by Section */}
      {renderSection('Ingresos', <TrendingUp size={18} style={{ color: 'var(--color-income)' }} />, incomeRows)}
      {renderSection('Gastos Fijos', <Wallet size={18} style={{ color: 'var(--color-fixed)' }} />, budgetRows.filter(r => r.category.type === 'fixed_expense'))}
      {renderSection('Gastos Variables', <TrendingDown size={18} style={{ color: 'var(--color-variable)' }} />, budgetRows.filter(r => r.category.type === 'variable_expense'))}
      {renderSection('Ahorro', <TrendingUp size={18} style={{ color: 'var(--color-savings)' }} />, savingsRows)}
```
y la sección "Pago de Deuda" añadida en Task 4. Envuelve **todas** estas (las 4 secciones + el bloque de Pago de Deuda) en:
```jsx
      {viewMode === 'advanced' && (
        <>
          {/* ...las 4 renderSection... */}
          {/* ...el bloque de Pago de Deuda... */}
        </>
      )}
```

En modo Simple quedan visibles: el selector de mes, las alertas, y las tarjetas resumen (incluida "Puedes gastar" y "Por Asignar"). Las tablas detalladas solo en Avanzado.

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint
```
Expected: 0 problemas.

- [ ] **Step 5: Build**

Run:
```bash
npm run build
```
Expected: build exitoso.

- [ ] **Step 6: Verificación manual**

Run:
```bash
npm run dev
```
Verifica:
- En **Ajustes → Apariencia** hay un toggle Simple/Avanzado y recuerda la elección al recargar.
- En **Simple:** Dashboard muestra solo héroe + KPIs (sin gráficos/recientes/calendario); Presupuesto muestra solo resumen (sin tablas).
- En **Avanzado:** todo visible como antes.
- Detén el server al terminar.

- [ ] **Step 7: Commit**

```bash
git add src/pages/SettingsPage.jsx src/pages/DashboardPage.jsx src/pages/BudgetPage.jsx
git commit -m "feat: add simple/advanced view mode toggle and conditional density"
```

---

## Cierre

- [ ] **Verificación final completa**

Run:
```bash
npm run test && npm run lint && npm run build
```
Expected: tests verdes, lint 0 problemas, build exitoso.

- [ ] **Resumen al usuario**

Explica: deuda integrada en "Por Asignar", número "Puedes gastar" sobre ingreso real (consistente entre Dashboard y Presupuesto), y Modo Simple/Avanzado por usuario. Recuerda que quedan para 2da ronda: sobres acumulativos y tasa USD editable.

---

## Fuera de alcance (no implementar en este plan)

- Sobres acumulativos / sinking funds.
- Tasa USD editable en Ajustes; entrada de ingresos en USD (la conversión al guardar ya existe).
- Modelo de asignación por cheque (enfoque C).
- Algoritmo automático de reparto deuda vs. ahorro.
