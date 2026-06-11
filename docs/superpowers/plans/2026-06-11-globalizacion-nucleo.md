# Globalización del Núcleo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sola moneda elegida por el usuario en todo FinTrack (fuera el par DOP/USD y la tasa), usuarios nuevos sin categorías semilla, y onboarding de moneda — para que cualquier persona de cualquier país use la app.

**Architecture:** La moneda vive en `profiles.currency` (Supabase) espejada en `usePrefsStore` (patrón híbrido existente de `budget_level`/`tutorial_seen`) y expuesta fuera de React vía un runtime (`currencyRuntime.js`, mismo patrón que `i18n/runtime.js`). `formatCurrency` se generaliza con `Intl.NumberFormat`. Se elimina `useRateStore` y toda rama `=== 'USD'`. El seed de categorías muere; la memoria por historial (ya en producción) es el motor de aprendizaje.

**Tech Stack:** React+Vite, Zustand, Supabase (migración SQL manual), Vitest, Intl API.

**Spec:** `docs/superpowers/specs/2026-06-11-globalizacion-nucleo-design.md`

**Orden crítico:** la migración SQL (Task 1) se corre en Supabase ANTES de pushear el código final. El código viejo ignora la columna nueva, así que correrla temprano es seguro.

---

## Mapa de archivos

| Archivo | Acción | Por qué |
|---|---|---|
| `supabase/globalize_single_currency.sql` | Crear | Columna currency + perfiles faltantes + conversión USD→DOP |
| `supabase/MIGRATIONS.md` | Modificar | Documentar la migración y su parámetro de tasa |
| `src/utils/currencyRuntime.js` | Crear | Moneda actual fuera de React (patrón i18n/runtime) |
| `src/utils/currencyRuntime.test.js` | Crear | Unitarias del runtime |
| `src/stores/usePrefsStore.js` | Modificar | `currency` en fetch/set + espejo al runtime |
| `src/utils/formatters.js` | Modificar | `formatCurrency`/`Compact` con Intl, default = moneda del usuario |
| `src/utils/formatters.currency.test.js` | Crear | Unitarias de formato multi-ISO |
| `src/utils/constants.js` | Modificar | Eliminar `CURRENCIES`, `DEFAULT_CURRENCY`, `USD_TO_DOP_RATE` |
| `src/stores/useRateStore.js` | **Eliminar** | Ya no hay tasa |
| `src/stores/useTransactionStore.js` | Modificar | Quitar `fetchUSDRate`/conversiones; guardar `currency: getCurrency()` |
| `src/stores/useRecurringStore.js` | Modificar | Quitar rama USD (línea ~129) |
| `src/stores/useDebtStore.js` | Modificar | Quitar `getRate` (líneas ~314, ~324) |
| `src/stitch/StitchApp.jsx` | Modificar | Quitar `fetchRate` del boot (líneas ~36, ~84) |
| `src/stitch/screens/StitchLedger.jsx` | Modificar | Sin campo Moneda ni fx en cashback |
| `src/stitch/screens/StitchDashboard.jsx` | Modificar | Sin fx en deudas (líneas ~16, 49, 87-88, 168, 177) |
| `src/stitch/screens/budget/BudgetShell.jsx` | Modificar | Sin fx (líneas ~12, 57, 83-85) |
| `src/stitch/screens/StitchSettings.jsx` | Modificar | Fuera panel de tasa y reset de categorías; entra selector de moneda |
| `src/stitch/screens/debts/DebtForm.jsx` | Modificar | Sin select de moneda (líneas 12, 25, 40, 71-72) |
| `src/stitch/screens/vaults/VaultForm.jsx` | Modificar | Sin select de moneda (3 refs DOP) |
| `src/data/transactionMemory.js` (+test) | Modificar | Contrato sin `currency` |
| `src/stores/useCategoryStore.js` | Modificar | Sin seed inicial ni re-seed de faltantes; fuera `resetCategoriesToDefault` |
| `src/stitch/screens/StitchBudget.jsx` + Ledger | Modificar | Empty states sin categorías |
| `src/stitch/screens/CurrencyOnboarding.jsx` | Crear | Paso único "elige tu moneda" |
| `src/i18n/translations.js` | Modificar | Claves nuevas (onboarding, ajuste de moneda) y retiro de las de tasa |
| `src/stitch/demoMode.js` | Modificar | Demo fija currency 'DOP' en prefs |

---

### Task 1: Migración SQL + columna `currency`

**Files:**
- Create: `supabase/globalize_single_currency.sql`
- Modify: `supabase/MIGRATIONS.md`

- [ ] **Step 1: Escribir la migración**

Crear `supabase/globalize_single_currency.sql`:

```sql
-- Globalización: una sola moneda por usuario.
-- 1) profiles.currency (ISO 4217). Default DOP = los usuarios existentes quedan
--    en su realidad actual sin tocar nada.
-- 2) Fila de perfil para quien no la tenga.
-- 3) Transacciones USD → DOP con la tasa de abajo; el monto original queda en notes.
--
-- ⚠️ EDITAR LA TASA antes de correr: usa la tasa de venta vigente del usuario
-- (la que muestra Ajustes → Tasa de cambio en la app, p. ej. 61.45).
-- Correr a mano en el SQL editor de Supabase. Irreversible (el original queda en notes).

alter table public.profiles
  add column if not exists currency text not null default 'DOP';

insert into public.profiles (user_id)
select id from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

with params as (
  select 61.45::numeric as rate   -- ⚠️ EDITAR: tasa USD→DOP vigente
)
update public.transactions t
set
  notes  = trim(coalesce(t.notes, '') || ' (US$ ' || t.amount::text || ' @ ' || p.rate::text || ')'),
  amount = round(t.amount * p.rate, 2),
  currency = 'DOP'
from params p
where t.currency = 'USD';

-- Otras tablas con currency (debts, savings_goals, budgets): los montos USD se
-- convierten igual si existen. Verificar primero cuáles hay:
--   select 'debts' t, count(*) from public.debts where currency='USD'
--   union all select 'goals', count(*) from public.savings_goals where currency='USD'
--   union all select 'budgets', count(*) from public.budgets where currency='USD';
with params as (select 61.45::numeric as rate)  -- ⚠️ misma tasa
update public.debts d
set original_amount = round(d.original_amount * p.rate, 2),
    current_balance = round(d.current_balance * p.rate, 2),
    monthly_payment = round(d.monthly_payment * p.rate, 2),
    currency = 'DOP'
from params p
where d.currency = 'USD';

with params as (select 61.45::numeric as rate)
update public.savings_goals g
set target_amount  = round(g.target_amount * p.rate, 2),
    current_amount = round(g.current_amount * p.rate, 2),
    monthly_contribution = round(coalesce(g.monthly_contribution,0) * p.rate, 2),
    currency = 'DOP'
from params p
where g.currency = 'USD';

with params as (select 61.45::numeric as rate)
update public.budgets b
set estimated_amount = round(b.estimated_amount * p.rate, 2),
    currency = 'DOP'
from params p
where b.currency = 'USD';
```

Nota para el ejecutor: ANTES de dar por buenos los nombres de columnas, verifícalos contra `supabase/schema.sql` (p. ej. si `savings_goals` se llama distinto o `monthly_contribution` no existe, ajusta el SQL a lo que diga el schema y documenta el cambio en MIGRATIONS.md).

- [ ] **Step 2: Documentar en `supabase/MIGRATIONS.md`**

Añadir al final, siguiendo el formato de las entradas existentes:

```markdown
## globalize_single_currency.sql (2026-06-11)
Globalización: añade `profiles.currency` (default DOP), crea perfiles faltantes
y convierte TODO lo guardado en USD a DOP con la tasa editada en el script
(el monto original queda anotado en notes). Correr ANTES de desplegar el código
de moneda única. Irreversible.
```

- [ ] **Step 3: Commit**

```powershell
git add supabase/globalize_single_currency.sql supabase/MIGRATIONS.md
git commit -m @'
feat(global): migración SQL — profiles.currency y conversión USD→DOP

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: `currencyRuntime` + `usePrefsStore.currency` (TDD)

**Files:**
- Create: `src/utils/currencyRuntime.js`
- Test: `src/utils/currencyRuntime.test.js`
- Modify: `src/stores/usePrefsStore.js`

- [ ] **Step 1: Test que falla**

Crear `src/utils/currencyRuntime.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrency, setRuntimeCurrency } from './currencyRuntime';

describe('currencyRuntime', () => {
  beforeEach(() => setRuntimeCurrency(null));

  it('por defecto devuelve DOP (compatibilidad con datos existentes)', () => {
    expect(getCurrency()).toBe('DOP');
  });

  it('devuelve la moneda fijada', () => {
    setRuntimeCurrency('EUR');
    expect(getCurrency()).toBe('EUR');
  });

  it('ignora valores no ISO (3 letras)', () => {
    setRuntimeCurrency('eur');
    expect(getCurrency()).toBe('EUR'); // normaliza a mayúsculas
    setRuntimeCurrency('x');
    expect(getCurrency()).toBe('DOP'); // inválido → default
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run src/utils/currencyRuntime.test.js` → módulo inexistente.

- [ ] **Step 3: Implementar**

Crear `src/utils/currencyRuntime.js` (mismo patrón que `src/i18n/runtime.js`: estado módulo-global para usar fuera de React; `usePrefsStore` lo actualiza):

```js
// Moneda del usuario fuera de React (formatters, stores). usePrefsStore la
// fija al cargar el perfil y al cambiarla en Ajustes — mismo patrón que el
// idioma en i18n/runtime.js. Default DOP: los datos históricos están en DOP.
let current = null;

export function setRuntimeCurrency(code) {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : null;
  current = c && /^[A-Z]{3}$/.test(c) ? c : null;
}

export function getCurrency() {
  return current || 'DOP';
}
```

- [ ] **Step 4: PASS** — `npx vitest run src/utils/currencyRuntime.test.js` → 3 PASS.

- [ ] **Step 5: `usePrefsStore` aprende `currency`**

En `src/stores/usePrefsStore.js`:

1. Import: `import { setRuntimeCurrency } from '../utils/currencyRuntime';`
2. Estado inicial (junto a `tutorialSeen: false`): `currency: null,` — `null` = "aún no elegida" (dispara onboarding en usuarios nuevos).
3. En `fetchPrefs`, el select pasa a `'budget_level, tutorial_seen, currency'` y al aplicar datos:

```js
        if (!error && data) {
          const next = { loading: false, prefsLoaded: true };
          if (data.budget_level && BUDGET_LEVELS.includes(data.budget_level)) next.budgetLevel = data.budget_level;
          if (typeof data.tutorial_seen === 'boolean') next.tutorialSeen = data.tutorial_seen;
          if (data.currency) { next.currency = data.currency; setRuntimeCurrency(data.currency); }
          set(next);
        } else {
```

4. Acción nueva (mismo patrón optimista que `setBudgetLevel`):

```js
      /** Fija la moneda del usuario (optimista). En demo solo caché. */
      setCurrency: async (code) => {
        const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
        if (!/^[A-Z]{3}$/.test(c)) return;
        const prev = get().currency;
        set({ currency: c });
        setRuntimeCurrency(c);
        if (isDemoActive()) return;
        const user = await getCurrentUser();
        if (!user) return;
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, currency: c, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          if (import.meta.env.DEV) console.error('Error guardando moneda:', error);
          set({ currency: prev });
          setRuntimeCurrency(prev);
        }
      },
```

5. `partialize` incluye `currency`: `partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen, currency: state.currency }),` y en `onRehydrateStorage`/tras rehidratar el runtime debe enterarse — añadir a la config de persist:

```js
      onRehydrateStorage: () => (state) => { if (state?.currency) setRuntimeCurrency(state.currency); },
```

6. En `src/stitch/demoMode.js`, dentro de `seedDemoStores()`, añadir al final:

```js
  usePrefsStore.setState({ currency: 'DOP' });
  setRuntimeCurrency('DOP');
```

con sus imports (`import usePrefsStore from '../stores/usePrefsStore';` ya existe o se añade; `import { setRuntimeCurrency } from '../utils/currencyRuntime';`). OJO: `usePrefsStore` importa `isDemoActive` de demoMode — si el import inverso crea ciclo, usa import dinámico en `seedDemoStores`: `const { default: usePrefsStore } = await import(...)` NO — `seedDemoStores` es síncrono; en su lugar mueve la asignación demo a `enterDemo` del caller o usa `import usePrefsStore` y verifica que Vite no se queje (los ciclos ESM con uso diferido funcionan; ya existe el ciclo demoMode↔stores en este repo: demoMode importa useCategoryStore y usePrefsStore importa demoMode). Verifica con `npm run build`.

- [ ] **Step 6: Suite + commit**

`npx vitest run` → verde. `npx eslint src/utils/currencyRuntime.js src/stores/usePrefsStore.js src/stitch/demoMode.js` → 0.

```powershell
git add src/utils/currencyRuntime.js src/utils/currencyRuntime.test.js src/stores/usePrefsStore.js src/stitch/demoMode.js
git commit -m @'
feat(global): moneda del usuario en perfil + runtime fuera de React

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: `formatCurrency` universal con Intl (TDD)

**Files:**
- Test: `src/utils/formatters.currency.test.js` (nuevo)
- Modify: `src/utils/formatters.js:1-40`, `src/utils/constants.js:3-11`

- [ ] **Step 1: Tests que fallan**

Crear `src/utils/formatters.currency.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { formatCurrency, formatCurrencyCompact } from './formatters';
import { setRuntimeCurrency } from './currencyRuntime';
import { setRuntimeLanguage } from '../i18n/runtime';

describe('formatCurrency global', () => {
  beforeEach(() => { setRuntimeLanguage('es'); setRuntimeCurrency(null); });

  it('sin moneda explícita usa la del usuario (runtime)', () => {
    setRuntimeCurrency('EUR');
    expect(formatCurrency(1234.5)).toMatch(/€/);
    expect(formatCurrency(1234.5)).toMatch(/1.?234[.,]50/);
  });

  it('default DOP cuando no hay moneda elegida', () => {
    expect(formatCurrency(100)).toMatch(/DOP|RD\$/);
  });

  it('negativos llevan signo', () => {
    setRuntimeCurrency('USD');
    expect(formatCurrency(-50)).toMatch(/-/);
  });

  it('código explícito sigue ganando (transición)', () => {
    setRuntimeCurrency('EUR');
    expect(formatCurrency(10, 'USD')).toMatch(/US\$|\$/);
  });

  it('compact abrevia miles y millones con símbolo', () => {
    setRuntimeCurrency('USD');
    expect(formatCurrencyCompact(1500)).toMatch(/1[.,]5\s?K/i);
    expect(formatCurrencyCompact(2_300_000)).toMatch(/2[.,]3\s?M/i);
  });

  it('moneda desconocida no explota (cae al código tal cual)', () => {
    setRuntimeCurrency('XXX');
    expect(() => formatCurrency(10)).not.toThrow();
  });
});
```

- [ ] **Step 2: FAIL** — `npx vitest run src/utils/formatters.currency.test.js` (los actuales no leen runtime).

- [ ] **Step 3: Implementar en `src/utils/formatters.js`**

Reemplazar el bloque de imports + las dos funciones (líneas 1-40) por:

```js
// FinTrack — Formatters

import { currentLocale, tr } from '../i18n/runtime';
import { getCurrency } from './currencyRuntime';

// Símbolo "estrecho" de una moneda en el locale actual (€, US$, RD$, MX$…).
// Intl resuelve cualquier ISO 4217; si el código es raro, devuelve el código.
function currencySymbol(code, locale) {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

/**
 * Format a number as currency. Sin `currencyCode` usa la moneda del usuario.
 */
export function formatCurrency(amount, currencyCode) {
  const code = currencyCode || getCurrency();
  const locale = currentLocale();
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol(code, locale)} ${formatted}`;
}

/**
 * Format a number as compact currency (e.g., RD$ 1.5K)
 */
export function formatCurrencyCompact(amount, currencyCode) {
  const code = currencyCode || getCurrency();
  const locale = currentLocale();
  const absAmount = Math.abs(amount);
  let formatted;
  if (absAmount >= 1_000_000) {
    formatted = (absAmount / 1_000_000).toFixed(1) + 'M';
  } else if (absAmount >= 1_000) {
    formatted = (absAmount / 1_000).toFixed(1) + 'K';
  } else {
    formatted = absAmount.toFixed(2);
  }
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol(code, locale)} ${formatted}`;
}
```

(Se mantiene el formato `SÍMBOLO espacio monto` que ya usa toda la UI.)

- [ ] **Step 4: Limpiar `src/utils/constants.js`**

Eliminar `CURRENCIES` (líneas 3-6), `DEFAULT_CURRENCY` (línea 8) y `USD_TO_DOP_RATE` (líneas 10-11). Luego `grep -rn "CURRENCIES\|DEFAULT_CURRENCY\|USD_TO_DOP_RATE" src/` y arreglar cada import roto (esperados: `formatters.js` ya limpio; `useRateStore.js` se borra en Task 4; cualquier otro hit se quita la referencia — verificar uno a uno).

- [ ] **Step 5: PASS + suite completa + commit**

`npx vitest run` → verde (si algún test existente asumía `RD$` fijo con otra moneda, ajustarlo conscientemente y anotarlo en el commit).

```powershell
git add src/utils/formatters.js src/utils/formatters.currency.test.js src/utils/constants.js
git commit -m @'
feat(global): formatCurrency universal vía Intl con la moneda del perfil

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: Retiro de `useRateStore` y de toda rama USD

La superficie exacta (grep verificado):

| Archivo | Líneas | Qué hay |
|---|---|---|
| `src/stores/useRateStore.js` | todo | el store de tasa |
| `src/stitch/StitchApp.jsx` | 36, 84 | import + `fetchRate` en el boot |
| `src/stores/useTransactionStore.js` | 6, 28-43, 38 | `fetchUSDRate` + helpers de tasa histórica |
| `src/stores/useRecurringStore.js` | 14, 129 | conversión al materializar recurrentes |
| `src/stores/useDebtStore.js` | 5, 314, 324 | valoración de deudas USD |
| `src/stitch/screens/StitchLedger.jsx` | 25, 60, 100, 102, 110, 116 | `fxRate` en cashback |
| `src/stitch/screens/StitchDashboard.jsx` | 16, 49, 87-88, 168, 177 | deudas USD en métricas |
| `src/stitch/screens/budget/BudgetShell.jsx` | 12, 57, 83-85 | ídem |
| `src/stitch/screens/StitchSettings.jsx` | 9, 27, 208 + el panel JSX | UI de tasa |

- [ ] **Step 1: Borrar el store y el boot**

```powershell
git rm src/stores/useRateStore.js
```

En `StitchApp.jsx`: quitar el import (línea 36) y la línea `const fetchRate = useRateStore((s) => s.fetchRate);` (84) y cualquier llamada `fetchRate()` en el efecto de arranque.

- [ ] **Step 2: Stores**

`useTransactionStore.js`: eliminar `import useRateStore` (línea 6) y TODO el bloque de tasa histórica (`fetchRateFromCdn` + `fetchUSDRate`, líneas ~15-43). Luego `grep -n "fetchUSDRate\|toDOP\|fxRate\|=== 'USD'" src/stores/useTransactionStore.js` y eliminar cada conversión: donde una transacción USD se convertía para totales/cashback, el monto se usa tal cual (`Number(t.amount)`). Las escrituras (`addTransaction`, `bulkAddTransactions`) fijan `currency: getCurrency()` (import desde `../utils/currencyRuntime`).

`useRecurringStore.js` línea 129: el bloque `const rate = useRateStore.getState().getRate();` y su uso — la transacción materializada toma el monto tal cual y `currency: getCurrency()`.

`useDebtStore.js` líneas 314/324: `const rate = useRateStore.getState().getRate();` y el término `* rate` desaparecen — el balance es el balance.

- [ ] **Step 3: Pantallas**

`StitchLedger.jsx`: quitar import (25) y `fxRate` (60); en `cashbackToFreeze` (línea ~100) y `cashbackPreview` (~110) reemplazar `const base = form.currency === 'USD' ? Number(form.amount) * fxRate : Number(form.amount);` por `const base = Number(form.amount);` y quitar `fxRate` de ambos arrays de deps.

`StitchDashboard.jsx`: quitar import (16) y `fxRate` (49); línea 87 `sum + (debt && debt.currency === 'USD' ? val * fxRate : val)` → `sum + val`; quitar `fxRate` de deps (88, 177); línea 168 `fmt(Number(d.monthlyPayment) * (d.currency === 'USD' ? fxRate : 1))` → `fmt(Number(d.monthlyPayment))`.

`BudgetShell.jsx`: ídem en líneas 12, 57, 83-85 (`return sum + val;`).

`StitchSettings.jsx`: quitar import (9) y destructuring (27); eliminar el panel completo de "Tasa de cambio" del JSX (localizarlo por `getRate().toFixed(2)` línea 208 — borrar la sección/Card que lo contiene). Las claves i18n del panel se retiran en Task 7 junto a las demás.

- [ ] **Step 4: Verificación de barrido**

```powershell
# Cero referencias vivas:
npx eslint src --rule '{}' 2>$null   # compila/parsea todo
```
Run: `Select-String -Path src -Pattern "useRateStore|fxRate|fetchUSDRate|USD_TO_DOP" -Exclude *.test.js -Recurse` (vía Grep tool) → 0 hits fuera de tests; los tests que mencionen tasas se actualizan aquí mismo (`payoff.test.js` tiene 4 refs DOP/USD — revisar si asumen conversión; si solo usan montos DOP, quedan).
`npx vitest run` → verde. `npm run build` → ✓.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m @'
feat(global): fuera la tasa USD→DOP — una sola moneda en cálculos y pantallas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: Formularios y memoria sin moneda

**Files:**
- Modify: `src/stitch/screens/StitchLedger.jsx`, `src/stitch/screens/debts/DebtForm.jsx` (líneas 12, 25, 40, 71-72), `src/stitch/screens/vaults/VaultForm.jsx`, `src/stitch/screens/StatementImportModal.jsx` (línea ~81 `currency: 'DOP'`), `src/data/transactionMemory.js`, `src/data/transactionMemory.test.js`

- [ ] **Step 1: Ledger sin campo Moneda**

En `StitchLedger.jsx`:
1. `blank`: quitar `currency: 'DOP',` (la escribe el store con `getCurrency()`).
2. Eliminar el `<Field label={t('common.currency')} …>` con su `StitchSelect` de DOP/USD (y el chip de moneda).
3. `blankSmart`/`autoSet`/`touched`: quitar la clave `currency` (quedan `{ category, card }`); quitar el bloque `if (!touched.currency && sug?.currency) …` de `onDescription`.
4. La celda de monto de la tabla: `fmt(Math.abs(Number(t.amount)), t.currency)` → `fmt(Math.abs(Number(t.amount)))` (los datos históricos ya están convertidos por la migración; el formato es siempre la moneda del usuario).

- [ ] **Step 2: DebtForm / VaultForm / Import**

`DebtForm.jsx`: en `blank` (línea 12) y en el load de edición (25) quitar `currency`; en el submit (40) quitar `currency: form.currency` (el store escribe `getCurrency()` si la columna lo pide); eliminar el `<Field>` de moneda (71-72). Igual en `VaultForm.jsx` (buscar sus 3 refs con `grep -n "currency\|USD\|DOP" src/stitch/screens/vaults/VaultForm.jsx`). En `StatementImportModal.jsx`, las dos ocurrencias `currency: 'DOP'` → `currency: getCurrency()` con su import.

- [ ] **Step 3: `transactionMemory` sin currency (TDD inverso)**

En `src/data/transactionMemory.test.js`: borrar las aserciones de `currency` (en el test de match exacto el `toEqual` queda `{ categoryId: 'super', cardId: 'cc1', source: 'exact' }`, ídem los otros `toEqual`; el test "cada campo se decide por separado" pierde su `expect(s.currency)`). El helper `tx(description, categoryId, cardId, currency, date)` mantiene la firma (las transacciones reales siguen teniendo el campo) pero nadie asevera sobre él.
En `src/data/transactionMemory.js`: quitar `currency: pickField(candidates, 'currency') ?? '',` del objeto de retorno y actualizar el comentario de contrato a `→ { categoryId, cardId, source } | null`.
`npx vitest run src/data/transactionMemory.test.js` → verde.

- [ ] **Step 4: Suite + build + commit**

```powershell
git add -A
git commit -m @'
feat(global): formularios y memoria con moneda única del perfil

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: Categorías sin semilla + empty states

**Files:**
- Modify: `src/stores/useCategoryStore.js`, `src/stitch/screens/StitchSettings.jsx`, `src/stitch/screens/StitchLedger.jsx`, `src/stitch/screens/StitchBudget.jsx`
- Test: `src/data/defaultCategories.test.js` (sigue igual: defaultCategories vive para el demo)

- [ ] **Step 1: Matar el seed**

En `useCategoryStore.fetchCategories`:
1. Eliminar el bloque "Seed default categories if user has none" (`if (!data || data.length === 0) { … }` completo, líneas ~42-82): sin datos → `set({ categories: [], loading: false }); return;`
2. Eliminar el bloque de "missing categories" (auto-insert de faltantes, líneas ~100-149): tras el dedupe, `finalCategories = cleanData` directamente.
3. El fallback de error (línea ~37 `set({ categories: defaultCategories, … })`) pasa a `set({ categories: [], loading: false })` — sin sesión válida no se inventan categorías.
4. Eliminar la acción `resetCategoriesToDefault` completa (líneas ~168-230) y su UI en `StitchSettings.jsx` (buscar `resetCategoriesToDefault` y borrar el botón/Card + claves i18n asociadas en Task 7).

- [ ] **Step 2: Empty state del Ledger**

En `StitchLedger.jsx`, dentro del Modal del form, donde está el `StitchCategorySelect`: si `categories.length === 0`, renderizar en su lugar un aviso con CTA:

```jsx
{categories.length === 0 ? (
  <div className="flex flex-col gap-xs">
    <p className="font-label-sm text-label-sm text-text-muted">{t('screens.ledger.noCategoriesYet')}</p>
    <Link to="/categorias" className="text-primary font-label-sm text-label-sm underline">{t('screens.ledger.createFirstCategory')}</Link>
  </div>
) : (
  <StitchCategorySelect … (lo existente) />
)}
```

(import `Link` de react-router-dom si no está; las claves i18n en Task 7.)

- [ ] **Step 3: Empty state de Presupuesto**

En `StitchBudget.jsx` (y los niveles que rendericen listas de categorías): si `categories.length === 0`, mostrar el patrón de vacío existente del repo (mismo estilo que "Aún no tienes transacciones" del Ledger: ícono MS + texto + CTA a `/categorias`). Verificar los 3 niveles (Seguimiento / 50-30-20 / Base cero) con el demo desactivado y una cuenta sin categorías.

- [ ] **Step 4: Tour resiliente**

Arrancar el tour en una cuenta sin categorías (no demo) y verificar que ningún paso explota si su ancla no existe (el spotlight ya tolera anclas ausentes según el diseño del tour — confirmar; si un paso depende de categorías, debe saltarse limpio).

- [ ] **Step 5: Suite + commit**

```powershell
git add -A
git commit -m @'
feat(global): usuarios nuevos sin categorías semilla + empty states

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 7: Onboarding de moneda + i18n

**Files:**
- Create: `src/stitch/screens/CurrencyOnboarding.jsx`
- Modify: `src/stitch/StitchApp.jsx` (gate), `src/i18n/translations.js`

- [ ] **Step 1: Claves i18n (es y en)**

En `translations.js`, bloque `screens` (ambos idiomas):

```js
      currencyOnboarding: {
        title: '¿En qué moneda manejas tu dinero?',           // en: 'What currency do you manage your money in?'
        subtitle: 'Todos tus montos vivirán en esta moneda. Podrás cambiarla en Ajustes (los montos no se convierten).', // en: 'All your amounts will live in this currency. You can change it in Settings (amounts are not converted).'
        searchPlaceholder: 'Buscar moneda…',                   // en: 'Search currency…'
        confirm: 'Empezar',                                    // en: 'Get started'
      },
```

y en `screens.ledger`: `noCategoriesYet: 'Aún no tienes categorías.'` / `'You have no categories yet.'`, `createFirstCategory: 'Crea tu primera categoría'` / `'Create your first category'`. En `screens.settings`: `currencyLabel: 'Moneda'` / `'Currency'`, `currencyWarning: 'Cambiarla no convierte los montos existentes.'` / `'Changing it does not convert existing amounts.'`. Retirar las claves del panel de tasa que quedaron huérfanas en Task 4 (grep de las que solo usaba esa sección).

- [ ] **Step 2: Componente**

Crear `src/stitch/screens/CurrencyOnboarding.jsx` — pantalla modal de un paso (usa `Modal` de `../formUi` o `ModalShell` según el patrón de StatementImportModal, sin botón de cerrar — es bloqueante hasta elegir):

```jsx
// Onboarding de moneda: un solo paso, bloqueante, solo para usuarios nuevos
// (perfil sin currency). El demo nunca lo ve (demoMode fija DOP).
import { useState, useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import usePrefsStore from '../../stores/usePrefsStore';
import StitchSelect from '../StitchSelect';

// Monedas ofrecidas (ISO 4217). Lista corta y curada; cualquier otra puede
// llegar después vía Ajustes si algún día se amplía.
const COMMON = ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'PEN', 'CLP', 'BRL', 'DOP', 'GTQ', 'CRC', 'UYU', 'PYG', 'BOB', 'HNL', 'NIO', 'PAB', 'CAD', 'GBP'];

// Nombre legible en el idioma actual vía Intl.DisplayNames.
function currencyLabel(code, locale) {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    return `${code} — ${name}`;
  } catch { return code; }
}

export default function CurrencyOnboarding() {
  const { t, language } = useI18n();
  const setCurrency = usePrefsStore((s) => s.setCurrency);
  const [picked, setPicked] = useState('');
  const options = useMemo(
    () => COMMON.map((c) => ({ value: c, label: currencyLabel(c, language) })),
    [language],
  );
  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur flex items-center justify-center p-md" role="dialog" aria-modal="true" aria-label={t('screens.currencyOnboarding.title')}>
      <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow shadow-2xl p-lg w-full max-w-[440px] flex flex-col gap-md">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">{t('screens.currencyOnboarding.title')}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{t('screens.currencyOnboarding.subtitle')}</p>
        <StitchSelect value={picked} onChange={setPicked} options={options} placeholder={t('screens.currencyOnboarding.searchPlaceholder')} />
        <button
          disabled={!picked}
          onClick={() => setCurrency(picked)}
          className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded disabled:opacity-40"
        >{t('screens.currencyOnboarding.confirm')}</button>
      </div>
    </div>
  );
}
```

(Ajustar clases al sistema de tokens del repo; si `StitchSelect` no busca, usar el patrón con buscador de `StitchCategorySelect` como referencia. Respetar las convenciones Stitch del handoff.)

- [ ] **Step 3: Gate en `StitchApp.jsx`**

Donde la app ya decide tutorial (`prefsLoaded`): con sesión real (no demo), `prefsLoaded && !currency` → render `<CurrencyOnboarding />` por encima del shell (mismo nivel que el tour). `currency` se lee de `usePrefsStore((s) => s.currency)`. Tras `setCurrency`, el estado se llena y el gate desaparece solo. Importante: usuarios EXISTENTES tienen fila con `currency='DOP'` por la migración → nunca lo ven.

- [ ] **Step 4: Selector en Ajustes**

En `StitchSettings.jsx`, donde estaba el panel de tasa, un Field "Moneda" con el mismo `options` de `COMMON` (extraer `COMMON`/`currencyLabel` a `src/utils/currencyOptions.js` para no duplicar — lo importan onboarding y ajustes), `value={currency}` y `onChange={setCurrency}`, con `currencyWarning` debajo.

- [ ] **Step 5: Suite + build + commit**

```powershell
git add -A
git commit -m @'
feat(global): onboarding de moneda + selector en Ajustes (es/en)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 8: Verificación integral

- [ ] **Step 1: Gates mecánicos**

`npx vitest run` → verde. `npm run build` → ✓. `npx eslint` sobre todos los archivos tocados → 0 (los 7 errores preexistentes de otros archivos no cuentan).
Greps de cierre: `useRateStore|fxRate|fetchUSDRate|USD_TO_DOP|CURRENCIES|resetCategoriesToDefault` → 0 hits en `src/`.

- [ ] **Step 2: Visual en demo (skill verify)**

Con `npm run preview -- --port 4173`: el demo entra directo (sin onboarding), todo en RD$, Ledger sin campo Moneda, cashback correcto, Ajustes con selector de moneda y sin panel de tasa, autollenado por historial intacto (categoría + tarjeta).

- [ ] **Step 3: Manual en producción (humano, post-deploy)**

1. Correr `supabase/globalize_single_currency.sql` (tasa editada) ANTES del push.
2. Push a main (deploy Vercel).
3. Cuenta del usuario: todo sigue en DOP, los ex-USD muestran su nota de conversión.
4. Cuenta nueva de prueba: onboarding pide moneda (elegir EUR) → cero categorías con CTAs → crear categoría → registrar transacción → formato €.

- [ ] **Step 4: Reporte final con evidencia (capturas) al usuario.**
