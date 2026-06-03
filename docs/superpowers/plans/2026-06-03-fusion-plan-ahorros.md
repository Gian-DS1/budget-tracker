# Fusión Plan → Ahorros · Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionar la página Plan dentro de Ahorros: añadir un campo `horizonte` opcional a las metas de ahorro, migrar los datos de `plans` a `savings`, y eliminar Plan como página/modelo (ruta, menú, store, archivo) reapuntando el Dashboard.

**Architecture:** `savings` gana una columna `horizon` (nullable, solo etiqueta). Migración SQL idempotente copia `plans → savings` (la corre el usuario a mano; `plans` queda huérfana). `useSavingsStore`/`demoMode` propagan `horizon`. `VaultForm` gana un selector de horizonte; `StitchVaults` un filtro por horizonte; `VaultItem` un chip. Plan se elimina: ruta, entrada de menú, `usePlanStore`, `StitchStrategy.jsx`, y el Dashboard lee metas próximas desde `savings`.

**Tech Stack:** Vite + React 19, Zustand 5 (persist), Supabase (RLS), Vitest, react-hot-toast, Material Symbols.

**Spec:** `docs/superpowers/specs/2026-06-03-fusion-plan-ahorros-design.md`

**Restricción:** Rama `rebuild/stitch-pure`, todo local. NO push, NO merge. La migración SQL la corre el usuario a mano en Supabase. `origin/main` (app vieja) intacto.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/add_savings_horizon.sql` | Crear | Migración a mano: columna `horizon` en `savings` + copia idempotente `plans → savings`. |
| `supabase/schema.sql` | Modificar | Columna canónica `horizon` en `savings`. |
| `src/stores/useSavingsStore.js` | Modificar | Propagar `horizon` en fetchGoals/addGoal/updateGoal/restoreGoalWithContributions. |
| `src/stitch/demoMode.js` | Modificar | `horizon` en metas demo + mutadores; eliminar siembra/import de `plans`. |
| `src/stitch/screens/vaults/VaultForm.jsx` | Modificar | Campo Horizonte (StitchSelect). |
| `src/stitch/screens/vaults/VaultItem.jsx` | Modificar | Chip de horizonte. |
| `src/stitch/screens/StitchVaults.jsx` | Modificar | Filtro por horizonte en el header. |
| `src/stitch/StitchApp.jsx` | Modificar | Quitar ruta/import/fetch de Plan. |
| `src/stitch/StitchShell.jsx` | Modificar | Quitar entrada de menú "Plan". |
| `src/stitch/screens/StitchDashboard.jsx` | Modificar | Alerta "Meta próxima" lee de `savings`, enlaza a `/ahorros`. |
| `src/stitch/screens/StitchStrategy.jsx` | Borrar | Plan deja de existir. |
| `src/stores/usePlanStore.js` | Borrar | Modelo Plan eliminado. |

**Constante compartida `HORIZON_OPTIONS`:** para no repetir las etiquetas de horizonte en tres archivos, se define una vez en `src/stitch/screens/vaults/horizons.js` y se importa donde haga falta.

---

## Task 1: Migración SQL + columna canónica

**Files:**
- Create: `supabase/add_savings_horizon.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Crear el archivo de migración**

Create `supabase/add_savings_horizon.sql`:

```sql
-- Fusión Plan→Ahorros: columna horizonte en savings + migración de plans.
-- Correr a mano en el SQL editor de Supabase. Idempotente.

-- 1. Columna horizonte (nullable: las metas normales no la necesitan).
alter table public.savings add column if not exists horizon text;  -- short | medium | long | null

-- 2. Copia cada plan del usuario a savings como meta con saldo inicial.
--    title := title (+ ' — ' + description si hay). type → horizon.
--    current_amount → saldo. monthly_contribution := 0. currency := 'DOP'.
--    Idempotente vía NOT EXISTS por (user_id, title) para no duplicar al re-correr.
insert into public.savings (user_id, title, target_amount, current_amount, deadline, icon, color, status, currency, monthly_contribution, horizon)
select
  p.user_id,
  case when p.description is not null and length(trim(p.description)) > 0
       then p.title || ' — ' || p.description else p.title end,
  p.target_amount,
  p.current_amount,
  p.deadline,
  '🎯',
  '#bec2ff',
  case when p.current_amount >= p.target_amount and p.target_amount > 0 then 'completed' else 'active' end,
  'DOP',
  0,
  p.type
from public.plans p
where not exists (
  select 1 from public.savings s
  where s.user_id = p.user_id
    and s.title = (case when p.description is not null and length(trim(p.description)) > 0
                        then p.title || ' — ' || p.description else p.title end)
);

-- La tabla public.plans NO se elimina aquí. Queda huérfana; el usuario decide
-- cuándo borrarla una vez verificada la migración.
```

- [ ] **Step 2: Añadir la columna canónica a schema.sql**

In `supabase/schema.sql`, the `savings` table currently ends (after the Ahorros work) with:
```sql
  monthly_contribution numeric not null default 0,
  created_at     timestamptz not null default now()
);
```
Insert `horizon` before `created_at`:
```sql
  monthly_contribution numeric not null default 0,
  horizon        text,                                -- short | medium | long (etiqueta, opcional)
  created_at     timestamptz not null default now()
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/add_savings_horizon.sql supabase/schema.sql
git commit -m "feat(ahorros): columna horizon + migración plans→savings"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

> **Nota:** el usuario corre `add_savings_horizon.sql` a mano. El código degrada con gracia si aún no se aplicó (`horizon` llega `undefined` → se trata como `null`).

---

## Task 2: Constante compartida de horizontes

**Files:**
- Create: `src/stitch/screens/vaults/horizons.js`

- [ ] **Step 1: Crear el módulo de constantes**

Create `src/stitch/screens/vaults/horizons.js`:

```js
// Etiquetas de horizonte temporal de una meta (etiqueta opcional, no cambia la
// lógica). Fuente única para el formulario, el filtro y el chip de la tarjeta.

// Opciones para el selector del formulario (incluye "Sin horizonte" = '').
export const HORIZON_FORM_OPTIONS = [
  { value: '', label: 'Sin horizonte' },
  { value: 'short', label: 'Corto plazo (< 1 año)' },
  { value: 'medium', label: 'Mediano plazo (1–5 años)' },
  { value: 'long', label: 'Largo plazo (5+ años)' },
];

// Opciones para el filtro de la barra (incluye "Todas" = '').
export const HORIZON_FILTER_OPTIONS = [
  { value: '', label: 'Todos los horizontes' },
  { value: 'short', label: 'Corto plazo' },
  { value: 'medium', label: 'Mediano plazo' },
  { value: 'long', label: 'Largo plazo' },
  { value: 'none', label: 'Sin horizonte' },
];

// Etiqueta corta para el chip de la tarjeta.
export const HORIZON_CHIP = { short: 'CORTO', medium: 'MEDIANO', long: 'LARGO' };
```

- [ ] **Step 2: Commit**

```bash
git add src/stitch/screens/vaults/horizons.js
git commit -m "feat(ahorros): constantes de horizonte (fuente única)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 3: Propagar `horizon` en el store

**Files:**
- Modify: `src/stores/useSavingsStore.js`

- [ ] **Step 1: fetchGoals mapea horizon**

In `src/stores/useSavingsStore.js`, in the `goals` mapping inside `fetchGoals`, the object currently ends:
```js
      status: g.status,
      currency: g.currency || 'DOP',
      createdAt: g.created_at,
    }));
```
Add `horizon`:
```js
      status: g.status,
      currency: g.currency || 'DOP',
      horizon: g.horizon || null,
      createdAt: g.created_at,
    }));
```

- [ ] **Step 2: addGoal persiste y mapea horizon**

In `addGoal`, the `dbPayload` currently has `currency: goal.currency || 'DOP',` followed by `status: ...`. Add `horizon` to the payload (after currency):
```js
      currency: goal.currency || 'DOP',
      horizon: goal.horizon || null,
      status: (Number(goal.currentAmount) || 0) >= Number(goal.targetAmount) ? 'completed' : 'active',
```
And in the `formatted` object returned (after `currency: data.currency || 'DOP',`):
```js
        currency: data.currency || 'DOP',
        horizon: data.horizon || null,
        createdAt: data.created_at,
```

- [ ] **Step 3: updateGoal persiste horizon**

In `updateGoal`, after the line `if (updates.currency !== undefined) dbUpdates.currency = updates.currency;`, add:
```js
    if (updates.horizon !== undefined) dbUpdates.horizon = updates.horizon || null;
```
(The local `set` already spreads `...updates`, so `horizon` propagates to state automatically.)

- [ ] **Step 4: restoreGoalWithContributions preserva horizon**

In `restoreGoalWithContributions`, the `dbPayload` has `currency: goal.currency || 'DOP',` then `status: ...`. Add `horizon` after currency:
```js
      currency: goal.currency || 'DOP',
      horizon: goal.horizon || null,
      status: goal.status || ((Number(goal.currentAmount) || 0) >= Number(goal.targetAmount) ? 'completed' : 'active'),
```
And in its `formatted` object (after `currency: goalData.currency || 'DOP',`):
```js
      currency: goalData.currency || 'DOP',
      horizon: goalData.horizon || null,
      createdAt: goalData.created_at,
```

- [ ] **Step 5: Verificar y commit**

Run: `npm run lint` → 0 errores.
Run: `npm run test` → 82 pasan.
```bash
git add src/stores/useSavingsStore.js
git commit -m "feat(ahorros): store propaga el campo horizon"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 4: `horizon` en demo + eliminar siembra de plans

**Files:**
- Modify: `src/stitch/demoMode.js`

- [ ] **Step 1: Eliminar el import de usePlanStore**

In `src/stitch/demoMode.js`, remove the line:
```js
import usePlanStore from '../stores/usePlanStore';
```

- [ ] **Step 2: Eliminar el array `plans` de los datos demo**

Remove the entire `const plans = [ ... ];` block (the one with p1/p2 plan objects).

- [ ] **Step 3: Añadir horizon a las metas demo**

Replace the `goals` seed array with (adds `horizon` to each):
```js
const goals = [
  { id: 'g1', title: 'Fondo de emergencia', targetAmount: 180000, currentAmount: 105000, monthlyContribution: 15000, deadline: iso(new Date(yearIdx + 1, 2, 1)), icon: '🆘', color: '#bec2ff', status: 'active', currency: 'DOP', horizon: null, createdAt: '' },
  { id: 'g2', title: 'Viaje a Europa', targetAmount: 250000, currentAmount: 60000, monthlyContribution: 20000, deadline: iso(new Date(yearIdx + 1, 7, 1)), icon: '✈️', color: '#50d8e9', status: 'active', currency: 'DOP', horizon: 'medium', createdAt: '' },
  { id: 'g3', title: 'Laptop nueva', targetAmount: 90000, currentAmount: 90000, monthlyContribution: 0, deadline: null, icon: '💻', color: '#bdd200', status: 'completed', currency: 'DOP', horizon: 'short', createdAt: '' },
  { id: 'g4', title: 'Comprar apartamento', targetAmount: 2000000, currentAmount: 350000, monthlyContribution: 25000, deadline: iso(new Date(yearIdx + 4, 0, 1)), icon: '🏠', color: '#bec2ff', status: 'active', currency: 'DOP', horizon: 'long', createdAt: '' },
];
```
(g4 added — a migrated-plan-style long-horizon goal so the filter has all three horizons + a null.)

- [ ] **Step 4: Eliminar la siembra de plans en seedDemoStores**

In `seedDemoStores`, remove the line:
```js
  usePlanStore.setState({ plans, loading: false });
```

- [ ] **Step 5: demoAddGoal / demoUpdateGoal / demoRestoreGoal propagan horizon**

In `demoAddGoal`, the `row` object has `currency: goal.currency || 'DOP',`. Add after it:
```js
    currency: goal.currency || 'DOP', horizon: goal.horizon || null,
```
In `demoUpdateGoal`, the spread `const next = { ...g, ...updates };` already carries `horizon` from `updates` — no change needed there.
In `demoRestoreGoal`, the goal object is pushed as-is (`[...s.goals, goal]`), so `horizon` is preserved — no change needed.

- [ ] **Step 6: Verificar y commit**

Run: `npm run lint` → 0 errores (confirm no remaining reference to `usePlanStore` or `plans` var in demoMode.js).
Run: `npm run test` → 82 pasan.
```bash
git add src/stitch/demoMode.js
git commit -m "feat(ahorros): horizon en metas demo + elimina siembra de plans"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 5: Campo Horizonte en VaultForm

**Files:**
- Modify: `src/stitch/screens/vaults/VaultForm.jsx`

- [ ] **Step 1: Importar las opciones de horizonte**

In `src/stitch/screens/vaults/VaultForm.jsx`, after the existing `import { Modal, Field, FormActions, inputCls } from './vaultsUi';` line, add:
```js
import { HORIZON_FORM_OPTIONS } from './horizons';
```

- [ ] **Step 2: Añadir horizon al estado del formulario**

Change the `blank` constant to include `horizon: ''`:
```js
const blank = { title: '', targetAmount: '', currentAmount: '', monthlyContribution: '', deadline: '', icon: '🎯', color: '#bec2ff', currency: 'DOP', horizon: '' };
```
And in the `editing` initializer object, after `currency: editing.currency || 'DOP',`, add:
```js
        currency: editing.currency || 'DOP', horizon: editing.horizon || '',
```

- [ ] **Step 3: Enviar horizon en data**

In `submit`, the `data` object currently is:
```js
    const data = {
      title: form.title.trim(), targetAmount: Number(form.targetAmount),
      monthlyContribution: Number(form.monthlyContribution) || 0,
      deadline: form.deadline || null, icon: form.icon, color: form.color, currency: form.currency,
    };
```
Add `horizon` (empty string → null):
```js
    const data = {
      title: form.title.trim(), targetAmount: Number(form.targetAmount),
      monthlyContribution: Number(form.monthlyContribution) || 0,
      deadline: form.deadline || null, icon: form.icon, color: form.color, currency: form.currency,
      horizon: form.horizon || null,
    };
```

- [ ] **Step 4: Render del selector de horizonte**

The form currently has a 2-col grid with "Fecha límite" + "Moneda". Replace that grid block:
```jsx
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha límite"><StitchDatePicker value={form.deadline} onChange={(v) => set({ deadline: v })} /></Field>
          <Field label="Moneda">
            <StitchSelect value={form.currency} onChange={(v) => set({ currency: v })} options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]} />
          </Field>
        </div>
```
with a 2-col grid (Fecha + Moneda) followed by a full-width Horizonte field:
```jsx
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha límite"><StitchDatePicker value={form.deadline} onChange={(v) => set({ deadline: v })} /></Field>
          <Field label="Moneda">
            <StitchSelect value={form.currency} onChange={(v) => set({ currency: v })} options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]} />
          </Field>
        </div>
        <Field label="Horizonte" hint="Opcional, para agrupar tus metas">
          <StitchSelect value={form.horizon} onChange={(v) => set({ horizon: v })} options={HORIZON_FORM_OPTIONS} placeholder="Sin horizonte" />
        </Field>
```

- [ ] **Step 5: Verificar y commit**

Run: `npm run lint` → 0 errores.
Run: `npm run build` → limpio.
```bash
git add src/stitch/screens/vaults/VaultForm.jsx
git commit -m "feat(ahorros): selector de horizonte en el formulario de meta"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 6: Chip de horizonte en VaultItem

**Files:**
- Modify: `src/stitch/screens/vaults/VaultItem.jsx`

- [ ] **Step 1: Importar la etiqueta del chip**

In `src/stitch/screens/vaults/VaultItem.jsx`, after the existing `import { getProjection } from './projection';` line, add:
```js
import { HORIZON_CHIP } from './horizons';
```

- [ ] **Step 2: Render del chip junto al badge USD**

The header row currently is:
```jsx
      <div className="flex items-center gap-sm">
        <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle shrink-0"><Emoji e={goal.icon || '🎯'} size={18} /></div>
        <span className="font-label-sm text-label-sm uppercase text-on-surface truncate min-w-0">{goal.title}</span>
        {goal.currency === 'USD' && <span className="font-mono-data text-[8px] text-secondary border border-secondary/40 rounded px-1 shrink-0">USD</span>}
      </div>
```
Add the horizon chip after the USD badge (only when `goal.horizon` exists and is known):
```jsx
      <div className="flex items-center gap-sm">
        <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle shrink-0"><Emoji e={goal.icon || '🎯'} size={18} /></div>
        <span className="font-label-sm text-label-sm uppercase text-on-surface truncate min-w-0">{goal.title}</span>
        {goal.currency === 'USD' && <span className="font-mono-data text-[8px] text-secondary border border-secondary/40 rounded px-1 shrink-0">USD</span>}
        {HORIZON_CHIP[goal.horizon] && <span className="font-mono-data text-[8px] text-text-muted border border-border-subtle rounded px-1 shrink-0">{HORIZON_CHIP[goal.horizon]}</span>}
      </div>
```

- [ ] **Step 3: Verificar y commit**

Run: `npm run lint` → 0 errores.
Run: `npm run build` → limpio.
```bash
git add src/stitch/screens/vaults/VaultItem.jsx
git commit -m "feat(ahorros): chip de horizonte en la tarjeta de meta"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 7: Filtro por horizonte en StitchVaults

**Files:**
- Modify: `src/stitch/screens/StitchVaults.jsx`

- [ ] **Step 1: Importar StitchSelect y las opciones de filtro**

In `src/stitch/screens/StitchVaults.jsx`, after the existing `import { Stagger } from '../StitchMotion';` line, add:
```js
import StitchSelect from '../StitchSelect';
import { HORIZON_FILTER_OPTIONS } from './vaults/horizons';
```

- [ ] **Step 2: Estado del filtro**

After the existing `const [historyGoal, setHistoryGoal] = useState(null);`, add:
```js
  const [horizonFilter, setHorizonFilter] = useState('');
```

- [ ] **Step 3: Lista filtrada**

After `const total = getTotalSaved();`, add a derived filtered list. The filter value `'none'` matches goals with no horizon; `''` shows all; a horizon value matches exactly:
```js
  const visibleGoals = goals.filter((g) => {
    if (!horizonFilter) return true;
    if (horizonFilter === 'none') return !g.horizon;
    return g.horizon === horizonFilter;
  });
```

- [ ] **Step 4: Render del filtro en el header (solo si hay metas)**

The header currently has the "Nueva meta" button. Add a compact horizon filter next to it. The header's right-side button block is:
```jsx
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start">
          <MS name="add" className="text-[16px]" /> Nueva meta
        </button>
```
Wrap it with the filter (filter shown only when there are goals, so an empty account isn't cluttered):
```jsx
        <div className="flex items-center gap-sm self-start">
          {goals.length > 0 && (
            <div className="w-[180px]">
              <StitchSelect value={horizonFilter} onChange={setHorizonFilter} options={HORIZON_FILTER_OPTIONS} compact />
            </div>
          )}
          <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs">
            <MS name="add" className="text-[16px]" /> Nueva meta
          </button>
        </div>
```

- [ ] **Step 5: El grid usa visibleGoals**

The grid currently maps `goals.map((g) => ...)`. Change it to `visibleGoals.map((g) => ...)`. The empty-state guard stays on `goals.length === 0` (so the "Sin metas todavía" empty state only shows when there are truly no goals, not when the filter excludes all). But add a secondary empty hint when the filter hides everything: after the `<Stagger>...</Stagger>` block, inside the `else` branch, the structure is `goals.length === 0 ? (emptyState) : (<Stagger>...)`. Change the Stagger branch so that if `visibleGoals` is empty it shows a small "sin metas para este horizonte" message instead of an empty grid:
```jsx
      ) : visibleGoals.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[40px] flex flex-col items-center gap-sm text-center">
          <MS name="filter_alt_off" className="text-[28px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Ninguna meta en este horizonte.</p>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {visibleGoals.map((g) => (
            <VaultItem key={g.id} goal={g} onContribute={setContribGoal} onHistory={setHistoryGoal} onEdit={openEdit} onDelete={onDelete} />
          ))}
        </Stagger>
      )}
```

- [ ] **Step 6: Verificar y commit**

Run: `npm run lint` → 0 errores.
Run: `npm run build` → limpio.
Run: `npm run test` → 82 pasan.
```bash
git add src/stitch/screens/StitchVaults.jsx
git commit -m "feat(ahorros): filtro por horizonte en el grid de metas"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 8: Dashboard lee metas próximas desde savings

**Files:**
- Modify: `src/stitch/screens/StitchDashboard.jsx`

- [ ] **Step 1: Reemplazar la suscripción a plans por goals**

In `src/stitch/screens/StitchDashboard.jsx`, the line:
```js
  const plans = usePlanStore((s) => s.plans);
```
becomes:
```js
  const goals = useSavingsStore((s) => s.goals);
```
(Confirm `useSavingsStore` is already imported at the top — it is used elsewhere in the dashboard. If NOT imported, add `import useSavingsStore from '../../stores/useSavingsStore';` near the other store imports.)

- [ ] **Step 2: La alerta "Meta próxima" usa goals**

The reminders `useMemo` currently has this block for plans:
```js
    plans.filter((p) => p.status !== 'completed' && p.deadline).forEach((p) => {
      const due = new Date(p.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: 'Meta próxima', tc: 'text-secondary', t: `EN ${days}D`, body: `"${p.title}" vence ${formatDate(p.deadline)}.`, cta: 'VER', to: '/plan' });
    });
```
Replace it with the savings goals equivalent (enlaza a `/ahorros`):
```js
    goals.filter((g) => g.status !== 'completed' && g.deadline).forEach((g) => {
      const due = new Date(g.deadline + 'T00:00:00');
      const days = Math.ceil((due - todayMid) / 86400000);
      if (days < 0 || days > 30) return;
      out.push({ tag: 'Meta próxima', tc: 'text-secondary', t: `EN ${days}D`, body: `"${g.title}" vence ${formatDate(g.deadline)}.`, cta: 'VER', to: '/ahorros' });
    });
```

- [ ] **Step 3: Actualizar la dependencia del useMemo**

The `useMemo` dependency array ends `}, [cards, debts, plans, transactions, fxRate, y, m, now]);`. Replace `plans` with `goals`:
```js
  }, [cards, debts, goals, transactions, fxRate, y, m, now]);
```

- [ ] **Step 4: Quitar el import de usePlanStore**

Remove the line `import usePlanStore from '../../stores/usePlanStore';` from the dashboard.

- [ ] **Step 5: Verificar y commit**

Run: `npm run lint` → 0 errores (no debe quedar referencia a `plans`/`usePlanStore` en el dashboard).
Run: `npm run build` → limpio.
```bash
git add src/stitch/screens/StitchDashboard.jsx
git commit -m "feat(dashboard): alerta de meta próxima lee de savings (enlaza a /ahorros)"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 9: Eliminar Plan (ruta, menú, store, archivo)

**Files:**
- Modify: `src/stitch/StitchApp.jsx`
- Modify: `src/stitch/StitchShell.jsx`
- Delete: `src/stitch/screens/StitchStrategy.jsx`
- Delete: `src/stores/usePlanStore.js`

- [ ] **Step 1: StitchApp — quitar import, ruta, fetch**

In `src/stitch/StitchApp.jsx`:
- Remove `import StitchStrategy from './screens/StitchStrategy';`
- Remove `import usePlanStore from '../stores/usePlanStore';`
- Remove `const fetchPlans = usePlanStore((s) => s.fetchPlans);`
- Remove the `fetchPlans();` call inside the data-load `useEffect`.
- Remove `fetchPlans` from that `useEffect`'s dependency array (the array currently ends `..., fetchDebtsAndPayments, fetchPlans, fetchCards, fetchPrefs]);` → becomes `..., fetchDebtsAndPayments, fetchCards, fetchPrefs]);`).
- Remove the route line `<Route path="plan" element={<StitchStrategy />} />`.

- [ ] **Step 2: StitchShell — quitar la entrada de menú**

In `src/stitch/StitchShell.jsx`, remove the nav item:
```js
  { to: '/plan', icon: 'flag', label: 'Plan' },
```

- [ ] **Step 3: Borrar los archivos de Plan**

```bash
git rm src/stitch/screens/StitchStrategy.jsx src/stores/usePlanStore.js
```

- [ ] **Step 4: Verificar y commit**

Run: `npm run lint` → 0 errores (no debe quedar ninguna referencia a StitchStrategy / usePlanStore en todo `src`; si el lint o el build se quejan de un import colgante, encuéntralo y quítalo).
Run: `npm run build` → limpio (confirma que ningún import roto quedó).
Run: `npm run test` → 82 pasan.
```bash
git add src/stitch/StitchApp.jsx src/stitch/StitchShell.jsx
git commit -m "feat(plan): elimina Plan (ruta, menú, store, página) — fusionado en Ahorros"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 10: Verificación de carga + handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Verificación de carga (dev server)**

Confirmar build/lint/test verdes y que la app sirve sin Plan:
- `npm run build` (limpio), `npm run lint` (0), `npm run test` (82).
- Levantar `npm run dev`; `GET http://localhost:5173/` → 200; `GET /src/stitch/screens/StitchVaults.jsx` (transform de Vite) → 200; `GET /src/stitch/screens/vaults/horizons.js` → 200.
- Grep de confirmación: no quedan referencias a `usePlanStore`, `StitchStrategy`, ni `/plan` en `src/` (salvo, si acaso, comentarios). El menú lateral ya no incluye "Plan".

Anota cualquier hallazgo. Si algo falla, corrígelo (commit propio) antes de seguir.

- [ ] **Step 2: Actualizar handoff.md**

In `handoff.md`:
- En el bloque de UI activa / páginas: quitar Plan (`StitchStrategy.jsx`) de PENDIENTES; anotar que Plan se fusionó en Ahorros (la página, la ruta `/plan`, el store `usePlanStore` y `StitchStrategy.jsx` fueron eliminados; las metas ahora llevan un campo `horizon` opcional).
- Actualizar el conteo de deps/archivos si aplica.
- En "Siguiente paso lógico": reemplazar Plan por la siguiente página de solo lectura/menos CRUD — **Dashboard (`StitchDashboard`)** (o la que prefiera el usuario), conservando el resto del orden (Reportes, Calendario, Ajustes, Feedback).
- Anotar la nueva columna `horizon` en `savings` y la migración `supabase/add_savings_horizon.sql` (correr a mano; `plans` queda huérfana, no se borra).
- Actualizar el HEAD esperado.

- [ ] **Step 3: Commit del handoff**

```bash
git add handoff.md
git commit -m "docs(handoff): Plan fusionado en Ahorros; siguiente=Dashboard"
```
End with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** columna `horizon` + migración (T1), constantes (T2), store propaga horizon (T3), demo + quitar plans (T4), selector en form (T5), chip (T6), filtro (T7), Dashboard reapuntado (T8), eliminación de Plan (T9), verificación + handoff (T10). Todas las decisiones del spec tienen tarea.
- **Sin placeholders:** todos los pasos de código muestran el código completo y los anchors exactos verificados contra el código vivo.
- **Consistencia de tipos/nombres:** `horizon` (no `horizonte`) como nombre de propiedad en store/demo/form/item/filtro; valores `short|medium|long|null`; `HORIZON_FORM_OPTIONS`/`HORIZON_FILTER_OPTIONS`/`HORIZON_CHIP` desde `vaults/horizons.js`. El filtro usa `'none'` para metas sin horizonte (distinto de `''` = todas). `goals` reemplaza `plans` en el Dashboard con la misma forma de objeto (title/deadline/status).
- **Identidad visual:** `StitchSelect` (nunca nativo), chip discreto 8px con tokens del tema, `compact` en la barra de filtro — todo coherente con el resto de la app.
- **Riesgo de import colgante:** T9 incluye build+lint como red de seguridad para detectar cualquier referencia residual a Plan.
