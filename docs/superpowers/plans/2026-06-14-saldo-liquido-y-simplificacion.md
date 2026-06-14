# Saldo líquido + simplificación del dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introducir un "efectivo disponible" que arrastra (saldo inicial + ingresos − gastos − apartados a ahorro), mostrarlo como estrella del Dashboard con un modal para apartar a ahorro, rescatar la comparativa mes-vs-mes de Reportes al Dashboard, y eliminar la pantalla de Reportes. **Todo activo solo en modo demo (localhost).**

**Architecture:** El efectivo es un **selector puro derivado** (`getLiquidCash`) sobre las transacciones que ya existen + un `initialCashBalance` nuevo en `usePrefsStore` (en memoria, sin persistir ni tocar Supabase). "Apartar a ahorro" reusa `demoAddContribution` (que ya crea una transacción tipo `'savings'` que el selector resta). La comparativa mes-vs-mes se mueve de `screens/reports/` a `screens/dashboard/` y el resto de Reportes se borra.

**Tech Stack:** React 19, Vite 8, Zustand 5, Recharts, Framer Motion, Vitest, TailwindCSS v4 (tokens en `stitch.css`).

**Spec:** [docs/superpowers/specs/2026-06-14-saldo-liquido-y-simplificacion-design.md](../specs/2026-06-14-saldo-liquido-y-simplificacion-design.md)

---

## Notas de implementación (leer antes de empezar)

- **TDD donde aplica:** la lógica nueva es `getLiquidCash` y `getLiquidDelta` (selectores puros) → se escriben con test primero (patrón existente: `dashboard/selectors.test.js`). La UI (celdas, modal) NO lleva tests unitarios: la app no tiene tests de componentes y forzarlos sería teatro. La UI se verifica con `npm run build` + inspección visual en demo.
- **Reuso, no reinvención:** "apartar a ahorro" YA EXISTE como `demoAddContribution(goalId, amount, date)` en [demoMode.js:610](../../../src/stitch/demoMode.js#L610) → crea una transacción tipo `'savings'`. El modal nuevo solo llama a esa función. NO crear lógica de aporte nueva.
- **Aislamiento demo:** las piezas nuevas se muestran/activan solo si `isDemoActive()`. Fuera de demo el Dashboard se ve como hoy (salvo la comparativa rescatada, que es inofensiva y aplica a todos).
- **Cashback:** los gastos restan netos de cashback. Existe `getEffectiveAmount(t)` en `utils/calculations` que devuelve `amount − cashbackEarned` para gastos; reusarlo.
- **Convención de commits:** mensajes en español, imperativo, prefijo `feat`/`refactor`/`test`/`chore`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `src/stitch/screens/dashboard/selectors.js` | Modificar | Añadir `getLiquidCash` y `getLiquidDelta` (puros). |
| `src/stitch/screens/dashboard/selectors.test.js` | Modificar | Tests de los dos selectores nuevos. |
| `src/stores/usePrefsStore.js` | Modificar | Campo `initialCashBalance` (default 0) + setter `setInitialCashBalance`. NO en `partialize`. |
| `src/stitch/demoMode.js` | Modificar | Sembrar `initialCashBalance` en seed demo/fresh; mutador `demoSetInitialCashBalance`. |
| `src/stitch/screens/dashboard/MonthComparison.jsx` | Crear (mover) | Componente comparativa, movido desde reports. |
| `src/stitch/screens/dashboard/SaveToVaultModal.jsx` | Crear | Modal "Apartar a ahorro". |
| `src/stitch/screens/StitchDashboard.jsx` | Modificar | Celda efectivo, botón apartar, celda comparativa, aviso saldo inicial; patrimonio incluye efectivo. |
| `src/stitch/screens/StitchSettings.jsx` | Modificar | Campo "Efectivo inicial" (solo demo). |
| `src/stitch/StitchShell.jsx` | Modificar | Quitar entrada de menú "Reportes". |
| `src/stitch/StitchApp.jsx` | Modificar | Quitar import + ruta `/reportes`. |
| `src/stitch/screens/StitchReports.jsx` + `src/stitch/screens/reports/` | Borrar | Eliminar pantalla (tras mover comparativa). |
| `src/i18n/translations.js` | Modificar | Claves nuevas (efectivo, apartar, saldo inicial). |

---

## Task 1: Selector `getLiquidCash` (efectivo derivado)

**Files:**
- Modify: `src/stitch/screens/dashboard/selectors.js`
- Test: `src/stitch/screens/dashboard/selectors.test.js`

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de [selectors.test.js](../../../src/stitch/screens/dashboard/selectors.test.js). El import de arriba (`line 2`) debe incluir `getLiquidCash`:

```javascript
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash } from './selectors';
```

Bloque de tests (usa el helper `tx` ya definido en el archivo, que crea `{ categoryId, amount, type, cashbackEarned }`):

```javascript
describe('getLiquidCash', () => {
  it('sin transacciones → solo el saldo inicial', () => {
    expect(getLiquidCash([], 50000)).toBe(50000);
  });

  it('los ingresos suben el efectivo', () => {
    const txs = [tx('c1', 1000, 'income')];
    expect(getLiquidCash(txs, 0)).toBe(1000);
  });

  it('los gastos bajan el efectivo, netos de cashback', () => {
    // gasto 200 con 20 de cashback → resta 180
    const txs = [tx('c1', 200, 'variable_expense', 20)];
    expect(getLiquidCash(txs, 1000)).toBe(820);
  });

  it('los apartados a ahorro (savings) bajan el efectivo', () => {
    const txs = [tx('c1', 500, 'savings')];
    expect(getLiquidCash(txs, 1000)).toBe(500);
  });

  it('combina saldo inicial, ingresos, gastos y ahorros', () => {
    const txs = [
      tx('c1', 2000, 'income'),
      tx('c2', 300, 'variable_expense', 0),
      tx('c3', 150, 'fixed_expense', 0),
      tx('c4', 500, 'savings'),
    ];
    // 1000 + 2000 - 300 - 150 - 500 = 2050
    expect(getLiquidCash(txs, 1000)).toBe(2050);
  });

  it('saldo inicial inválido o ausente → tratado como 0', () => {
    expect(getLiquidCash([tx('c1', 100, 'income')], undefined)).toBe(100);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- selectors.test.js`
Expected: FAIL — `getLiquidCash is not a function` (o `is not exported`).

- [ ] **Step 3: Implementar `getLiquidCash`**

Añadir al final de [selectors.js](../../../src/stitch/screens/dashboard/selectors.js). Importar `getEffectiveAmount` arriba (junto al import de `groupByCategory`):

```javascript
import { groupByCategory, getEffectiveAmount } from '../../../utils/calculations';
```

Selector:

```javascript
const EXPENSE_TYPES = ['expense', 'fixed_expense', 'variable_expense'];

// Efectivo disponible (líquido) DERIVADO de los movimientos: arranca en el saldo
// inicial declarado, sube con ingresos, baja con gastos (netos de cashback) y con
// lo apartado a ahorro (transacciones tipo 'savings'). Una sola fuente de verdad:
// las transacciones. No se almacena un saldo mutable.
export function getLiquidCash(transactions, initialCashBalance) {
  let cash = Number(initialCashBalance) || 0;
  for (const t of transactions || []) {
    if (t.type === 'income') cash += Number(t.amount) || 0;
    else if (EXPENSE_TYPES.includes(t.type)) cash -= getEffectiveAmount(t);
    else if (t.type === 'savings') cash -= Number(t.amount) || 0;
  }
  return cash;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- selectors.test.js`
Expected: PASS (todos los `getLiquidCash` verdes).

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/dashboard/selectors.js src/stitch/screens/dashboard/selectors.test.js
git commit -m "feat(dashboard): selector getLiquidCash (efectivo derivado)"
```

---

## Task 2: Selector `getLiquidDelta` (delta del mes)

**Files:**
- Modify: `src/stitch/screens/dashboard/selectors.js`
- Test: `src/stitch/screens/dashboard/selectors.test.js`

**Contexto:** la sub-línea de la celda de efectivo muestra cuánto cambió el efectivo en el mes seleccionado (income − gastos netos − savings de ESE mes). Recibe las transacciones YA filtradas del mes (el Dashboard ya tiene `monthTx`).

- [ ] **Step 1: Escribir el test que falla**

Añadir `getLiquidDelta` al import de la línea 2 de [selectors.test.js](../../../src/stitch/screens/dashboard/selectors.test.js):

```javascript
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash, getLiquidDelta } from './selectors';
```

Tests:

```javascript
describe('getLiquidDelta', () => {
  it('sin transacciones → 0', () => {
    expect(getLiquidDelta([])).toBe(0);
  });

  it('income − gastos netos − savings del mes', () => {
    const txs = [
      tx('c1', 5000, 'income'),
      tx('c2', 1200, 'variable_expense', 200), // neto 1000
      tx('c3', 500, 'savings'),
    ];
    // 5000 - 1000 - 500 = 3500
    expect(getLiquidDelta(txs)).toBe(3500);
  });

  it('mes negativo cuando se gasta más de lo que entra', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c2', 1500, 'fixed_expense', 0)];
    expect(getLiquidDelta(txs)).toBe(-500);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- selectors.test.js`
Expected: FAIL — `getLiquidDelta is not a function`.

- [ ] **Step 3: Implementar `getLiquidDelta`**

Añadir en [selectors.js](../../../src/stitch/screens/dashboard/selectors.js), debajo de `getLiquidCash` (reusa la constante `EXPENSE_TYPES` ya definida en Task 1):

```javascript
// Cambio del efectivo en un conjunto de transacciones (típicamente las del mes
// seleccionado): income − gastos netos − apartados a ahorro. Misma regla que
// getLiquidCash pero sin saldo inicial (es un delta, no un saldo).
export function getLiquidDelta(monthTransactions) {
  let delta = 0;
  for (const t of monthTransactions || []) {
    if (t.type === 'income') delta += Number(t.amount) || 0;
    else if (EXPENSE_TYPES.includes(t.type)) delta -= getEffectiveAmount(t);
    else if (t.type === 'savings') delta -= Number(t.amount) || 0;
  }
  return delta;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- selectors.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/dashboard/selectors.js src/stitch/screens/dashboard/selectors.test.js
git commit -m "feat(dashboard): selector getLiquidDelta (cambio del mes)"
```

---

## Task 3: Campo `initialCashBalance` en usePrefsStore

**Files:**
- Modify: `src/stores/usePrefsStore.js`

**Contexto:** el store usa `persist` con `partialize` ([usePrefsStore.js:124](../../../src/stores/usePrefsStore.js#L124)). El campo nuevo NO debe ir en `partialize` (no se persiste en sessionStorage; vive solo en memoria). El setter sale temprano en demo igual que `setBudgetLevel` ([línea 85](../../../src/stores/usePrefsStore.js#L85)). En esta fase NO se toca Supabase.

- [ ] **Step 1: Añadir el campo al estado**

En [usePrefsStore.js](../../../src/stores/usePrefsStore.js), dentro del objeto de estado inicial (después de `prefsLoaded: false,` en la línea ~34):

```javascript
      // Efectivo líquido inicial declarado por el usuario (modo demo). NO se
      // persiste (no está en partialize) ni se sincroniza a Supabase en esta fase.
      initialCashBalance: 0,
```

- [ ] **Step 2: Añadir el setter**

Dentro del objeto del store, después de `setCurrency` (antes del cierre del objeto, ~línea 119):

```javascript
      /** Fija el efectivo inicial (modo demo). Solo memoria; no toca Supabase. */
      setInitialCashBalance: (amount) => {
        const value = Number(amount) || 0;
        set({ initialCashBalance: value });
        // Fase demo: no se persiste ni se sincroniza. Si en el futuro se conecta a
        // Supabase, aquí iría el upsert tras `if (isDemoActive()) return;`.
      },
```

- [ ] **Step 3: Verificar que el build pasa**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/stores/usePrefsStore.js
git commit -m "feat(prefs): campo initialCashBalance en memoria (sin persistir)"
```

---

## Task 4: Sembrar y mutar el saldo inicial en demoMode

**Files:**
- Modify: `src/stitch/demoMode.js`

**Contexto:** `seedDemoStores` ([demoMode.js:222](../../../src/stitch/demoMode.js#L222)) siembra los stores con datos de ejemplo; `seedFreshStores` ([línea 245](../../../src/stitch/demoMode.js#L245)) los deja vacíos. El demo establecido debe arrancar con un efectivo inicial realista; el "usuario nuevo" en 0 (para disparar el aviso).

- [ ] **Step 1: Sembrar `initialCashBalance` en el demo establecido**

En `seedDemoStores`, la línea que setea prefs ([demoMode.js:229](../../../src/stitch/demoMode.js#L229)) hoy es:

```javascript
  usePrefsStore.setState({ currency: 'DOP' });
```

Cambiarla a (un saldo inicial coherente con los datos sembrados — 6 meses de ~2 salarios de 85k y gastos; 75.000 es un líquido de arranque realista):

```javascript
  usePrefsStore.setState({ currency: 'DOP', initialCashBalance: 75000 });
```

- [ ] **Step 2: Sembrar 0 en el modo "usuario nuevo"**

En `seedFreshStores`, la línea de prefs ([demoMode.js:252](../../../src/stitch/demoMode.js#L252)) hoy es:

```javascript
  usePrefsStore.setState({ currency: null, tutorialSeen: false, budgetLevel: 'tracking', prefsLoaded: false });
```

Cambiarla a:

```javascript
  usePrefsStore.setState({ currency: null, tutorialSeen: false, budgetLevel: 'tracking', prefsLoaded: false, initialCashBalance: 0 });
```

- [ ] **Step 3: Añadir el mutador `demoSetInitialCashBalance`**

Al final de [demoMode.js](../../../src/stitch/demoMode.js) (después del último export). Reusa `usePrefsStore` (ya importado en la línea 14):

```javascript
// Efectivo inicial (demo). Lo escribe el campo "Efectivo inicial" en Ajustes.
export function demoSetInitialCashBalance(amount) {
  usePrefsStore.setState({ initialCashBalance: Number(amount) || 0 });
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/demoMode.js
git commit -m "feat(demo): sembrar y mutar initialCashBalance"
```

---

## Task 5: Mover MonthComparison y su selector al Dashboard

**Files:**
- Create: `src/stitch/screens/dashboard/MonthComparison.jsx`
- Modify: `src/stitch/screens/dashboard/selectors.js`
- Test: `src/stitch/screens/dashboard/selectors.test.js`

**Contexto:** `getMonthComparison` vive en `reports/selectors.js` ([línea 42](../../../src/stitch/screens/reports/selectors.js#L42)) con dependencias `getEffectiveAmount` (ya importado en Task 1), `tr` (de i18n/runtime), y helpers locales `isExpense`/`inMonth`. Se copia al dashboard para poder borrar `reports/` en la Task 9.

- [ ] **Step 1: Escribir el test que falla para `getMonthComparison`**

Añadir `getMonthComparison` al import de la línea 2 de [selectors.test.js](../../../src/stitch/screens/dashboard/selectors.test.js):

```javascript
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash, getLiquidDelta, getMonthComparison } from './selectors';
```

Tests (usa fechas explícitas; `refDate` fija el "mes actual"):

```javascript
describe('getMonthComparison', () => {
  const cmpCats = [{ id: 'c1', name: 'Supermercado', color: '#aaa' }, { id: 'c2', name: 'Transporte', color: '#bbb' }];
  const dtx = (categoryId, amount, date, type = 'variable_expense') => ({ categoryId, amount, type, cashbackEarned: 0, date });
  const ref = new Date('2026-06-15T00:00:00');

  it('sin gastos → arreglo vacío', () => {
    expect(getMonthComparison([], cmpCats, ref)).toEqual([]);
  });

  it('compara mes actual (junio) vs anterior (mayo) por categoría', () => {
    const txs = [
      dtx('c1', 1000, '2026-06-05'), // junio: current
      dtx('c1', 600, '2026-05-05'),  // mayo: previous
      dtx('c2', 300, '2026-06-10'),  // junio, categoría nueva (sin previo)
    ];
    const r = getMonthComparison(txs, cmpCats, ref);
    const superm = r.find((x) => x.name === 'Supermercado');
    expect(superm.current).toBe(1000);
    expect(superm.previous).toBe(600);
    expect(superm.deltaPct).toBeCloseTo(((1000 - 600) / 600) * 100);
    const transp = r.find((x) => x.name === 'Transporte');
    expect(transp.current).toBe(300);
    expect(transp.previous).toBe(0);
    expect(transp.deltaPct).toBeNull(); // sin mes previo
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- selectors.test.js`
Expected: FAIL — `getMonthComparison is not a function`.

- [ ] **Step 3: Implementar `getMonthComparison` en el dashboard**

Añadir en [selectors.js](../../../src/stitch/screens/dashboard/selectors.js). Asegurar que `tr` esté importado (la línea 6 ya importa `tr` desde `'../../../i18n/runtime'`). Añadir el helper `inMonth` (local) y el selector:

```javascript
const inMonthCmp = (t, y, m) => {
  if (!t.date) return false;
  const d = new Date(t.date + 'T00:00:00');
  return d.getFullYear() === y && d.getMonth() === m;
};

// Comparativa por categoría: gasto del mes actual vs el anterior (relativo a
// refDate). Movido desde reports/. Devuelve [{ name, color, current, previous,
// deltaPct }] ordenado por mayor cambio absoluto. deltaPct null si no hubo mes
// previo (categoría nueva).
export function getMonthComparison(transactions, categories, refDate = new Date()) {
  const curY = refDate.getFullYear(), curM = refDate.getMonth();
  let prevM = curM - 1, prevY = curY;
  if (prevM < 0) { prevM = 11; prevY -= 1; }

  const map = new Map();
  const bump = (t, key) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const name = cat?.name || tr('screens.charts.uncategorized');
    const color = cat?.color || '#94a3b8';
    if (!map.has(name)) map.set(name, { name, color, current: 0, previous: 0 });
    map.get(name)[key] += getEffectiveAmount(t);
  };
  for (const t of transactions) {
    if (!EXPENSE_TYPES.includes(t.type)) continue;
    if (inMonthCmp(t, curY, curM)) bump(t, 'current');
    else if (inMonthCmp(t, prevY, prevM)) bump(t, 'previous');
  }
  return [...map.values()]
    .map((x) => ({ ...x, deltaPct: x.previous > 0 ? ((x.current - x.previous) / x.previous) * 100 : null }))
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- selectors.test.js`
Expected: PASS.

- [ ] **Step 5: Crear el componente en el dashboard**

Crear `src/stitch/screens/dashboard/MonthComparison.jsx` con el contenido del componente actual de reports, ajustando solo el import de `CHART` (sube un nivel menos de carpeta: de `'../../chartTokens'` se mantiene igual porque ambos están a `screens/<x>/`):

```javascript
// Comparativa mes actual vs anterior por categoría: barra divergente + delta %.
// Movido desde screens/reports/ al dashboard.
import { formatCurrency } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { CHART } from '../../chartTokens';

const fmt = (n) => formatCurrency(n);

export default function MonthComparison({ data }) {
  const { t } = useI18n();
  const rows = (data || []).filter((d) => d.current > 0 || d.previous > 0).slice(0, 8);
  if (rows.length === 0) {
    return <p className="font-body-md text-body-md text-text-muted py-xl text-center">{t('screens.reports.needTwoMonths')}</p>;
  }
  const maxDelta = Math.max(1, ...rows.map((d) => Math.abs(d.current - d.previous)));

  return (
    <div className="flex flex-col gap-md">
      {rows.map((d) => {
        const delta = d.current - d.previous;
        const up = delta > 0;
        const widthPct = (Math.abs(delta) / maxDelta) * 50;
        const isNew = d.previous === 0;
        return (
          <div key={d.name} className="flex items-center gap-sm">
            <span className="font-label-sm text-label-sm text-on-surface w-[120px] truncate shrink-0">{d.name}</span>
            <div className="relative flex-grow h-3 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border-subtle" />
              <div
                className="absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{
                  background: up ? CHART.error : CHART.tertiary,
                  width: `${widthPct}%`,
                  left: up ? '50%' : `${50 - widthPct}%`,
                }}
              />
            </div>
            <span className={`font-mono-data text-mono-data shrink-0 w-[56px] text-right whitespace-nowrap ${up ? 'text-accent-error' : 'text-tertiary'}`}>
              {isNew ? t('screens.reports.newLabel') : `${up ? '+' : ''}${d.deltaPct.toFixed(0)}%`}
            </span>
            <span className="font-mono-data text-mono-data text-text-muted shrink-0 text-right whitespace-nowrap tabular-nums hidden sm:inline">
              {isNew ? fmt(d.current) : <>{fmt(d.previous)} <span className="text-text-muted/60">→</span> <span className="text-on-surface-variant">{fmt(d.current)}</span></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

> Nota: las claves i18n `screens.reports.needTwoMonths`, `screens.reports.newLabel` se conservan aunque Reportes se borre (siguen siendo válidas; no se eliminan en Task 10).

- [ ] **Step 6: Verificar build + test**

Run: `npm run build`
Expected: build OK.
Run: `npm test`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add src/stitch/screens/dashboard/MonthComparison.jsx src/stitch/screens/dashboard/selectors.js src/stitch/screens/dashboard/selectors.test.js
git commit -m "refactor(dashboard): mover comparativa mes-vs-mes desde reports"
```

---

## Task 6: Claves i18n nuevas

**Files:**
- Modify: `src/i18n/translations.js`

**Contexto:** la app es i18n es/en completo. Toda cadena visible necesita su clave en ambos idiomas. Abrir [translations.js](../../../src/i18n/translations.js) y localizar el bloque `dashboard` (es y en). Añadir las claves nuevas en AMBOS idiomas, respetando la estructura existente.

- [ ] **Step 1: Añadir claves en español**

Dentro del objeto `dashboard` del idioma español, añadir:

```javascript
    liquidCash: 'Efectivo disponible',
    liquidCashInfo: 'Tu dinero gastable ahora: efectivo inicial + ingresos − gastos − lo apartado a ahorro.',
    saveToVault: 'Apartar a ahorro',
    saveToVaultTitle: 'Apartar a ahorro',
    saveAmount: 'Monto a apartar',
    saveToGoal: 'A qué meta',
    saveConfirm: 'Apartar',
    saveOverWarning: 'Vas a quedar con efectivo negativo.',
    saveDone: 'Apartado a ahorro',
    declareInitialCash: 'Declara tu efectivo actual para empezar',
    monthComparison: 'Cambios vs mes anterior',
```

- [ ] **Step 2: Añadir claves en inglés**

Dentro del objeto `dashboard` del idioma inglés, añadir:

```javascript
    liquidCash: 'Available cash',
    liquidCashInfo: 'Your spendable money now: starting cash + income − expenses − what you set aside to savings.',
    saveToVault: 'Set aside to savings',
    saveToVaultTitle: 'Set aside to savings',
    saveAmount: 'Amount to set aside',
    saveToGoal: 'To which goal',
    saveConfirm: 'Set aside',
    saveOverWarning: 'You will end up with negative cash.',
    saveDone: 'Set aside to savings',
    declareInitialCash: 'Declare your current cash to get started',
    monthComparison: 'Changes vs last month',
```

- [ ] **Step 3: Añadir la clave del campo de Ajustes (ambos idiomas)**

Localizar el objeto `screens.settings` (es y en). En español añadir:

```javascript
      initialCashLabel: 'Efectivo inicial',
      initialCashHelp: 'Tu efectivo líquido al empezar. El Dashboard parte de aquí (solo demo).',
```

En inglés:

```javascript
      initialCashLabel: 'Starting cash',
      initialCashHelp: 'Your liquid cash at the start. The Dashboard builds from here (demo only).',
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/translations.js
git commit -m "feat(i18n): claves de efectivo, apartar a ahorro y efectivo inicial"
```

---

## Task 7: Modal "Apartar a ahorro"

**Files:**
- Create: `src/stitch/screens/dashboard/SaveToVaultModal.jsx`

**Contexto:** el modal reusa `demoAddContribution(goalId, amount, dateISO)` ([demoMode.js:610](../../../src/stitch/demoMode.js#L610)). Patrón de modal/select/input/datepicker: ver `screens/vaults/ContributionModal.jsx` como referencia de estilo. Componentes: `StitchCurrencyInput`, `StitchSelect`, `StitchDatePicker`, `todayISO` de formatters.

- [ ] **Step 1: Crear el componente del modal**

Crear `src/stitch/screens/dashboard/SaveToVaultModal.jsx`:

```javascript
// Modal "Apartar a ahorro": mueve efectivo a una meta. Reusa demoAddContribution
// (crea una transacción 'savings' que el selector getLiquidCash resta del efectivo).
// Solo se usa en modo demo (el Dashboard solo lo monta si isDemoActive()).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchSelect from '../../StitchSelect';
import StitchDatePicker from '../../StitchDatePicker';
import { useI18n } from '../../../contexts/I18nContext';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { demoAddContribution } from '../../demoMode';
import { EASE_OUT } from '../../motionTokens';

export default function SaveToVaultModal({ open, onClose, goals, availableCash }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [goalId, setGoalId] = useState('');
  const [date, setDate] = useState(todayISO());

  const activeGoals = (goals || []).filter((g) => g.status !== 'completed');
  const options = activeGoals.map((g) => ({ value: g.id, label: g.title }));
  const numAmount = Number(amount) || 0;
  const over = numAmount > availableCash;
  const canSave = numAmount > 0 && goalId;

  const reset = () => { setAmount(''); setGoalId(''); setDate(todayISO()); };

  const submit = () => {
    if (!canSave) return;
    demoAddContribution(goalId, numAmount, date);
    toast.success(`${t('dashboard.saveDone')}: ${formatCurrency(numAmount)}`);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-card rounded-lg inner-glow p-lg w-full max-w-[420px] flex flex-col gap-md"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline-md text-headline-md text-on-surface">{t('dashboard.saveToVaultTitle')}</h2>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('dashboard.saveAmount')}</span>
              <StitchCurrencyInput value={amount} onChange={setAmount} />
            </label>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('dashboard.saveToGoal')}</span>
              <StitchSelect value={goalId} onChange={setGoalId} options={options} />
            </label>

            <label className="flex flex-col gap-xs">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('dashboard.date') || 'Fecha'}</span>
              <StitchDatePicker value={date} onChange={setDate} />
            </label>

            {over && (
              <span className="font-label-sm text-label-sm text-accent-warning">{t('dashboard.saveOverWarning')}</span>
            )}

            <div className="flex justify-end gap-sm mt-sm">
              <button onClick={onClose} className="px-md py-sm rounded font-label-sm text-label-sm text-text-muted hover:text-on-surface">
                {t('common.cancel') || 'Cancelar'}
              </button>
              <button
                onClick={submit}
                disabled={!canSave}
                className="px-md py-sm rounded bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-40"
              >
                {t('dashboard.saveConfirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

> Antes de implementar, verificar el nombre real del export de `EASE_OUT` en [src/stitch/motionTokens.js](../../../src/stitch/motionTokens.js) y de `todayISO` en [src/utils/formatters.js](../../../src/utils/formatters.js); ajustar el import si el nombre difiere. También confirmar las firmas de `StitchCurrencyInput`/`StitchSelect`/`StitchDatePicker` (value/onChange) abriendo cada componente — si difieren, ajustar props.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK (el componente compila aunque aún no se monte).

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/dashboard/SaveToVaultModal.jsx
git commit -m "feat(dashboard): modal Apartar a ahorro (reusa demoAddContribution)"
```

---

## Task 8: Integrar todo en el Dashboard

**Files:**
- Modify: `src/stitch/screens/StitchDashboard.jsx`

**Contexto:** el Dashboard ya tiene `transactions`, `monthTx`, `breakdown`, `split` (de `getNetWorthSplit`), `categories`, `goals`, y un grid bento. Hay que: leer `initialCashBalance` del store, calcular efectivo y delta, montar la celda de efectivo (estrella), el botón + modal de apartar, la celda de comparativa, el aviso de saldo inicial, y hacer que el patrimonio incluya el efectivo. Todo lo nuevo va detrás de `isDemoActive()`.

- [ ] **Step 1: Añadir imports**

En [StitchDashboard.jsx](../../../src/stitch/screens/StitchDashboard.jsx), junto a los imports existentes:

```javascript
import { useState } from 'react'; // si no está ya importado (ajustar el import de react existente)
import usePrefsStore from '../../stores/usePrefsStore';
import { isDemoActive } from '../demoMode';
import { getLiquidCash, getLiquidDelta, getMonthComparison } from './dashboard/selectors';
import MonthComparison from './dashboard/MonthComparison';
import SaveToVaultModal from './dashboard/SaveToVaultModal';
```

> Nota: `getCategoryBreakdown`, `getBudgetUsage`, etc. ya se importan desde `'./dashboard/selectors'` en la línea 22. Añadir `getLiquidCash, getLiquidDelta, getMonthComparison` a ESE import existente en lugar de duplicarlo.

- [ ] **Step 2: Calcular efectivo, delta, comparativa y estado del modal**

Dentro del componente `StitchDashboard`, junto a los demás `useMemo` (después de `breakdown`, ~línea 135):

```javascript
  const demo = isDemoActive();
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const liquidCash = useMemo(() => getLiquidCash(transactions, initialCashBalance), [transactions, initialCashBalance]);
  const liquidDelta = useMemo(() => getLiquidDelta(monthTx), [monthTx]);
  const comparison = useMemo(() => getMonthComparison(transactions, categories, now), [transactions, categories, now]);
  const [saveOpen, setSaveOpen] = useState(false);
```

- [ ] **Step 3: Hacer que el patrimonio neto incluya el efectivo**

El Dashboard usa `split.netWorth` (de `getNetWorthSplit(totalSaved, totalDebt)`) para la celda de patrimonio. En demo, sumar el efectivo. Localizar dónde se renderiza `split.netWorth` (la celda de patrimonio, ~línea 223) y cambiar el valor mostrado a:

```javascript
              <Stat value={<CountUp value={(demo ? liquidCash : 0) + split.netWorth} format={fmt} />} mobileValue={fmtMob((demo ? liquidCash : 0) + split.netWorth)} cls={((demo ? liquidCash : 0) + split.netWorth) >= 0 ? 'text-tertiary' : 'text-accent-error'} />
```

> Fuera de demo `liquidCash` no aplica (suma 0) → patrimonio idéntico a hoy. En demo incluye el efectivo.

- [ ] **Step 4: Añadir la celda "Efectivo disponible" como estrella (solo demo)**

Dentro del `<Stagger>`, como PRIMER `Stagger.Item` del grid (antes del `.map` de `metrics`, ~línea 205). Ocupa una celda destacada:

```javascript
        {demo && (
          <Stagger.Item className="col-span-2 md:col-span-6">
            <div className="glass-card rounded-lg inner-glow p-md flex flex-col gap-sm h-full">
              <div className="font-mono-data text-mono-data text-text-muted border-b border-border-subtle pb-xs flex items-center justify-between gap-xs">
                <span className="truncate">{t('dashboard.liquidCash').toUpperCase()}</span>
                <InfoTip text={t('dashboard.liquidCashInfo')} />
              </div>
              <div className="flex items-end justify-between gap-sm flex-wrap">
                <div>
                  <Stat value={<CountUp value={liquidCash} format={fmt} />} mobileValue={fmtMob(liquidCash)} cls={liquidCash >= 0 ? 'text-on-surface' : 'text-accent-error'} />
                  <span className={`font-mono-data text-mono-data ${liquidDelta >= 0 ? 'text-tertiary' : 'text-accent-error'}`}>
                    {liquidDelta >= 0 ? '+' : '−'}{fmt(Math.abs(liquidDelta))} {t('dashboard.thisMonth') || ''}
                  </span>
                </div>
                <button
                  onClick={() => setSaveOpen(true)}
                  className="px-md py-sm rounded bg-primary text-on-primary font-label-sm text-label-sm active:scale-[0.97]"
                >
                  {t('dashboard.saveToVault')}
                </button>
              </div>
            </div>
          </Stagger.Item>
        )}
```

> Verificar que `InfoTip` y `Stat` están importados (sí: [línea 23](../../../src/stitch/screens/StitchDashboard.jsx#L23)). Si `t('dashboard.thisMonth')` no existe, añadir la clave en Task 6 o usar texto fijo; para no romper, el `|| ''` evita "undefined".

- [ ] **Step 5: Añadir el aviso de saldo inicial sin declarar (solo demo, efectivo 0)**

Justo después del banner de mes pasado (~línea 199), antes del `<Stagger>`:

```javascript
      {demo && initialCashBalance === 0 && (
        <div className="flex items-center gap-sm mb-md px-md py-sm rounded bg-primary/10 border border-primary/30">
          <MS name="info" className="!text-[16px] text-primary" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t('dashboard.declareInitialCash')}</span>
          <button onClick={() => navigate('/ajustes')} className="ml-auto font-mono-data text-mono-data text-primary hover:underline">{t('nav.settings') || 'Ajustes'}</button>
        </div>
      )}
```

> Verificar la ruta real de Ajustes en `StitchApp.jsx` (puede ser `/ajustes` o `/configuracion`) y la clave `nav.settings`; ajustar.

- [ ] **Step 6: Añadir la celda de comparativa mes-vs-mes**

Dentro del `<Stagger>`, como un `Stagger.Item` más (cerca de donut/recordatorios, ~línea 267). Aplica a todos (no solo demo), reusando `BentoCell`:

```javascript
        <Stagger.Item className="col-span-2 md:col-span-12">
          <BentoCell title={t('dashboard.monthComparison')} icon="compare_arrows" className="h-full">
            <MonthComparison data={comparison} />
          </BentoCell>
        </Stagger.Item>
```

- [ ] **Step 7: Montar el modal al final del componente**

Antes del cierre del `return` (después de `</div>` del contenedor raíz, o dentro de él al final). Solo en demo:

```javascript
      {demo && (
        <SaveToVaultModal
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          goals={goals}
          availableCash={liquidCash}
        />
      )}
```

- [ ] **Step 8: Verificar build + test + inspección**

Run: `npm run build`
Expected: build OK.
Run: `npm test`
Expected: verde.
Inspección (manual, en `npm run dev` → Entrar como demo): celda de efectivo visible con monto y delta; botón abre el modal; apartar baja el efectivo y sube la meta; comparativa visible; patrimonio incluye efectivo.

- [ ] **Step 9: Commit**

```bash
git add src/stitch/screens/StitchDashboard.jsx
git commit -m "feat(dashboard): efectivo disponible, apartar a ahorro y comparativa"
```

---

## Task 9: Campo "Efectivo inicial" en Ajustes

**Files:**
- Modify: `src/stitch/screens/StitchSettings.jsx`

**Contexto:** Settings ya tiene `demo = isDemoActive()` ([línea 35](../../../src/stitch/screens/StitchSettings.jsx#L35)), `usePrefsStore`, `StitchCurrencyInput`-equivalente y patrón de secciones con `Stagger`. El campo solo se muestra en demo.

- [ ] **Step 1: Importar el input de moneda, el setter y selector**

Verificar imports en [StitchSettings.jsx](../../../src/stitch/screens/StitchSettings.jsx). Añadir si faltan:

```javascript
import StitchCurrencyInput from '../StitchCurrencyInput';
import { demoSetInitialCashBalance } from '../demoMode';
```

`usePrefsStore` ya está importado ([línea 10](../../../src/stitch/screens/StitchSettings.jsx#L10)).

- [ ] **Step 2: Leer el valor del store dentro del componente**

Junto a los otros hooks del componente (~línea 29):

```javascript
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
```

- [ ] **Step 3: Añadir la sección del campo (solo demo)**

Dentro del render, como un `Stagger.Item` más (al final de las secciones existentes). Usar el patrón de sección que ya use el archivo (card con título). Ejemplo coherente con el estilo:

```javascript
        {demo && (
          <Stagger.Item>
            <div className="bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.settings.initialCashLabel')}</span>
              <div className="max-w-[280px]">
                <StitchCurrencyInput
                  value={initialCashBalance === 0 ? '' : String(initialCashBalance)}
                  onChange={(v) => demoSetInitialCashBalance(v)}
                />
              </div>
              <span className="font-label-sm text-label-sm text-text-muted">{t('screens.settings.initialCashHelp')}</span>
            </div>
          </Stagger.Item>
        )}
```

> Verificar la firma de `StitchCurrencyInput` (value/onChange y si onChange entrega string numérico o el evento) abriendo el componente; ajustar el `onChange`.

- [ ] **Step 4: Verificar build + inspección**

Run: `npm run build`
Expected: build OK.
Inspección (demo → Ajustes): el campo aparece; al cambiarlo, el efectivo del Dashboard se recalcula.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/StitchSettings.jsx
git commit -m "feat(settings): campo Efectivo inicial (solo demo)"
```

---

## Task 10: Eliminar la pantalla de Reportes

**Files:**
- Modify: `src/stitch/StitchShell.jsx`
- Modify: `src/stitch/StitchApp.jsx`
- Delete: `src/stitch/screens/StitchReports.jsx`
- Delete: `src/stitch/screens/reports/` (carpeta completa)

**Contexto:** la comparativa ya está movida (Task 5). El resto de Reportes (AnalysisPanel, IncomeExpenseBars, InsightsRow, análisis, KPIs) se elimina. Las claves i18n `screens.reports.*` que aún use `MonthComparison` (`needTwoMonths`, `newLabel`) se CONSERVAN.

- [ ] **Step 1: Quitar la entrada de menú "Reportes"**

En [StitchShell.jsx:101](../../../src/stitch/StitchShell.jsx#L101), eliminar la línea:

```javascript
    { to: '/reportes', icon: 'analytics', label: t('nav.reports') },
```

- [ ] **Step 2: Quitar el import y la ruta en StitchApp**

En [StitchApp.jsx:19](../../../src/stitch/StitchApp.jsx#L19), eliminar:

```javascript
import StitchReports from './screens/StitchReports';
```

En [StitchApp.jsx:169](../../../src/stitch/StitchApp.jsx#L169), eliminar:

```javascript
          <Route path="reportes" element={<StitchReports />} />
```

- [ ] **Step 3: Borrar los archivos de Reportes**

```bash
git rm src/stitch/screens/StitchReports.jsx
git rm src/stitch/screens/reports/AnalysisPanel.jsx src/stitch/screens/reports/IncomeExpenseBars.jsx src/stitch/screens/reports/InsightsRow.jsx src/stitch/screens/reports/MonthComparison.jsx src/stitch/screens/reports/analysis.js src/stitch/screens/reports/reportsUi.jsx src/stitch/screens/reports/selectors.js
```

> Si existen `reports/selectors.test.js` u otros archivos en la carpeta, borrarlos también con `git rm`. Confirmar con `ls src/stitch/screens/reports/` que la carpeta queda vacía.

- [ ] **Step 4: Verificar que no quedan referencias colgantes**

Run: `npm run build`
Expected: build OK. Si falla por un import a `screens/reports/...` o a `StitchReports`, resolverlo (no debería quedar ninguno tras los pasos 1-3).

Buscar referencias residuales:
- Grep `StitchReports` → 0 resultados.
- Grep `screens/reports` → 0 resultados.
- Grep `/reportes` → 0 resultados.
- Grep `nav.reports` en JSX → 0 (la clave i18n puede quedar sin borrar; es inofensiva).

- [ ] **Step 5: Verificar test**

Run: `npm test`
Expected: verde. (Si había `reports/selectors.test.js`, ya no existe; los selectores movidos están cubiertos en `dashboard/selectors.test.js`.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: eliminar pantalla de Reportes (comparativa movida al dashboard)"
```

---

## Verificación final (todas las tareas completas)

- [ ] `npm run build` pasa.
- [ ] `npm test` verde (incluye los nuevos tests de `getLiquidCash`, `getLiquidDelta`, `getMonthComparison`).
- [ ] En demo: efectivo disponible visible y correcto (saldo inicial 75.000 + flujo de los datos sembrados).
- [ ] En demo: botón "Apartar a ahorro" abre el modal; apartar baja el efectivo y sube la meta elegida; toast de confirmación.
- [ ] En demo: cambiar "Efectivo inicial" en Ajustes recalcula el efectivo del Dashboard.
- [ ] En demo (usuario nuevo / fresh): efectivo inicial 0 → aparece el aviso "Declara tu efectivo actual".
- [ ] Comparativa mes-vs-mes visible en el Dashboard.
- [ ] Reportes ya NO está en el menú ni responde en `/reportes`.
- [ ] Patrimonio neto incluye el efectivo (en demo).
- [ ] Fuera de demo: el Dashboard se ve como antes (salvo la celda de comparativa, que es inofensiva).

---

## Self-Review (cobertura del spec)

- **`getLiquidCash` (efectivo derivado, neto de cashback, resta savings)** → Task 1. ✅
- **Delta del mes** → Task 2. ✅
- **`initialCashBalance` en memoria, sin persistir, sin Supabase** → Task 3 (no en partialize) + Task 4 (seed/mutador). ✅
- **Saldo inicial 75k en demo, 0 en fresh** → Task 4. ✅
- **Celda efectivo estrella + delta + botón** → Task 8 Step 4. ✅
- **Apartar a ahorro reusa demoAddContribution** → Task 7 + Task 8 Step 7. ✅
- **Advertencia (no bloqueo) al apartar de más** → Task 7 (`over` warning, botón no se bloquea por `over`). ✅
- **Patrimonio incluye efectivo** → Task 8 Step 3. ✅
- **Aviso saldo inicial 0** → Task 8 Step 5. ✅
- **Campo Efectivo inicial en Ajustes (solo demo)** → Task 9. ✅
- **Comparativa rescatada al Dashboard** → Task 5 + Task 8 Step 6. ✅
- **Eliminar Reportes (menú + ruta + archivos)** → Task 10. ✅
- **Tour no ancla a reports** (verificado en spec) → sin tarea, correcto. ✅
- **i18n es/en de todo lo visible** → Task 6. ✅
- **Solo demo / aislamiento** → `demo &&` en Tasks 8 y 9; selectores son puros (inofensivos fuera de demo). ✅
- **Sin tests de UI (no hay en el repo)** → Notas + verificación visual. ✅

**Nota de ejecución:** varias tareas piden "verificar la firma real" de componentes compartidos (`StitchCurrencyInput`, `StitchSelect`, `StitchDatePicker`, `motionTokens`, ruta de Ajustes). Es deliberado: son contratos existentes que el implementador debe leer antes de cablear, no placeholders de lógica. Cada uno tiene la acción concreta ("abrir X, ajustar el prop").
```