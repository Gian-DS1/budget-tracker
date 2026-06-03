# Ahorros (Vaults) pulido · Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulir la página de Ahorros aplicando las 14 pautas Stitch y el patrón espejo de `screens/debts/`: tabla de aportes (`savings_contributions`) con transacción enlazada, proyección de meta, historial con Deshacer, demo branching, e inputs Stitch.

**Architecture:** Shell delgado `StitchVaults.jsx` + carpeta `screens/vaults/` (Ui local + helper puro `projection.js` + `VaultItem` + `VaultForm` + `ContributionModal` + `HistoryModal`). Capa de datos: migración SQL idempotente, `useSavingsStore` extendido con `contributions` + transacción enlazada, mutadores demo nuevos. Se respeta la identidad Stitch (tokens del tema, formato y colores) sin desviarse del resto de la app.

**Tech Stack:** Vite + React 19, Zustand 5 (persist), Supabase (RLS), Vitest, react-hot-toast, Material Symbols, JoyPixels (emoji-toolkit), Framer Motion.

**Spec:** `docs/superpowers/specs/2026-06-02-ahorros-stitch-design.md`

**Restricción:** Rama `rebuild/stitch-pure`, todo local. NO push, NO merge. La migración SQL la corre el usuario a mano en Supabase.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/add_savings_contributions.sql` | Crear | Migración a mano: columnas `currency`/`monthly_contribution` en `savings` + tabla `savings_contributions` + índices + RLS. |
| `supabase/schema.sql` | Modificar | SQL canónico de la nueva tabla/columnas + tabla en lista RLS + índices. |
| `src/stores/useSavingsStore.js` | Modificar | `contributions` en estado; persistir `currency`/`monthlyContribution`; `addContribution` con tx enlazada; `deleteContribution`/`restoreContribution`; `savingsCategoryId`. |
| `src/stitch/demoMode.js` | Modificar | `contributions: []` al sembrar; mutadores `demoAddGoal`/`demoUpdateGoal`/`demoDeleteGoal`/`demoRestoreGoal`/`demoAddContribution`/`demoDeleteContribution`; `demoSavingsCategoryId`. |
| `src/stitch/screens/vaults/vaultsUi.jsx` | Crear | `Modal`/`Field`/`FormActions`/`inputCls` locales (copia de `debtsUi.jsx`). |
| `src/stitch/screens/vaults/projection.js` | Crear | Helper puro `getProjection(goal)`. |
| `src/stitch/screens/vaults/projection.test.js` | Crear | Tests del helper. |
| `src/stitch/screens/vaults/VaultItem.jsx` | Crear | Tarjeta del grid. |
| `src/stitch/screens/vaults/VaultForm.jsx` | Crear | Modal crear/editar meta. |
| `src/stitch/screens/vaults/ContributionModal.jsx` | Crear | Modal de aporte. |
| `src/stitch/screens/vaults/HistoryModal.jsx` | Crear | Historial de aportes con Deshacer. |
| `src/stitch/screens/StitchVaults.jsx` | Reescribir | Shell delgado. |

---

## Task 1: Migración SQL (a mano) + schema canónico

**Files:**
- Create: `supabase/add_savings_contributions.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Escribir el archivo de migración a mano**

Create `supabase/add_savings_contributions.sql`:

```sql
-- Ahorros: aportes individuales + moneda + aporte mensual por meta.
-- Correr a mano en el SQL editor de Supabase. Idempotente. RLS consistente.

-- Columnas nuevas en savings.
alter table public.savings add column if not exists currency text not null default 'DOP';
alter table public.savings add column if not exists monthly_contribution numeric not null default 0;

-- Tabla de aportes (espejo de debt_payments): enlaza la transacción autogenerada
-- para poder revertirla exactamente al eliminar el aporte.
create table if not exists public.savings_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_id         uuid not null references public.savings(id) on delete cascade,
  amount          numeric not null,
  date            date not null,
  notes           text,
  transaction_id  uuid references public.transactions(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists savings_contributions_user_id_idx        on public.savings_contributions (user_id);
create index if not exists savings_contributions_goal_id_idx        on public.savings_contributions (goal_id);
create index if not exists savings_contributions_transaction_id_idx on public.savings_contributions (transaction_id);

alter table public.savings_contributions enable row level security;

drop policy if exists savings_contributions_own on public.savings_contributions;
create policy savings_contributions_own on public.savings_contributions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.savings_contributions from anon;
grant select, insert, update, delete on public.savings_contributions to authenticated, service_role;
```

- [ ] **Step 2: Reflejar columnas nuevas en `savings` (schema canónico)**

In `supabase/schema.sql`, the `savings` table (líneas ~80-91) gains two columns. Replace the `status` line block so the table ends like this:

```sql
  status         text not null default 'active',     -- active | paused | completed
  currency       text not null default 'DOP',
  monthly_contribution numeric not null default 0,
  created_at     timestamptz not null default now()
);
```

- [ ] **Step 3: Añadir la tabla canónica `savings_contributions` a schema.sql**

In `supabase/schema.sql`, justo después del bloque de `debt_payments` (la sección "Pagos de deudas", tras su `alter table ... add column if not exists transaction_id`), insertar:

```sql
-- ── Aportes de ahorro (espejo de debt_payments) ─────────────────────────────
create table if not exists public.savings_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_id         uuid not null references public.savings(id) on delete cascade,
  amount          numeric not null,
  date            date not null,
  notes           text,
  transaction_id  uuid references public.transactions(id) on delete set null,
  created_at      timestamptz not null default now()
);
```

- [ ] **Step 4: Añadir índices al bloque de índices de schema.sql**

In `supabase/schema.sql`, junto a los índices de `debt_payments` (líneas ~171-173), añadir:

```sql
create index if not exists savings_contributions_user_id_idx        on public.savings_contributions (user_id);
create index if not exists savings_contributions_goal_id_idx        on public.savings_contributions (goal_id);
create index if not exists savings_contributions_transaction_id_idx on public.savings_contributions (transaction_id);
```

- [ ] **Step 5: Añadir la tabla al array de RLS de schema.sql**

In `supabase/schema.sql`, el array `tables text[]` (líneas ~188-191), añadir `'savings_contributions'`:

```sql
  tables text[] := array[
    'categories', 'credit_cards', 'transactions', 'budgets', 'savings',
    'savings_contributions',
    'debts', 'debt_payments', 'plans', 'recurring_transactions'
  ];
```

- [ ] **Step 6: Commit**

```bash
git add supabase/add_savings_contributions.sql supabase/schema.sql
git commit -m "feat(ahorros): migración savings_contributions + currency + monthly_contribution"
```

> **Nota:** el usuario corre `add_savings_contributions.sql` a mano en Supabase. El código nuevo degrada con gracia si la migración aún no se aplicó (un `select` que falla deja `contributions: []`).

---

## Task 2: Helper puro `projection.js` + tests (TDD)

**Files:**
- Create: `src/stitch/screens/vaults/projection.js`
- Test: `src/stitch/screens/vaults/projection.test.js`

- [ ] **Step 1: Escribir el test que falla**

Create `src/stitch/screens/vaults/projection.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getProjection } from './projection';

describe('getProjection', () => {
  it('con aporte mensual proyecta meses, fecha y restante', () => {
    const r = getProjection({ currentAmount: 60000, targetAmount: 100000, monthlyContribution: 10000 });
    expect(r.done).toBe(false);
    expect(r.reachable).toBe(true);
    expect(r.months).toBe(4); // (100000-60000)/10000
    expect(r.remaining).toBe(40000);
    expect(r.projectedDate).toBeInstanceOf(Date);
    expect(r.pct).toBeCloseTo(60);
  });

  it('meta completada → done=true, remaining 0, sin proyección de meses', () => {
    const r = getProjection({ currentAmount: 90000, targetAmount: 90000, monthlyContribution: 5000 });
    expect(r.done).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.months).toBe(0);
    expect(r.pct).toBe(100);
  });

  it('saldo por encima de la meta → done, pct tope 100, remaining 0', () => {
    const r = getProjection({ currentAmount: 120000, targetAmount: 100000, monthlyContribution: 5000 });
    expect(r.done).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.pct).toBe(100);
  });

  it('aporte mensual 0 → no reachable, sin fecha', () => {
    const r = getProjection({ currentAmount: 10000, targetAmount: 50000, monthlyContribution: 0 });
    expect(r.reachable).toBe(false);
    expect(r.projectedDate).toBeNull();
    expect(r.done).toBe(false);
    expect(r.remaining).toBe(40000);
  });

  it('meta 0 → pct 0 sin dividir por cero', () => {
    const r = getProjection({ currentAmount: 0, targetAmount: 0, monthlyContribution: 1000 });
    expect(r.pct).toBe(0);
    expect(r.done).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verque falla**

Run: `npm run test -- projection`
Expected: FAIL con "Failed to resolve import './projection'" o "getProjection is not a function".

- [ ] **Step 3: Implementar el helper**

Create `src/stitch/screens/vaults/projection.js`:

```js
// Proyección de una meta de ahorro, derivada del saldo, la meta y el aporte
// mensual. Envuelve monthsToGoal/projectedCompletionDate. Función pura, testeable.
//
// Devuelve { reachable, done, months, remaining, projectedDate, pct }.
//   - reachable=false cuando monthlyContribution<=0 (sin proyección de fecha).
//   - done=true cuando currentAmount>=targetAmount (con targetAmount>0).
//   - months=0 cuando ya está completada.

import { monthsToGoal, projectedCompletionDate } from '../../../utils/calculations';

export function getProjection(goal) {
  const current = Number(goal.currentAmount) || 0;
  const target = Number(goal.targetAmount) || 0;
  const monthly = Number(goal.monthlyContribution) || 0;

  const remaining = Math.max(0, target - current);
  const done = target > 0 && current >= target;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  if (done) {
    return { reachable: true, done: true, months: 0, remaining: 0, projectedDate: null, pct };
  }
  if (monthly <= 0) {
    return { reachable: false, done: false, months: null, remaining, projectedDate: null, pct };
  }

  const months = monthsToGoal(current, target, monthly);
  const projectedDate = projectedCompletionDate(current, target, monthly);
  return { reachable: true, done: false, months, remaining, projectedDate, pct };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- projection`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/vaults/projection.js src/stitch/screens/vaults/projection.test.js
git commit -m "feat(ahorros): helper de proyección de meta + tests"
```

---

## Task 3: Store — `contributions`, `currency`, `monthlyContribution`, tx enlazada

**Files:**
- Modify: `src/stores/useSavingsStore.js`

- [ ] **Step 1: Importar dependencias y resolver categoría de ahorro**

In `src/stores/useSavingsStore.js`, reemplazar las importaciones del tope (líneas 1-4) por:

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useCategoryStore from './useCategoryStore';
import useTransactionStore from './useTransactionStore';

// Resuelve una categoría de tipo ahorro para enlazar la transacción del aporte.
// Cae a '' si la cuenta no tiene una categoría savings (la tx sigue type:savings).
function savingsCategoryId() {
  const cats = useCategoryStore.getState().categories;
  const c = cats.find((x) => x.slug === 'ahorro') || cats.find((x) => x.type === 'savings');
  return c?.id || '';
}
```

- [ ] **Step 2: Añadir `contributions` al estado y cargar todo en `fetchGoals`**

In `src/stores/useSavingsStore.js`, reemplazar el bloque de estado + `fetchGoals` (líneas 9-37) por:

```js
  goals: [],
  contributions: [],
  loading: false,

  fetchGoals: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return set({ goals: [], contributions: [], loading: false });

    const [goalsRes, contribRes] = await Promise.all([
      supabase.from('savings').select('*').eq('user_id', user.id),
      supabase.from('savings_contributions').select('*').eq('user_id', user.id),
    ]);

    if (goalsRes.error) {
      console.error('Error fetching savings goals:', goalsRes.error);
      toast.error('No se pudieron cargar las metas de ahorro');
      return set({ loading: false });
    }

    const goals = goalsRes.data.map((g) => ({
      id: g.id,
      title: g.title,
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      monthlyContribution: Number(g.monthly_contribution) || 0,
      deadline: g.deadline,
      icon: g.icon,
      color: g.color,
      status: g.status,
      currency: g.currency || 'DOP',
      createdAt: g.created_at,
    }));

    // savings_contributions puede no existir aún (migración a mano). Degrada a [].
    const contributions = (!contribRes.error && contribRes.data)
      ? contribRes.data.map((c) => ({
          id: c.id,
          goalId: c.goal_id,
          amount: Number(c.amount),
          date: c.date,
          notes: c.notes,
          transactionId: c.transaction_id || null,
          createdAt: c.created_at,
        }))
      : [];

    set({ goals, contributions, loading: false });
  },
```

- [ ] **Step 3: Persistir `currency`/`monthlyContribution` en `addGoal`**

In `src/stores/useSavingsStore.js`, reemplazar `addGoal` (el bloque actual líneas ~39-72) por:

```js
  addGoal: async (goal) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const dbPayload = {
      user_id: user.id,
      title: goal.title,
      target_amount: Number(goal.targetAmount),
      current_amount: Number(goal.currentAmount) || 0,
      monthly_contribution: Number(goal.monthlyContribution) || 0,
      deadline: goal.deadline || null,
      icon: goal.icon || null,
      color: goal.color || null,
      currency: goal.currency || 'DOP',
      status: (Number(goal.currentAmount) || 0) >= Number(goal.targetAmount) ? 'completed' : 'active',
    };

    const { data, error } = await supabase.from('savings').insert(dbPayload).select().single();
    if (!error && data) {
      const formatted = {
        id: data.id,
        title: data.title,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        monthlyContribution: Number(data.monthly_contribution) || 0,
        deadline: data.deadline,
        icon: data.icon,
        color: data.color,
        status: data.status,
        currency: data.currency || 'DOP',
        createdAt: data.created_at,
      };
      set((state) => ({ goals: [...state.goals, formatted] }));
    } else {
      console.error('Error adding saving goal', error);
    }
  },
```

- [ ] **Step 4: Persistir `currency`/`monthlyContribution` en `updateGoal`**

In `src/stores/useSavingsStore.js`, reemplazar `updateGoal` (líneas ~74-96) por:

```js
  // updateGoal acepta currentAmount a nivel de función (lo usan
  // addContribution/deleteContribution para mover el saldo). El formulario de
  // edición NO lo envía; el saldo solo cambia vía aportes.
  updateGoal: async (id, updates) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const newCurrent = updates.currentAmount !== undefined ? Number(updates.currentAmount) : goal.currentAmount;
    const newTarget = updates.targetAmount !== undefined ? Number(updates.targetAmount) : goal.targetAmount;
    const newStatus = (newCurrent >= newTarget && newTarget > 0) ? 'completed' : (updates.status || goal.status);

    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = newTarget;
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = newCurrent;
    if (updates.monthlyContribution !== undefined) dbUpdates.monthly_contribution = Number(updates.monthlyContribution) || 0;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    dbUpdates.status = newStatus;

    const { error } = await supabase.from('savings').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates, currentAmount: newCurrent, targetAmount: newTarget, status: newStatus } : g)),
      }));
    }
  },
```

- [ ] **Step 5: `addContribution` con tx enlazada (reemplaza el actual)**

In `src/stores/useSavingsStore.js`, reemplazar `addContribution` (líneas ~105-111) por:

```js
  // Registra un aporte: inserta fila en savings_contributions, suma al saldo de
  // la meta y crea la transacción de ahorro enlazada (transaction_id), espejo de
  // addPayment en useDebtStore.
  addContribution: async (goalId, amount, date, notes = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const goal = get().goals.find((g) => g.id === goalId);
    if (!goal) return;

    const value = Number(amount);
    const contribPayload = {
      user_id: user.id,
      goal_id: goalId,
      amount: value,
      date,
      notes: notes || null,
    };
    const { data: contribData, error: contribErr } = await supabase
      .from('savings_contributions').insert(contribPayload).select().single();
    if (contribErr) {
      console.error('Error adding contribution', contribErr);
      toast.error('No se pudo registrar el aporte');
      return;
    }

    // Sube el saldo de la meta (vía updateGoal, que recalcula status).
    const newAmount = Number(goal.currentAmount) + value;
    await get().updateGoal(goalId, { currentAmount: newAmount });

    const formatted = {
      id: contribData.id, goalId, amount: value, date,
      notes: contribData.notes, transactionId: null, createdAt: contribData.created_at,
    };
    set((state) => ({ contributions: [...state.contributions, formatted] }));

    // Transacción de ahorro enlazada (base caja), igual que Deudas.
    try {
      const addTransaction = useTransactionStore.getState().addTransaction;
      const txId = await addTransaction({
        amount: value,
        type: 'savings',
        description: `Aporte a meta - ${goal.title}`,
        date,
        categoryId: savingsCategoryId(),
        currency: goal.currency || 'DOP',
        notes: notes || 'Generado automáticamente desde Ahorros',
      });
      if (txId) {
        await supabase.from('savings_contributions').update({ transaction_id: txId }).eq('id', contribData.id);
        set((state) => ({
          contributions: state.contributions.map((c) => (c.id === contribData.id ? { ...c, transactionId: txId } : c)),
        }));
      }
    } catch (err) {
      console.error('Error syncing contribution with transactions:', err);
    }
  },

  // Elimina un aporte: revierte el saldo de la meta y borra la transacción
  // enlazada. Devuelve { ok, hadTransactionLink } como deletePayment.
  deleteContribution: async (id) => {
    const contrib = get().contributions.find((c) => c.id === id);
    if (!contrib) return { ok: false };
    const goal = get().goals.find((g) => g.id === contrib.goalId);

    const { error } = await supabase.from('savings_contributions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting contribution', error);
      toast.error('No se pudo eliminar el aporte');
      return { ok: false };
    }

    if (goal) {
      const restored = Math.max(0, Number(goal.currentAmount) - Number(contrib.amount));
      await get().updateGoal(goal.id, { currentAmount: restored });
    }

    if (contrib.transactionId) {
      await useTransactionStore.getState().deleteTransactionSilent(contrib.transactionId);
    }

    set((state) => ({ contributions: state.contributions.filter((c) => c.id !== id) }));
    return { ok: true, hadTransactionLink: !!contrib.transactionId };
  },

  // Restaura un aporte eliminado (Deshacer): re-aplica vía addContribution.
  restoreContribution: async (contrib) => {
    if (!contrib) return false;
    await get().addContribution(contrib.goalId, contrib.amount, contrib.date, contrib.notes || '');
    return true;
  },

  getContributionsByGoal: (goalId) =>
    get().contributions.filter((c) => c.goalId === goalId).sort((a, b) => a.date.localeCompare(b.date)),
```

- [ ] **Step 6: Borrar meta también limpia sus aportes en estado local**

In `src/stores/useSavingsStore.js`, reemplazar `deleteGoal` (líneas ~98-103) por:

```js
  deleteGoal: async (id) => {
    // ON DELETE CASCADE borra las savings_contributions en BD. Las transacciones
    // enlazadas quedan (la app no las borra en cascada al eliminar la meta;
    // eso es decisión del usuario en Transacciones).
    const { error } = await supabase.from('savings').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
        contributions: state.contributions.filter((c) => c.goalId !== id),
      }));
    }
  },
```

- [ ] **Step 7: Persistir `contributions` en el cache**

In `src/stores/useSavingsStore.js`, en el bloque `persist` del final, reemplazar el `partialize`:

```js
{
  name: 'fintrack-savings-cache',
  partialize: (state) => ({ goals: state.goals, contributions: state.contributions }),
}
```

- [ ] **Step 8: Verificar lint y que la suite siga verde**

Run: `npm run lint`
Expected: 0 errores.
Run: `npm run test`
Expected: PASS (los 77 existentes + 5 de projection).

- [ ] **Step 9: Commit**

```bash
git add src/stores/useSavingsStore.js
git commit -m "feat(ahorros): store con aportes registrados + tx enlazada + currency/aporte mensual"
```

---

## Task 4: Mutadores demo para metas y aportes

**Files:**
- Modify: `src/stitch/demoMode.js`

- [ ] **Step 1: Sembrar `contributions` en demo**

In `src/stitch/demoMode.js`, en `seedDemoStores` (línea 116), reemplazar la línea de savings por:

```js
  useSavingsStore.setState({ goals, contributions: [], loading: false });
```

- [ ] **Step 2: Asegurar que las metas demo traen `monthlyContribution`**

In `src/stitch/demoMode.js`, reemplazar el array `goals` (líneas ~91-95) por:

```js
const goals = [
  { id: 'g1', title: 'Fondo de emergencia', targetAmount: 180000, currentAmount: 105000, monthlyContribution: 15000, deadline: iso(new Date(yearIdx + 1, 2, 1)), icon: '🆘', color: '#bec2ff', status: 'active', currency: 'DOP', createdAt: '' },
  { id: 'g2', title: 'Viaje a Europa', targetAmount: 250000, currentAmount: 60000, monthlyContribution: 20000, deadline: iso(new Date(yearIdx + 1, 7, 1)), icon: '✈️', color: '#50d8e9', status: 'active', currency: 'DOP', createdAt: '' },
  { id: 'g3', title: 'Laptop nueva', targetAmount: 90000, currentAmount: 90000, monthlyContribution: 0, deadline: null, icon: '💻', color: '#bdd200', status: 'completed', currency: 'DOP', createdAt: '' },
];
```

- [ ] **Step 3: Añadir los mutadores demo de Ahorros**

In `src/stitch/demoMode.js`, justo después del bloque de deudas (tras `demoDeleteDebtPayment`, al final del archivo antes del cierre), añadir:

```js
// ── Ahorros (metas + aportes) — en demo no hay sesión ─────────────────────────
// Resuelve la categoría de ahorro para enlazar la transacción del aporte.
function demoSavingsCategoryId() {
  const cats = useCategoryStore.getState().categories;
  const c = cats.find((x) => x.slug === 'ahorro') || cats.find((x) => x.type === 'savings');
  return c?.id || '';
}

export function demoAddGoal(goal) {
  const current = Number(goal.currentAmount) || 0;
  const row = {
    id: demoId(), title: goal.title,
    targetAmount: Number(goal.targetAmount), currentAmount: current,
    monthlyContribution: Number(goal.monthlyContribution) || 0,
    deadline: goal.deadline || null, icon: goal.icon || '🎯', color: goal.color || '#bec2ff',
    status: current >= Number(goal.targetAmount) ? 'completed' : 'active',
    currency: goal.currency || 'DOP', createdAt: new Date().toISOString(),
  };
  useSavingsStore.setState((s) => ({ goals: [...s.goals, row] }));
  return row;
}
export function demoUpdateGoal(id, updates) {
  useSavingsStore.setState((s) => ({
    goals: s.goals.map((g) => {
      if (g.id !== id) return g;
      const next = { ...g, ...updates };
      const current = updates.currentAmount !== undefined ? Number(updates.currentAmount) : g.currentAmount;
      const target = updates.targetAmount !== undefined ? Number(updates.targetAmount) : g.targetAmount;
      next.currentAmount = current;
      next.targetAmount = target;
      next.status = (current >= target && target > 0) ? 'completed' : (updates.status || g.status);
      return next;
    }),
  }));
}
// Borra la meta + sus aportes + las transacciones enlazadas de esos aportes.
export function demoDeleteGoal(id) {
  const { contributions } = useSavingsStore.getState();
  const txIds = contributions.filter((c) => c.goalId === id && c.transactionId).map((c) => c.transactionId);
  if (txIds.length) useTransactionStore.setState((s) => ({ transactions: s.transactions.filter((t) => !txIds.includes(t.id)) }));
  useSavingsStore.setState((s) => ({
    goals: s.goals.filter((g) => g.id !== id),
    contributions: s.contributions.filter((c) => c.goalId !== id),
  }));
}
// Restaura una meta borrada con sus aportes; recrea las transacciones enlazadas.
export function demoRestoreGoal(goal, contributions = []) {
  useSavingsStore.setState((s) => ({ goals: [...s.goals, goal] }));
  for (const c of contributions) {
    if (c.transactionId) {
      const tx = {
        id: c.transactionId, categoryId: demoSavingsCategoryId(), cardId: null,
        amount: Number(c.amount), type: 'savings', description: `Aporte a meta - ${goal.title}`,
        date: c.date, notes: c.notes || 'Generado automáticamente desde Ahorros', currency: goal.currency || 'DOP',
        cashbackEarned: 0, createdAt: new Date().toISOString(),
      };
      useTransactionStore.setState((s) => ({ transactions: [tx, ...s.transactions] }));
    }
    useSavingsStore.setState((s) => ({ contributions: [...s.contributions, c] }));
  }
}
export function demoAddContribution(goalId, amount, date, notes = '') {
  const { goals } = useSavingsStore.getState();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return null;
  const value = Number(amount) || 0;

  let transactionId = null;
  const catId = demoSavingsCategoryId();
  transactionId = demoAddTransaction({
    amount: value, type: 'savings', description: `Aporte a meta - ${goal.title}`,
    date, categoryId: catId, currency: goal.currency || 'DOP',
    notes: notes || 'Generado automáticamente desde Ahorros',
  });

  const contrib = { id: demoId(), goalId, amount: value, date, notes: notes || null, transactionId, createdAt: new Date().toISOString() };
  const newAmount = Number(goal.currentAmount) + value;
  useSavingsStore.setState((s) => ({
    contributions: [...s.contributions, contrib],
    goals: s.goals.map((g) => (g.id === goalId ? { ...g, currentAmount: newAmount, status: (newAmount >= g.targetAmount && g.targetAmount > 0) ? 'completed' : g.status } : g)),
  }));
  return contrib;
}
export function demoDeleteContribution(id) {
  const { contributions, goals } = useSavingsStore.getState();
  const contrib = contributions.find((c) => c.id === id);
  if (!contrib) return { ok: false };
  const goal = goals.find((g) => g.id === contrib.goalId);
  if (contrib.transactionId) demoDeleteTransaction(contrib.transactionId);
  useSavingsStore.setState((s) => ({
    contributions: s.contributions.filter((c) => c.id !== id),
    goals: goal
      ? s.goals.map((g) => {
          if (g.id !== goal.id) return g;
          const restored = Math.max(0, Number(g.currentAmount) - Number(contrib.amount));
          return { ...g, currentAmount: restored, status: (restored >= g.targetAmount && g.targetAmount > 0) ? 'completed' : 'active' };
        })
      : s.goals,
  }));
  return { ok: true, contribution: contrib };
}
```

- [ ] **Step 4: Verificar lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/demoMode.js
git commit -m "feat(ahorros): mutadores demo de metas y aportes (cascade + tx enlazada)"
```

---

## Task 5: Primitivas de UI locales `vaultsUi.jsx`

**Files:**
- Create: `src/stitch/screens/vaults/vaultsUi.jsx`

- [ ] **Step 1: Crear el archivo (copia del patrón de debtsUi)**

Create `src/stitch/screens/vaults/vaultsUi.jsx`:

```jsx
// Primitivas de UI compartidas por los modales de Ahorros (patrón local, sin
// acoplar a otras carpetas de screens).
import MS from '../../MS';

export const inputCls =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

export function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>
      {children}
      {hint && <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{hint}</span>}
    </div>
  );
}

export function FormActions({ onCancel, label, disabled }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
      <button type="submit" disabled={disabled} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow disabled:opacity-40">{label}</button>
    </div>
  );
}

export function Modal({ title, onClose, children, width = '480px' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-h-[85vh] overflow-y-auto p-lg" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stitch/screens/vaults/vaultsUi.jsx
git commit -m "feat(ahorros): primitivas de UI locales (Modal/Field/FormActions)"
```

---

## Task 6: `VaultForm.jsx` (crear/editar meta)

**Files:**
- Create: `src/stitch/screens/vaults/VaultForm.jsx`

- [ ] **Step 1: Crear el formulario**

Create `src/stitch/screens/vaults/VaultForm.jsx`:

```jsx
// Modal de crear/editar meta. Inputs Stitch + demo branching. El saldo inicial
// solo se declara al CREAR (al editar el saldo cambia vía aportes).
import { useState } from 'react';
import toast from 'react-hot-toast';
import Emoji from '../../Emoji';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchSelect from '../../StitchSelect';
import StitchDatePicker from '../../StitchDatePicker';
import useSavingsStore from '../../../stores/useSavingsStore';
import { isDemoActive, demoAddGoal, demoUpdateGoal } from '../../demoMode';
import { Modal, Field, FormActions, inputCls } from './vaultsUi';

const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💻', '📱', '👶', '🎓', '💍', '🆘', '🏖️', '🏦'];

const blank = { title: '', targetAmount: '', currentAmount: '0', monthlyContribution: '', deadline: '', icon: '🎯', color: '#bec2ff', currency: 'DOP' };

export default function VaultForm({ editing, onClose }) {
  const { addGoal, updateGoal } = useSavingsStore();
  const demo = isDemoActive();

  const [form, setForm] = useState(editing
    ? {
        title: editing.title, targetAmount: String(editing.targetAmount),
        currentAmount: String(editing.currentAmount),
        monthlyContribution: editing.monthlyContribution ? String(editing.monthlyContribution) : '',
        deadline: editing.deadline || '', icon: editing.icon || '🎯',
        color: editing.color || '#bec2ff', currency: editing.currency || 'DOP',
      }
    : blank);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !Number(form.targetAmount)) {
      toast.error('Completa el nombre y el monto de la meta');
      return;
    }
    // Base común. El saldo inicial solo se envía al crear.
    const data = {
      title: form.title.trim(), targetAmount: Number(form.targetAmount),
      monthlyContribution: Number(form.monthlyContribution) || 0,
      deadline: form.deadline || null, icon: form.icon, color: form.color, currency: form.currency,
    };
    if (editing) {
      if (demo) { demoUpdateGoal(editing.id, data); toast.success('Meta actualizada'); }
      else { await updateGoal(editing.id, data); toast.success('Meta actualizada'); }
    } else {
      const createData = { ...data, currentAmount: Number(form.currentAmount) || 0 };
      if (demo) { demoAddGoal(createData); toast.success('Meta creada'); }
      else { await addGoal(createData); toast.success('Meta creada'); }
    }
    onClose();
  };

  return (
    <Modal title={editing ? 'Editar meta' : 'Nueva meta'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <Field label="Nombre"><input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} placeholder="Ej. Fondo de emergencia" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Meta"><StitchCurrencyInput value={form.targetAmount} onChange={(v) => set({ targetAmount: v })} className={inputCls} /></Field>
          {editing
            ? <Field label="Aporte mensual" hint="Para la proyección"><StitchCurrencyInput value={form.monthlyContribution} onChange={(v) => set({ monthlyContribution: v })} className={inputCls} /></Field>
            : <Field label="Saldo inicial" hint="Lo que ya tienes"><StitchCurrencyInput value={form.currentAmount} onChange={(v) => set({ currentAmount: v })} className={inputCls} /></Field>}
        </div>
        {!editing && (
          <Field label="Aporte mensual" hint="Para la proyección"><StitchCurrencyInput value={form.monthlyContribution} onChange={(v) => set({ monthlyContribution: v })} className={inputCls} /></Field>
        )}
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha límite"><StitchDatePicker value={form.deadline} onChange={(v) => set({ deadline: v })} /></Field>
          <Field label="Moneda">
            <StitchSelect value={form.currency} onChange={(v) => set({ currency: v })} options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]} />
          </Field>
        </div>
        <Field label="Ícono">
          <div className="flex flex-wrap gap-xs">{EMOJIS.map((em) => <button type="button" key={em} onClick={() => set({ icon: em })} className={`w-8 h-8 rounded border flex items-center justify-center ${form.icon === em ? 'border-primary bg-primary/10' : 'border-border-subtle'}`}><Emoji e={em} size={16} /></button>)}</div>
        </Field>
        <FormActions onCancel={onClose} label={editing ? 'Guardar' : 'Crear'} />
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/vaults/VaultForm.jsx
git commit -m "feat(ahorros): formulario de meta con inputs Stitch + demo branching"
```

---

## Task 7: `ContributionModal.jsx` (aporte)

**Files:**
- Create: `src/stitch/screens/vaults/ContributionModal.jsx`

- [ ] **Step 1: Crear el modal de aporte**

Create `src/stitch/screens/vaults/ContributionModal.jsx`:

```jsx
// Modal de aporte: monto + fecha + nota. Suma a la meta y crea una transacción de
// ahorro enlazada. Prellena el monto con el aporte mensual de la meta si existe.
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchCurrencyInput from '../../StitchCurrencyInput';
import StitchDatePicker from '../../StitchDatePicker';
import useSavingsStore from '../../../stores/useSavingsStore';
import { isDemoActive, demoAddContribution } from '../../demoMode';
import { todayISO, formatCurrency } from '../../../utils/formatters';
import { Modal, Field, FormActions, inputCls } from './vaultsUi';

const fmt = (n, c) => formatCurrency(n, c);

export default function ContributionModal({ goal, onClose }) {
  const addContribution = useSavingsStore((s) => s.addContribution);
  const [amount, setAmount] = useState(goal.monthlyContribution ? String(goal.monthlyContribution) : '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (isDemoActive()) demoAddContribution(goal.id, amt, date, note.trim());
    else await addContribution(goal.id, amt, date, note.trim());
    const done = Number(goal.currentAmount) + amt >= Number(goal.targetAmount);
    toast.success(done ? '🎉 ¡Meta completada!' : `Aporte de ${fmt(amt, goal.currency)} registrado`, { duration: 4000 });
    onClose();
  };

  return (
    <Modal title={`Abonar · ${goal.title}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex justify-between items-center">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Saldo actual</span>
          <span className="font-mono-data text-[15px] text-on-surface">{fmt(goal.currentAmount, goal.currency)}</span>
        </div>
        <Field label="Monto a abonar"><StitchCurrencyInput value={amount} onChange={setAmount} className={inputCls} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Fecha"><StitchDatePicker value={date} onChange={setDate} max={todayISO()} /></Field>
          <Field label="Nota (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Ej. Aporte de junio" /></Field>
        </div>
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Se suma a la meta y se crea una transacción de ahorro enlazada automáticamente.</p>
        <FormActions onCancel={onClose} label="Abonar" disabled={!Number(amount)} />
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/vaults/ContributionModal.jsx
git commit -m "feat(ahorros): modal de aporte con tx enlazada + demo branching"
```

---

## Task 8: `HistoryModal.jsx` (historial de aportes)

**Files:**
- Create: `src/stitch/screens/vaults/HistoryModal.jsx`

- [ ] **Step 1: Crear el historial**

Create `src/stitch/screens/vaults/HistoryModal.jsx`:

```jsx
// Historial de aportes de una meta: resumen (total aportado + proyección) y lista
// con borrar + Deshacer. El borrado revierte saldo y la transacción enlazada.
import toast from 'react-hot-toast';
import MS from '../../MS';
import useSavingsStore from '../../../stores/useSavingsStore';
import { isDemoActive, demoDeleteContribution, demoAddContribution } from '../../demoMode';
import { formatCurrency, formatDate, toISODate } from '../../../utils/formatters';
import { getProjection } from './projection';
import { Modal } from './vaultsUi';

const fmt = (n, c) => formatCurrency(n, c);

export default function HistoryModal({ goal: goalProp, onClose }) {
  const { goals, contributions, addContribution, deleteContribution, restoreContribution } = useSavingsStore();
  const demo = isDemoActive();

  // Lee la meta VIVA del store (su saldo cambia al borrar aportes dentro del modal).
  const goal = goals.find((g) => g.id === goalProp.id) || goalProp;

  const list = contributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalContributed = list.reduce((s, c) => s + Number(c.amount), 0);
  const proj = getProjection(goal);

  const onDelete = async (c) => {
    if (demo) {
      demoDeleteContribution(c.id);
    } else {
      const res = await deleteContribution(c.id);
      if (!res?.ok) return;
    }
    toast((t) => (
      <span className="flex items-center gap-sm">Aporte eliminado
        <button
          onClick={() => {
            if (demo) demoAddContribution(c.goalId, c.amount, c.date, c.notes || '');
            else if (restoreContribution) restoreContribution(c); else addContribution(c.goalId, c.amount, c.date, c.notes || '');
            toast.dismiss(t.id);
          }}
          className="text-primary font-bold underline"
        >Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  return (
    <Modal title={`Aportes · ${goal.title}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-sm mb-md">
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Total aportado</span>
          <span className="font-mono-data text-[15px] text-on-surface mt-1">{fmt(totalContributed, goal.currency)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted uppercase">Saldo actual</span>
          <span className="font-mono-data text-[15px] text-on-surface mt-1">{fmt(goal.currentAmount, goal.currency)}</span>
        </div>
      </div>

      {proj.done ? (
        <p className="font-mono-data text-mono-data text-tertiary normal-case tracking-normal mb-md">Meta completada. 🎉</p>
      ) : proj.reachable ? (
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal mb-md">
          A este ritmo, lista en <span className="text-tertiary">{proj.months} {proj.months === 1 ? 'mes' : 'meses'}</span>{proj.projectedDate ? ` (${formatDate(toISODate(proj.projectedDate))})` : ''}.
        </p>
      ) : (
        <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal mb-md">Define un aporte mensual en la meta para ver la proyección.</p>
      )}

      {list.length === 0 ? (
        <div className="py-[40px] flex flex-col items-center text-center gap-sm">
          <MS name="savings" className="text-[32px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Aún no has registrado aportes.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-sm group">
              <div className="flex flex-col min-w-0">
                <span className="font-mono-data text-[14px] text-on-surface">{fmt(c.amount, goal.currency)}</span>
                <span className="font-mono-data text-mono-data text-text-muted">{formatDate(c.date)}{c.notes ? ` · ${c.notes}` : ''}</span>
              </div>
              <button onClick={() => onDelete(c)} className="text-text-muted hover:text-accent-error p-xs opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar aporte">
                <MS name="delete" className="!text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/vaults/HistoryModal.jsx
git commit -m "feat(ahorros): historial de aportes con borrar + Deshacer"
```

---

## Task 9: `VaultItem.jsx` (tarjeta del grid)

**Files:**
- Create: `src/stitch/screens/vaults/VaultItem.jsx`

- [ ] **Step 1: Crear la tarjeta**

Create `src/stitch/screens/vaults/VaultItem.jsx`:

```jsx
// Tarjeta de meta de ahorro: emoji, saldo, % + barra, proyección (análoga al
// payoff de Deudas) y acciones (Abonar/Historial/Editar/Eliminar).
import { useMemo } from 'react';
import MS from '../../MS';
import Emoji from '../../Emoji';
import { Stagger } from '../../StitchMotion';
import { formatCurrency, formatDate, toISODate } from '../../../utils/formatters';
import { getProjection } from './projection';

const fmt = (n, c) => formatCurrency(n, c);

export default function VaultItem({ goal, onContribute, onHistory, onEdit, onDelete }) {
  const proj = useMemo(() => getProjection(goal), [goal]);
  const paused = goal.status === 'paused';

  return (
    <Stagger.Item className="bg-surface-card border border-border-subtle rounded-lg p-md inner-glow flex flex-col gap-md" style={{ opacity: paused ? 0.6 : 1 }}>
      <div className="flex items-center gap-sm">
        <div className="w-8 h-8 rounded-sm bg-surface-container-high flex items-center justify-center border border-border-subtle shrink-0"><Emoji e={goal.icon || '🎯'} size={18} /></div>
        <span className="font-label-sm text-label-sm uppercase text-on-surface truncate min-w-0">{goal.title}</span>
        {goal.currency === 'USD' && <span className="font-mono-data text-[8px] text-secondary border border-secondary/40 rounded px-1 shrink-0">USD</span>}
      </div>

      <div className={`font-headline-md text-headline-md tracking-tight ${proj.done ? 'text-tertiary' : 'text-on-surface'}`} style={proj.done ? { color: '#bdd200' } : undefined}>{fmt(goal.currentAmount, goal.currency)}</div>

      <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, proj.pct))}%`, background: proj.done ? '#bdd200' : goal.color }} />
      </div>
      <div className="flex justify-between font-mono-data text-mono-data text-text-muted">
        <span>Meta {fmt(goal.targetAmount, goal.currency)}</span>
        <span>{proj.pct.toFixed(0)}%</span>
      </div>

      {/* Proyección de la meta */}
      {proj.done ? (
        <div className="flex items-center gap-xs bg-tertiary/10 border border-tertiary/30 rounded px-sm py-xs">
          <MS name="check_circle" className="!text-[13px] text-tertiary" />
          <span className="font-mono-data text-mono-data text-tertiary normal-case tracking-normal">Meta completada.</span>
        </div>
      ) : proj.reachable ? (
        <div className="flex flex-wrap items-center justify-between gap-xs bg-surface-container-lowest border border-border-subtle rounded px-sm py-xs inner-glow">
          <span className="font-mono-data text-mono-data text-text-muted flex items-center gap-xs">
            <MS name="event_available" className="!text-[13px] text-tertiary" /> Lista en {proj.months} {proj.months === 1 ? 'mes' : 'meses'}
          </span>
          {proj.projectedDate && <span className="font-mono-data text-mono-data text-text-muted">{formatDate(toISODate(proj.projectedDate))}</span>}
          <span className="font-mono-data text-mono-data text-text-muted w-full">Aporte mensual: {fmt(goal.monthlyContribution, goal.currency)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-xs bg-surface-container-lowest border border-border-subtle rounded px-sm py-xs">
          <MS name="info" className="!text-[13px] text-text-muted" />
          <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Define un aporte mensual para ver la proyección.</span>
        </div>
      )}

      <div className="flex gap-sm mt-xs">
        <button onClick={() => onContribute(goal)} className="flex-1 border border-border-subtle text-primary font-mono-data text-mono-data uppercase py-xs rounded hover:bg-primary/10 transition-colors">Abonar</button>
        <button onClick={() => onHistory(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-on-surface" aria-label="Historial"><MS name="history" className="!text-[14px]" /></button>
        <button onClick={() => onEdit(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-on-surface" aria-label="Editar"><MS name="edit" className="!text-[14px]" /></button>
        <button onClick={() => onDelete(goal)} className="px-sm border border-border-subtle text-text-muted rounded hover:text-accent-error" aria-label="Eliminar"><MS name="delete" className="!text-[14px]" /></button>
      </div>
    </Stagger.Item>
  );
}
```

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/vaults/VaultItem.jsx
git commit -m "feat(ahorros): tarjeta de meta con proyección (espejo de DebtItem)"
```

---

## Task 10: `StitchVaults.jsx` shell + integración

**Files:**
- Modify (reescribir): `src/stitch/screens/StitchVaults.jsx`

- [ ] **Step 1: Reescribir el shell delgado**

Replace the entire contents of `src/stitch/screens/StitchVaults.jsx` with:

```jsx
// Ahorros (Vaults) — shell: header (ahorro total) + grid de metas + modales. La
// lógica de aportes (con transacción enlazada) vive en useSavingsStore; la
// proyección en vaults/projection.js. Patrón espejo de Deudas.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import useSavingsStore from '../../stores/useSavingsStore';
import { isDemoActive, demoDeleteGoal, demoRestoreGoal } from '../demoMode';
import { formatCurrency } from '../../utils/formatters';
import VaultItem from './vaults/VaultItem';
import VaultForm from './vaults/VaultForm';
import ContributionModal from './vaults/ContributionModal';
import HistoryModal from './vaults/HistoryModal';

const fmt = (n) => formatCurrency(n);

export default function StitchVaults() {
  const { goals, contributions, addGoal, deleteGoal, restoreContribution, getTotalSaved } = useSavingsStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contribGoal, setContribGoal] = useState(null);
  const [historyGoal, setHistoryGoal] = useState(null);

  const total = getTotalSaved();

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (g) => { setEditing(g); setShowForm(true); };

  const onDelete = async (goal) => {
    // Captura los aportes antes de borrar para restaurarlos en el Deshacer.
    const goalContribs = contributions.filter((c) => c.goalId === goal.id);
    if (isDemoActive()) demoDeleteGoal(goal.id); else await deleteGoal(goal.id);
    toast((t) => (
      <span className="flex items-center gap-sm">Meta eliminada
        <button
          onClick={async () => {
            if (isDemoActive()) {
              demoRestoreGoal(goal, goalContribs);
            } else {
              await addGoal(goal);
              // Re-aplica los aportes (recrea sus transacciones enlazadas).
              for (const c of goalContribs) await restoreContribution(c);
            }
            toast.dismiss(t.id);
          }}
          className="text-primary font-bold underline"
        >Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-2 mb-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary live-dot" />
            <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-wider">Sistema activo</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Metas de ahorro</h1>
          <p className="font-body-md text-body-md text-text-muted mt-2">Ahorro total acumulado: <span className="text-tertiary font-mono-data">{fmt(total)}</span></p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start">
          <MS name="add" className="text-[16px]" /> Nueva meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
          <MS name="savings" className="text-[36px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Sin metas de ahorro todavía.</p>
          <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Crear primera meta</button>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {goals.map((g) => (
            <VaultItem key={g.id} goal={g} onContribute={setContribGoal} onHistory={setHistoryGoal} onEdit={openEdit} onDelete={onDelete} />
          ))}
        </Stagger>
      )}

      {showForm && <VaultForm editing={editing} onClose={() => setShowForm(false)} />}
      {contribGoal && <ContributionModal goal={contribGoal} onClose={() => setContribGoal(null)} />}
      {historyGoal && <HistoryModal goal={historyGoal} onClose={() => setHistoryGoal(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build, lint y tests**

Run: `npm run lint`
Expected: 0 errores.
Run: `npm run build`
Expected: build limpio.
Run: `npm run test`
Expected: PASS (77 existentes + 5 de projection = 82).

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchVaults.jsx
git commit -m "feat(ahorros): shell delgado + integración de sub-componentes"
```

---

## Task 11: Verificación manual en demo + handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Verificación funcional en demo**

Confirmar que `http://localhost:5173/` responde 200. Entrar como demo y en Ahorros:
- Crear meta (con saldo inicial + aporte mensual + moneda USD) → persiste en la sesión.
- Editar meta → el campo "Saldo inicial" no aparece; aparece "Aporte mensual".
- Abonar → sube el saldo, aparece transacción de ahorro en Transacciones.
- Ver historial → lista el aporte; borrar aporte → revierte saldo y Deshacer lo recrea.
- Borrar meta → toast Deshacer restaura meta + aportes.
- Verificar que ningún dropdown (`StitchSelect`, `StitchDatePicker`) recorta dentro del modal.
- Verificar la proyección: meta con aporte mensual muestra "Lista en N meses"; sin aporte muestra el aviso.

Anota cualquier hallazgo; si hay bug, corrígelo (con su propio commit) antes de seguir.

- [ ] **Step 2: Actualizar `handoff.md`**

In `handoff.md`:
- Mover Ahorros (`StitchVaults.jsx`) de "PENDIENTES" a "PULIDAS" (líneas ~20-21).
- En la sección de demoMode (línea ~43), reemplazar el "PENDIENTE: faltan mutadores demo para Ahorros" por la mención de que ya existen (`demoAddGoal`/`demoUpdateGoal`/`demoDeleteGoal`/`demoRestoreGoal`/`demoAddContribution`/`demoDeleteContribution`) y que falta solo Plan (plans).
- En "Siguiente paso lógico" (líneas ~103-112), reemplazar Ahorros por **Plan (`StitchStrategy`)** como siguiente página, conservando el resto del orden.
- Anotar la nueva tabla `savings_contributions` + columnas `currency`/`monthly_contribution` y que la migración `supabase/add_savings_contributions.sql` debe correrse a mano.
- Actualizar el conteo de tests (77 → 82) y el HEAD esperado.

- [ ] **Step 3: Commit del handoff**

```bash
git add handoff.md
git commit -m "docs(handoff): Ahorros pulido; siguiente=Plan; nota migración savings_contributions"
```

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** tabla `savings_contributions` (T1, T3), `monthly_contribution` (T1, T3, T6, T9), persistir `currency` (T1, T3, T6), saldo inicial solo al crear (T6), proyección (T2, T9, T8), historial con Deshacer (T8), demo branching (T4, T6, T7, T8, T10), shell delgado (T10). Todas las secciones del spec tienen tarea.
- **Sin placeholders:** todos los pasos de código muestran el código completo.
- **Consistencia de tipos:** `getProjection` devuelve `{ reachable, done, months, remaining, projectedDate, pct }` y se consume con esas mismas claves en `VaultItem`/`HistoryModal`. `addContribution(goalId, amount, date, notes)` y `deleteContribution(id)` tienen la misma firma en store, demo y consumidores. `goal.monthlyContribution` es la propiedad usada en store, demo, form, item.
- **Identidad visual:** todas las clases de tema (tokens periwinkle, `inner-glow`, `font-mono-data`, etc.) y el layout replican el patrón de Deudas/Tarjetas. Sin desviación del diseño global.
