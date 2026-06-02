# Tarjetas de crédito v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar control de tarjetas de crédito como una capa de seguimiento (banco, día de corte, día de pago, consumo por ciclo, aviso de pago, marcar pagado) sin alterar la lógica del presupuesto.

**Architecture:** Una tabla `credit_cards` en Supabase y una columna `card_id` (nullable) en `transactions`. Una función pura (`src/utils/creditCards.js`) calcula los ciclos de corte/pago. Un store Zustand (`useCreditCardStore`) gestiona las tarjetas. Una página nueva `/tarjetas` muestra cada tarjeta con su ciclo abierto y estado de cuenta por pagar. Un gasto con `card_id` sigue contando una sola vez en el presupuesto: `card_id` no entra en ningún cálculo de `getBudgetSummary`.

**Tech Stack:** React 19, Vite 8, Zustand 5 (persist), Supabase, Vitest (lógica pura), ESLint 10. Verificación: `npm run test`, `npm run lint`, `npm run build`, comprobación manual con `npm run dev`.

---

## Notas de contexto para el implementador

- Las transacciones se almacenan en DOP (conversión USD→DOP al guardar). Los montos por ciclo se suman en DOP.
- Los objetos del dominio usan camelCase en JS; los stores mapean snake_case (DB) ↔ camelCase. Sigue ese patrón (ver `useDebtStore.js`).
- Las fechas de transacción son ISO `YYYY-MM-DD`; compáralas como strings.
- `cutoff_day` y `due_day` son día del mes (1–31), ingresados manualmente y editables.

---

## Task 1: Migración SQL en Supabase (PRERREQUISITO — lo corre el usuario)

**No es código.** Antes de que la función pueda guardar datos, el usuario debe crear la tabla y la columna.

- [ ] **Step 1: El usuario corre el SQL en Supabase**

**Cuándo:** ahora, antes de probar la función (las Tasks 2–4 pueden escribirse sin esto, pero nada se podrá guardar/leer hasta correrlo).
**Dónde:** Supabase Dashboard → proyecto → **SQL Editor** → **New query** → pegar → **Run**.

```sql
create table if not exists credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  cutoff_day int not null check (cutoff_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  color text default '#6366f1',
  paid_cycles text[] not null default '{}',
  created_at timestamptz default now()
);

alter table transactions add column if not exists card_id uuid references credit_cards(id) on delete set null;

alter table credit_cards enable row level security;

create policy "Users manage own credit cards" on credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Expected: "Success. No rows returned." La tabla `credit_cards` aparece en Table Editor y `transactions` tiene la columna `card_id`.

- [ ] **Step 2: Confirmar antes de seguir**

No continuar con las pruebas manuales (Tasks 7–10) hasta que este paso esté hecho. Las Tasks de código (2–6, 8–10) se pueden escribir y commitear sin la migración, pero la verificación manual la requiere.

---

## Task 2: Lógica de ciclos (función pura, TDD)

**Files:**
- Create: `src/utils/creditCards.js`
- Test: `src/utils/creditCards.test.js`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/utils/creditCards.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getCardCycles, getStatementAmount, isStatementPaid } from './creditCards';

describe('getCardCycles', () => {
  it('corte 20 / pago 5: el pago cae el mes siguiente al corte', () => {
    const c = getCardCycles({ cutoffDay: 20, dueDay: 5 }, new Date(2026, 4, 28));
    expect(c.lastCutoffISO).toBe('2026-05-20');
    expect(c.nextCutoffISO).toBe('2026-06-20');
    expect(c.openStartISO).toBe('2026-05-21');
    expect(c.openEndISO).toBe('2026-06-20');
    expect(c.closedStartISO).toBe('2026-04-21');
    expect(c.closedEndISO).toBe('2026-05-20');
    expect(c.dueDateISO).toBe('2026-06-05');
  });

  it('corte 5 / pago 25: el pago cae el mismo mes del corte', () => {
    const c = getCardCycles({ cutoffDay: 5, dueDay: 25 }, new Date(2026, 4, 28));
    expect(c.lastCutoffISO).toBe('2026-05-05');
    expect(c.nextCutoffISO).toBe('2026-06-05');
    expect(c.closedStartISO).toBe('2026-04-06');
    expect(c.closedEndISO).toBe('2026-05-05');
    expect(c.dueDateISO).toBe('2026-05-25');
  });

  it('ajusta el día 31 a meses cortos (febrero)', () => {
    const c = getCardCycles({ cutoffDay: 31, dueDay: 15 }, new Date(2026, 1, 15));
    expect(c.lastCutoffISO).toBe('2026-01-31');
    expect(c.nextCutoffISO).toBe('2026-02-28');
  });
});

describe('getStatementAmount', () => {
  it('suma solo las transacciones de esa tarjeta dentro de la ventana', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 1000 },
      { cardId: 'c1', date: '2026-05-25', amount: 500 },
      { cardId: 'c2', date: '2026-05-10', amount: 999 },
      { cardId: 'c1', date: '2026-04-30', amount: 200 },
    ];
    expect(getStatementAmount(txs, 'c1', '2026-05-01', '2026-05-20')).toBe(1000);
  });
});

describe('isStatementPaid', () => {
  it('detecta el ciclo marcado como pagado', () => {
    const card = { paidCycles: ['2026-05-20'] };
    expect(isStatementPaid(card, '2026-05-20')).toBe(true);
    expect(isStatementPaid(card, '2026-06-20')).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npm run test`
Expected: FAIL — `getCardCycles is not a function` (módulo no existe aún).

- [ ] **Step 3: Implementar la lógica**

Crea `src/utils/creditCards.js`:

```js
// FinTrack — Lógica de ciclos de tarjetas de crédito (pura)

import { toISODate } from './formatters';

// Fecha del día `day` en (year, month0), ajustando a meses cortos.
function dayInMonth(year, month0, day) {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, lastDay));
}

function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/**
 * Calcula las fechas del ciclo abierto y del estado de cuenta cerrado de una
 * tarjeta a partir de su día de corte y de pago.
 * @param {{cutoffDay:number, dueDay:number}} card
 * @param {Date} refDate - fecha de referencia (hoy)
 */
export function getCardCycles(card, refDate = new Date()) {
  const cutoff = Number(card.cutoffDay);
  const due = Number(card.dueDay);
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const ref = new Date(y, m, refDate.getDate());

  const thisCutoff = dayInMonth(y, m, cutoff);
  let lastCutoff, nextCutoff;
  if (thisCutoff <= ref) {
    lastCutoff = thisCutoff;
    nextCutoff = dayInMonth(y, m + 1, cutoff);
  } else {
    lastCutoff = dayInMonth(y, m - 1, cutoff);
    nextCutoff = thisCutoff;
  }

  const prevCutoff = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() - 1, cutoff);

  // Fecha de pago: primera ocurrencia del día de pago posterior al corte.
  let dueDate = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth(), due);
  if (dueDate <= lastCutoff) {
    dueDate = dayInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, due);
  }

  const lastCutoffISO = toISODate(lastCutoff);
  const prevCutoffISO = toISODate(prevCutoff);

  return {
    lastCutoffISO,
    nextCutoffISO: toISODate(nextCutoff),
    openStartISO: addDaysISO(lastCutoffISO, 1),
    openEndISO: toISODate(nextCutoff),
    closedStartISO: addDaysISO(prevCutoffISO, 1),
    closedEndISO: lastCutoffISO,
    dueDateISO: toISODate(dueDate),
  };
}

/**
 * Suma (en DOP) las transacciones de una tarjeta cuya fecha cae en [startISO, endISO].
 */
export function getStatementAmount(transactions, cardId, startISO, endISO) {
  return transactions.reduce((sum, t) => {
    if (t.cardId !== cardId) return sum;
    if (t.date >= startISO && t.date <= endISO) return sum + (Number(t.amount) || 0);
    return sum;
  }, 0);
}

/**
 * ¿El estado de cuenta que cerró en `closedEndISO` ya fue marcado como pagado?
 */
export function isStatementPaid(card, closedEndISO) {
  return Array.isArray(card.paidCycles) && card.paidCycles.includes(closedEndISO);
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npm run test`
Expected: PASS — todos los tests de `creditCards.test.js` verdes (y los existentes siguen verdes).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 problemas.

- [ ] **Step 6: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "feat: add credit-card cycle logic (cutoff/due/statement)"
```

---

## Task 3: Store `useCreditCardStore`

**Files:**
- Create: `src/stores/useCreditCardStore.js`

- [ ] **Step 1: Crear el store**

Crea `src/stores/useCreditCardStore.js` (sigue el patrón de `useDebtStore.js`):

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const mapFromDb = (c) => ({
  id: c.id,
  name: c.name,
  bank: c.bank || '',
  cutoffDay: Number(c.cutoff_day),
  dueDay: Number(c.due_day),
  color: c.color || '#6366f1',
  paidCycles: Array.isArray(c.paid_cycles) ? c.paid_cycles : [],
  createdAt: c.created_at,
});

const useCreditCardStore = create(
  persist(
    (set, get) => ({
      cards: [],
      loading: false,

      fetchCards: async () => {
        set({ loading: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return set({ cards: [], loading: false });

        const { data, error } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          set({ cards: data.map(mapFromDb), loading: false });
        } else {
          set({ loading: false });
        }
      },

      addCard: async (card) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
          user_id: user.id,
          name: card.name,
          bank: card.bank || null,
          cutoff_day: Number(card.cutoffDay),
          due_day: Number(card.dueDay),
          color: card.color || '#6366f1',
        };

        const { data, error } = await supabase.from('credit_cards').insert(payload).select().single();
        if (error) {
          console.error('Card insert error:', error);
          toast.error('Error al guardar la tarjeta');
          return;
        }
        set((state) => ({ cards: [...state.cards, mapFromDb(data)] }));
        toast.success('Tarjeta guardada');
      },

      updateCard: async (id, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.bank !== undefined) dbUpdates.bank = updates.bank || null;
        if (updates.cutoffDay !== undefined) dbUpdates.cutoff_day = Number(updates.cutoffDay);
        if (updates.dueDay !== undefined) dbUpdates.due_day = Number(updates.dueDay);
        if (updates.color !== undefined) dbUpdates.color = updates.color;

        const { error } = await supabase.from('credit_cards').update(dbUpdates).eq('id', id);
        if (error) {
          console.error('Card update error:', error);
          toast.error('Error al actualizar la tarjeta');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
        toast.success('Tarjeta actualizada');
      },

      deleteCard: async (id) => {
        const { error } = await supabase.from('credit_cards').delete().eq('id', id);
        if (!error) {
          set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
        }
      },

      markStatementPaid: async (cardId, cycleEndISO) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        if (card.paidCycles.includes(cycleEndISO)) return;

        const newPaid = [...card.paidCycles, cycleEndISO];
        const { error } = await supabase.from('credit_cards').update({ paid_cycles: newPaid }).eq('id', cardId);
        if (error) {
          console.error('Mark paid error:', error);
          toast.error('Error al marcar como pagado');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, paidCycles: newPaid } : c)),
        }));
        toast.success('Estado de cuenta marcado como pagado');
      },
    }),
    {
      name: 'fintrack-cards-cache',
      partialize: (state) => ({ cards: state.cards }),
    }
  )
);

export default useCreditCardStore;
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/stores/useCreditCardStore.js
git commit -m "feat: add credit-card store (CRUD + mark statement paid)"
```

---

## Task 4: Soporte de `card_id` en el store de transacciones

**Files:**
- Modify: `src/stores/useTransactionStore.js`

- [ ] **Step 1: Mapear `cardId` al leer**

En `fetchTransactions`, donde se formatean los datos:

```js
      const formattedData = data.map(t => ({
        ...t,
        categoryId: t.category_id,
        cardId: t.card_id || null,
        createdAt: t.created_at
      }));
```

- [ ] **Step 2: Guardar `card_id` al crear**

En `addTransaction`, en el objeto `dbTx`, añade la línea `card_id`:

```js
    const dbTx = {
      user_id: user.id,
      category_id: transaction.categoryId || null,
      card_id: transaction.cardId || null,
      amount: amount,
      type: transaction.type,
      description: transaction.description,
      date: transaction.date,
      notes: notes,
      currency: 'DOP'
    };
```

Y en el `set` local tras el insert, mapea `cardId`:

```js
      const newTx = { ...data, categoryId: data.category_id, cardId: data.card_id || null, createdAt: data.created_at };
```

- [ ] **Step 3: Incluir `card_id` en el whitelist de update**

En `updateTransaction`, junto a los demás campos:

```js
    if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId || null;
```

- [ ] **Step 4: Importaciones masivas sin tarjeta**

En `bulkAddTransactions`, en el `map` a `dbTxs`, añade `card_id: null,` (las importaciones no traen tarjeta). Y en el `set` local de `newTxs`, añade `cardId: d.card_id || null,`.

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 6: Commit**

```bash
git add src/stores/useTransactionStore.js
git commit -m "feat: persist card_id on transactions"
```

---

## Task 5: Ruta lazy y carga inicial en App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Importar el store y declarar la página lazy**

Junto a los demás imports de stores:

```js
import useCreditCardStore from './stores/useCreditCardStore';
```

Junto a las demás páginas lazy:

```js
const CreditCardsPage = lazy(() => import('./pages/CreditCardsPage'));
```

- [ ] **Step 2: Cargar las tarjetas al iniciar sesión**

Añade el selector junto a los demás `fetch*`:

```js
  const fetchCards = useCreditCardStore((state) => state.fetchCards);
```

Y dentro del `useEffect` que corre cuando hay `user`, añade `fetchCards();` y agrégalo al arreglo de dependencias:

```js
  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchTransactions();
      fetchBudgets();
      fetchGoals();
      fetchDebtsAndPayments();
      fetchPlans();
      fetchCards();
    }
  }, [user, fetchCategories, fetchTransactions, fetchBudgets, fetchGoals, fetchDebtsAndPayments, fetchPlans, fetchCards]);
```

- [ ] **Step 3: Añadir la ruta**

Dentro de `<Routes>`, junto a las demás rutas anidadas:

```jsx
          <Route path="tarjetas" element={<CreditCardsPage />} />
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso (aparece un chunk `CreditCardsPage`).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire credit cards route and initial fetch"
```

---

## Task 6: Entrada en el menú lateral

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Añadir el ítem de navegación**

En el arreglo `navItems`, dentro de la sección 'Patrimonio', añade la entrada de Tarjetas después de 'Deudas' (el icono `CreditCard` ya está importado):

```js
  { section: 'Patrimonio' },
  { path: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { path: '/deudas', label: 'Deudas', icon: CreditCard },
  { path: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { path: '/plan', label: 'Plan Financiero', icon: Target },
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat: add Tarjetas entry to sidebar"
```

---

## Task 7: Página `CreditCardsPage`

**Files:**
- Create: `src/pages/CreditCardsPage.jsx`

- [ ] **Step 1: Crear la página**

Crea `src/pages/CreditCardsPage.jsx`:

```jsx
// FinTrack — Credit Cards Page

import { useState, useMemo } from 'react';
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import useCreditCardStore from '../stores/useCreditCardStore';
import useTransactionStore from '../stores/useTransactionStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCardCycles, getStatementAmount, isStatementPaid } from '../utils/creditCards';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

const emptyForm = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#6366f1' };

export default function CreditCardsPage() {
  const { cards, addCard, updateCard, deleteCard, markStatementPaid } = useCreditCardStore();
  const { transactions } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (card) => {
    setForm({ name: card.name, bank: card.bank, cutoffDay: String(card.cutoffDay), dueDay: String(card.dueDay), color: card.color });
    setEditingId(card.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = { name: form.name, bank: form.bank, cutoffDay, dueDay, color: form.color };
    if (editingId) updateCard(editingId, payload);
    else addCard(payload);
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const rows = useMemo(() => {
    return cards.map((card) => {
      const cy = getCardCycles(card, new Date());
      const openAmount = getStatementAmount(transactions, card.id, cy.openStartISO, cy.openEndISO);
      const closedAmount = getStatementAmount(transactions, card.id, cy.closedStartISO, cy.closedEndISO);
      const paid = isStatementPaid(card, cy.closedEndISO);
      return { card, cy, openAmount, closedAmount, paid };
    });
  }, [cards, transactions]);

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Tarjetas</h1>
          <p className="page-subtitle">Control de consumo y fechas de tus tarjetas de crédito</p>
        </div>
        {cards.length > 0 && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nueva Tarjeta
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin tarjetas aún"
          description="Agrega una tarjeta para llevar el control de su consumo y fechas de corte y pago."
          action={
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Agregar Tarjeta
            </button>
          }
        />
      ) : (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {rows.map(({ card, cy, openAmount, closedAmount, paid }) => (
            <div key={card.id} className="card" style={{ '--kpi-accent': card.color }}>
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <CreditCard size={18} style={{ color: card.color }} />
                  {card.name}
                </h3>
                <div className="flex items-center gap-1">
                  <button className="btn-icon" onClick={() => openEdit(card)} title="Editar"><Edit3 size={15} /></button>
                  <button className="btn-icon" onClick={() => setShowDeleteConfirm(card.id)} title="Eliminar" style={{ color: 'var(--color-danger)' }}><Trash2 size={15} /></button>
                </div>
              </div>

              {card.bank && <div className="text-xs text-muted mb-4">{card.bank}</div>}

              <div className="flex flex-col gap-4">
                <div>
                  <div className="kpi-label">Ciclo abierto (consumo)</div>
                  <div className="kpi-value">{formatCurrency(openAmount)}</div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar size={12} /> Cierra el {formatDate(cy.openEndISO)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  <div className="kpi-label">Estado de cuenta {paid ? '(pagado)' : 'por pagar'}</div>
                  <div className="kpi-value" style={{ color: paid ? 'var(--color-success)' : 'var(--text-primary)' }}>
                    {formatCurrency(closedAmount)}
                  </div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-1">
                    <Calendar size={12} /> Vence el {formatDate(cy.dueDateISO)}
                  </div>
                  {!paid && closedAmount > 0 && (
                    <button
                      className="btn btn-secondary btn-sm mt-4"
                      onClick={() => markStatementPaid(card.id, cy.closedEndISO)}
                    >
                      <CheckCircle2 size={14} /> Marcar como pagado
                    </button>
                  )}
                  {paid && (
                    <div className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                      <CheckCircle2 size={14} /> Pagado
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }}
        title={editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Visa Clásica" required />
          </div>
          <div className="form-group">
            <label className="form-label">Banco</label>
            <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej: Banco Popular" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Día de corte *</label>
              <input type="number" min="1" max="31" value={form.cutoffDay} onChange={(e) => setForm({ ...form, cutoffDay: e.target.value })} placeholder="20" required />
            </div>
            <div className="form-group">
              <label className="form-label">Día de pago *</label>
              <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="5" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid var(--text-primary)' : '2px solid var(--border-secondary)',
                    cursor: 'pointer',
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Agregar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => { deleteCard(showDeleteConfirm); setShowDeleteConfirm(null); }}
        title="Eliminar Tarjeta"
        message="¿Seguro que quieres eliminar esta tarjeta? Tus transacciones no se borran; solo se les quita la etiqueta de tarjeta."
      />
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CreditCardsPage.jsx
git commit -m "feat: add Tarjetas page (cards, cycles, mark paid)"
```

---

## Task 8: Selector de tarjeta en el formulario de transacción

**Files:**
- Modify: `src/pages/TransactionsPage.jsx`

- [ ] **Step 1: Importar el store de tarjetas**

Junto a los otros imports de stores:

```js
import useCreditCardStore from '../stores/useCreditCardStore';
```

Dentro del componente, junto a `const { categories } = useCategoryStore();`:

```js
  const { cards } = useCreditCardStore();
```

- [ ] **Step 2: Añadir `cardId` al estado del formulario**

En el `useState` inicial de `form` y en `resetForm`, añade `cardId: ''` (en ambos objetos), junto a los demás campos:

```js
    date: todayISO(),
    amount: '',
    type: 'expense',
    categoryId: '',
    cardId: '',
    description: '',
    notes: '',
    currency: 'DOP',
    isRecurring: false,
    recurrencePattern: 'monthly',
```

- [ ] **Step 3: Añadir el selector de tarjeta (solo para gastos)**

Justo después del `</div>` que cierra el `form-group` de "Categoría" (el `<select>` de categoryId) y antes del `form-group` de "Notas", añade:

```jsx
          {form.type === 'expense' && cards.length > 0 && (
            <div className="form-group">
              <label className="form-label">Tarjeta (opcional)</label>
              <select
                value={form.cardId}
                onChange={(e) => setForm({ ...form, cardId: e.target.value })}
              >
                <option value="">Sin tarjeta / efectivo</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.bank ? ` — ${c.bank}` : ''}</option>
                ))}
              </select>
            </div>
          )}
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TransactionsPage.jsx
git commit -m "feat: tag expense transactions with a credit card"
```

---

## Task 9: Aviso de pago próximo en el Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Importar lo necesario**

Junto a los imports de stores:

```js
import useCreditCardStore from '../stores/useCreditCardStore';
```

Junto a los imports de utilidades de tarjetas (añade una línea nueva):

```js
import { getCardCycles, getStatementAmount, isStatementPaid } from '../utils/creditCards';
```

El icono `CreditCard` y las funciones `formatCurrency`/`formatDate` ya están importados en este archivo — no los dupliques.

- [ ] **Step 2: Calcular avisos de pago**

Dentro del componente, junto a los otros hooks de store:

```js
  const cards = useCreditCardStore((s) => s.cards);
```

Después del `summary` (o junto a los demás `useMemo`), añade:

```js
  const cardAlerts = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cards
      .map((card) => {
        const cy = getCardCycles(card, today);
        const amount = getStatementAmount(transactions, card.id, cy.closedStartISO, cy.closedEndISO);
        const due = new Date(cy.dueDateISO + 'T00:00:00');
        const days = Math.round((due - todayMidnight) / 86400000);
        return { card, amount, dueISO: cy.dueDateISO, days, paid: isStatementPaid(card, cy.closedEndISO) };
      })
      .filter((a) => !a.paid && a.amount > 0 && a.days >= 0 && a.days <= 5);
  }, [cards, transactions]);
```

- [ ] **Step 3: Renderizar el banner de aviso**

Justo después del bloque del héroe "Puedes gastar" (el `<div>` con `kpi-label` "💚 Puedes gastar este mes"), añade:

```jsx
      {cardAlerts.map((a) => (
        <div key={a.card.id} className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>
          <CreditCard size={16} />
          <span>
            <strong>{a.card.name}</strong>: pago de {formatCurrency(a.amount)} vence {a.days === 0 ? 'hoy' : `en ${a.days} día${a.days === 1 ? '' : 's'}`} ({formatDate(a.dueISO)}).
          </span>
        </div>
      ))}
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: dashboard alert for upcoming credit-card due dates"
```

---

## Task 10: Limpiar caché de tarjetas en "Borrar datos"

**Files:**
- Modify: `src/pages/SettingsPage.jsx`

- [ ] **Step 1: Borrar también las tarjetas**

En `handleClearData`, dentro del `Promise.all`, añade el borrado en Supabase:

```js
        supabase.from('credit_cards').delete().eq('user_id', user.id),
```

Y junto a los `localStorage.removeItem(...)`, añade:

```js
    localStorage.removeItem('fintrack-cards-cache');
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: 0 problemas; build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.jsx
git commit -m "chore: clear credit-cards cache on data wipe"
```

---

## Task 11: Verificación manual end-to-end (requiere la migración de la Task 1)

- [ ] **Step 1: Ejecutar la app**

Run: `npm run dev`

- [ ] **Step 2: Probar el flujo completo**

1. Ir a **Tarjetas** → crear una tarjeta (nombre, banco, día de corte, día de pago, color). Aparece en la lista.
2. Ir a **Transacciones** → nueva transacción tipo Gasto → aparece el selector "Tarjeta" → asociarla a la tarjeta. Guardar.
3. Volver a **Tarjetas** → el consumo del ciclo abierto refleja ese gasto; el estado de cuenta y las fechas se ven correctos.
4. Verificar en **Presupuesto/Dashboard** que "Puedes gastar" NO cambió su lógica (el gasto cuenta igual que cualquier gasto).
5. Si hay un estado de cuenta por pagar próximo a vencer, el **Dashboard** muestra el aviso. Pulsar "Marcar como pagado" en Tarjetas → el aviso desaparece.

Detén el server al terminar (Ctrl+C).

---

## Fuera de alcance (no implementar)

- Límite de crédito / % de uso del cupo.
- Balance que carga interés (modelo "deuda").
- Registrar el pago del estado de cuenta como gasto/movimiento de caja.
