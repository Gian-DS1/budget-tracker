# Abonos parciales en tarjetas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar pagos parciales (abonos) de monto libre a una tarjeta de crédito, mostrando el saldo derivado (por pagar / ciclo abierto / saldo total) y arrastrando lo no pagado al mes siguiente, sin doble conteo con el presupuesto.

**Architecture:** El saldo deja de ser un flag y pasa a derivarse de las transacciones y de un libro de abonos. `getCardBalances()` (función pura) calcula `billed − paid` y derivados. Los abonos se guardan en una columna jsonb `payments` de `credit_cards`. El total abonado se deriva de dos libros disjuntos: `payments` (nuevos) + `paidCycles` (legados, convertidos por `paidCyclesToPayments`). No hay escrituras de migración.

**Tech Stack:** React 19, Zustand, Supabase (Postgres jsonb), Vitest, lucide-react. Spec: [docs/superpowers/specs/2026-05-31-abonos-parciales-tarjetas-design.md](../specs/2026-05-31-abonos-parciales-tarjetas-design.md).

---

## Estructura de archivos

- `src/utils/creditCards.js` — **Modificar.** Añadir `paidCyclesToPayments`, `getCardBalances`; cambiar firma de `getLifetimeCashback` a `(card, transactions)`. Helper privado `statementStartForEnd`.
- `src/utils/creditCards.test.js` — **Modificar.** Tests nuevos para lo anterior; actualizar los de `getLifetimeCashback`.
- `src/stores/useCreditCardStore.js` — **Modificar.** `payments` en `mapFromDb`; reemplazar `markStatementPaid` por `addCardPayment` y `deleteCardPayment`.
- `src/pages/CreditCardsPage.jsx` — **Modificar.** UI de 3 balances, modal de abono, historial de abonos.
- `src/pages/DashboardPage.jsx` — **Modificar.** Alertas de vencimiento usan `getCardBalances`.
- `src/components/layout/Header.jsx` — **Modificar.** Recordatorios usan `getCardBalances`.
- Supabase — **Migración SQL.** Columna `payments jsonb not null default '[]'`.

---

## Task 1: Migración SQL (columna `payments`)

**Files:**
- Ejecutar en el editor SQL de Supabase (no es un archivo del repo).

- [ ] **Step 1: Ejecutar la migración**

En Supabase → SQL Editor, ejecutar:

```sql
alter table public.credit_cards
  add column if not exists payments jsonb not null default '[]'::jsonb;
```

- [ ] **Step 2: Verificar la columna**

Ejecutar y confirmar que devuelve una fila:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'credit_cards' and column_name = 'payments';
```

Esperado: `payments | jsonb | '[]'::jsonb`.

- [ ] **Step 3: Documentar (opcional, sigue el patrón del repo)**

Si existe un archivo de notas de Supabase en el repo (commits previos documentan columnas como `catalog_id`), añadir una línea describiendo `payments`. Si no existe, omitir.

> No hay commit de código en esta tarea (cambio solo en la base de datos).

---

## Task 2: `paidCyclesToPayments` + helper `statementStartForEnd`

Convierte estados de cuenta legados (`paidCycles`) en abonos equivalentes, para que el saldo derivado cuadre sin reescribir nada.

**Files:**
- Modify: `src/utils/creditCards.js`
- Test: `src/utils/creditCards.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `src/utils/creditCards.test.js`. Primero actualizar la línea de import (línea 2) para incluir las funciones nuevas:

```js
import { getCardCycles, getStatementAmount, isStatementPaid, computeCashback, getStatementHistory, getLifetimeCashback, paidCyclesToPayments, getCardBalances } from './creditCards';
```

Luego añadir el bloque de tests:

```js
describe('paidCyclesToPayments', () => {
  it('convierte entradas objeto usando su monto guardado', () => {
    const card = { id: 'c1', cutoffDay: 20, paidCycles: [
      { cycleEnd: '2026-04-20', amount: 8000, cashback: 200, paidAt: '2026-05-01' },
    ] };
    const out = paidCyclesToPayments(card, []);
    expect(out).toEqual([
      { id: 'mig-2026-04-20', amount: 8000, date: '2026-05-01', note: 'Migrado: estado de cuenta pagado' },
    ]);
  });

  it('reconstruye el monto de entradas string legado desde las transacciones', () => {
    const card = { id: 'c1', cutoffDay: 20, paidCycles: ['2026-04-20'] };
    // Ventana del ciclo que cierra el 2026-04-20: (2026-03-21 .. 2026-04-20)
    const txs = [
      { cardId: 'c1', date: '2026-04-10', amount: 3000, cashbackEarned: 0 },
      { cardId: 'c1', date: '2026-05-10', amount: 9999, cashbackEarned: 0 }, // fuera de la ventana
    ];
    const out = paidCyclesToPayments(card, txs);
    expect(out).toEqual([
      { id: 'mig-2026-04-20', amount: 3000, date: '2026-04-20', note: 'Migrado: estado de cuenta pagado' },
    ]);
  });

  it('descarta entradas que dan monto 0 y soporta tarjetas sin paidCycles', () => {
    expect(paidCyclesToPayments({ id: 'c1', cutoffDay: 20, paidCycles: ['2026-04-20'] }, [])).toEqual([]);
    expect(paidCyclesToPayments({ id: 'c1', cutoffDay: 20 }, [])).toEqual([]);
    expect(paidCyclesToPayments(null, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/utils/creditCards.test.js`
Expected: FAIL — `paidCyclesToPayments is not a function` (y `getCardBalances`).

- [ ] **Step 3: Implementar `statementStartForEnd` y `paidCyclesToPayments`**

En `src/utils/creditCards.js`, después de la función `getStatementCashback` (≈ línea 85) y antes de `normalizePaidEntry`, añadir el helper privado y el constante:

```js
const EPOCH_ISO = '0000-01-01';
const PAID_EPSILON = 0.01;

// Inicio del período de un estado de cuenta que cierra en `endISO` (un día de
// corte): el día siguiente al corte anterior. Reutiliza dayInMonth/addDaysISO.
function statementStartForEnd(card, endISO) {
  const end = new Date(endISO + 'T00:00:00');
  const cutoff = Number(card.cutoffDay);
  const prevCutoff = dayInMonth(end.getFullYear(), end.getMonth() - 1, cutoff);
  return addDaysISO(toISODate(prevCutoff), 1);
}
```

Después de `normalizePaidEntry` (≈ línea 107), añadir:

```js
/**
 * Convierte los estados de cuenta legados (`paidCycles`) en abonos equivalentes
 * { id, amount, date, note }. Permite derivar el saldo sin reescribir la base de
 * datos: estos abonos legados y los abonos nuevos (`card.payments`) son conjuntos
 * disjuntos, porque tras esta feature ya no se escribe `paidCycles`.
 * Para entradas string legado (sin monto) reconstruye el monto del estado de
 * cuenta desde las transacciones del período. Descarta las que dan monto ≤ 0.
 */
export function paidCyclesToPayments(card, transactions = []) {
  if (!card || !Array.isArray(card.paidCycles)) return [];
  return card.paidCycles
    .map((p) => {
      const n = normalizePaidEntry(p);
      if (!n || !n.cycleEnd) return null;
      let amount = Number(n.amount) || 0;
      if (amount <= 0) {
        const periodEnd = n.periodEnd || n.cycleEnd;
        const periodStart = n.periodStart || statementStartForEnd(card, periodEnd);
        const gross = getStatementAmount(transactions, card.id, periodStart, periodEnd);
        const cashback = getStatementCashback(transactions, card.id, periodStart, periodEnd);
        amount = gross - cashback;
      }
      return {
        id: `mig-${n.cycleEnd}`,
        amount,
        date: n.paidAt || n.cycleEnd,
        note: 'Migrado: estado de cuenta pagado',
      };
    })
    .filter((e) => e && e.amount > 0);
}
```

- [ ] **Step 4: Correr los tests de `paidCyclesToPayments`**

Run: `npx vitest run src/utils/creditCards.test.js -t paidCyclesToPayments`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "feat(tarjetas): paidCyclesToPayments para derivar abonos legados"
```

---

## Task 3: `getCardBalances`

Función pura que calcula todas las cifras derivadas del saldo de una tarjeta.

**Files:**
- Modify: `src/utils/creditCards.js`
- Test: `src/utils/creditCards.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `src/utils/creditCards.test.js`:

```js
describe('getCardBalances', () => {
  const card = { id: 'c1', cutoffDay: 20, dueDay: 5, payments: [] };
  const ref = new Date(2026, 4, 28); // corte 2026-05-20, pago 2026-06-05

  it('caso clienta: paga al corte, arrastra el ciclo abierto', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 }, // facturado
      { cardId: 'c1', date: '2026-05-25', amount: 5000, cashbackEarned: 0 },  // ciclo abierto
    ];
    const b0 = getCardBalances(card, txs, ref);
    expect(b0.billed).toBe(10000);
    expect(b0.open).toBe(5000);
    expect(b0.pendingBilled).toBe(10000);
    expect(b0.openCycle).toBe(5000);
    expect(b0.totalBalance).toBe(15000);
    expect(b0.isPaid).toBe(false);

    const paidCard = { ...card, payments: [{ id: 'a1', amount: 10000, date: '2026-05-21' }] };
    const b1 = getCardBalances(paidCard, txs, ref);
    expect(b1.pendingBilled).toBe(0);
    expect(b1.isPaid).toBe(true);
    expect(b1.openCycle).toBe(5000);
    expect(b1.totalBalance).toBe(5000);
  });

  it('caso sobregasto: abono parcial deja saldo arrastrado', () => {
    const txs = [{ cardId: 'c1', date: '2026-05-10', amount: 20000, cashbackEarned: 0 }];
    const c1 = { ...card, payments: [{ id: 'a1', amount: 12000, date: '2026-05-21' }] };
    expect(getCardBalances(c1, txs, ref).pendingBilled).toBe(8000);
    const c2 = { ...card, payments: [
      { id: 'a1', amount: 12000, date: '2026-05-21' },
      { id: 'a2', amount: 3000, date: '2026-05-28' },
    ] };
    expect(getCardBalances(c2, txs, ref).pendingBilled).toBe(5000);
  });

  it('sobre-abono (prepago): el excedente reduce el ciclo abierto, nada negativo', () => {
    const txs = [
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 },
      { cardId: 'c1', date: '2026-05-25', amount: 5000, cashbackEarned: 0 },
    ];
    const c = { ...card, payments: [{ id: 'a1', amount: 12000, date: '2026-05-21' }] };
    const b = getCardBalances(c, txs, ref);
    expect(b.pendingBilled).toBe(0);
    expect(b.overpay).toBe(2000);
    expect(b.openCycle).toBe(3000);
    expect(b.totalBalance).toBe(3000);
  });

  it('spansMultipleCycles cuando hay saldo de meses anteriores sin pagar', () => {
    const txs = [
      { cardId: 'c1', date: '2026-03-10', amount: 5000, cashbackEarned: 0 },  // ciclo viejo
      { cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 0 }, // ciclo actual
    ];
    expect(getCardBalances({ ...card }, txs, ref).spansMultipleCycles).toBe(true);
    const conAbono = { ...card, payments: [{ id: 'a1', amount: 5000, date: '2026-05-21' }] };
    expect(getCardBalances(conAbono, txs, ref).spansMultipleCycles).toBe(false);
  });

  it('descuenta el cashback del monto facturado', () => {
    const txs = [{ cardId: 'c1', date: '2026-05-10', amount: 10000, cashbackEarned: 300 }];
    expect(getCardBalances(card, txs, ref).billed).toBe(9700);
    expect(getCardBalances(card, txs, ref).pendingBilled).toBe(9700);
  });

  it('un paidCycle legado cuenta como abonado (saldo cuadra)', () => {
    const txs = [{ cardId: 'c1', date: '2026-04-10', amount: 8000, cashbackEarned: 0 }];
    const legacy = { id: 'c1', cutoffDay: 20, dueDay: 5, payments: [],
      paidCycles: [{ cycleEnd: '2026-04-20', amount: 8000, paidAt: '2026-05-01' }] };
    const b = getCardBalances(legacy, txs, ref);
    expect(b.billed).toBe(8000);
    expect(b.paid).toBe(8000);
    expect(b.pendingBilled).toBe(0);
    expect(b.isPaid).toBe(true);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/utils/creditCards.test.js -t getCardBalances`
Expected: FAIL — `getCardBalances is not a function`.

- [ ] **Step 3: Implementar `getCardBalances`**

En `src/utils/creditCards.js`, después de `paidCyclesToPayments`, añadir:

```js
/**
 * Saldo derivado de una tarjeta (todo neto de cashback, en DOP). Fuente única de
 * verdad para la página de Tarjetas, el Dashboard y los recordatorios del Header.
 *
 *   billed  = Σ consumo con date ≤ corte           (todo lo facturado)
 *   open    = Σ consumo en (corte, próximo corte]   (ciclo abierto, sin cortar)
 *   paid    = Σ abonos nuevos + Σ paidCycles legados (conjuntos disjuntos)
 *
 *   pendingBilled = max(0, billed − paid)   → deuda urgente (incluye arrastrado)
 *   openCycle     = max(0, open − overpay)  → consumo nuevo (overpay = prepago)
 *   totalBalance  = max(0, billed + open − paid)
 *   isPaid        = (billed − paid) ≤ EPSILON
 *
 * Un abono nunca es un gasto del presupuesto: solo liquida este saldo. El gasto
 * ya se contó al registrar cada consumo (modelo de devengo).
 */
export function getCardBalances(card, transactions = [], refDate = new Date()) {
  const cycles = getCardCycles(card, refDate);

  const billed =
    getStatementAmount(transactions, card.id, EPOCH_ISO, cycles.closedEndISO) -
    getStatementCashback(transactions, card.id, EPOCH_ISO, cycles.closedEndISO);

  const open =
    getStatementAmount(transactions, card.id, cycles.openStartISO, cycles.openEndISO) -
    getStatementCashback(transactions, card.id, cycles.openStartISO, cycles.openEndISO);

  const abonos = Array.isArray(card.payments) ? card.payments : [];
  const paidFromAbonos = abonos.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const paidFromLegacy = paidCyclesToPayments(card, transactions).reduce((s, p) => s + p.amount, 0);
  const paid = paidFromAbonos + paidFromLegacy;

  const pendingBilled = Math.max(0, billed - paid);
  const overpay = Math.max(0, paid - billed);
  const openCycle = Math.max(0, open - overpay);
  const totalBalance = Math.max(0, billed + open - paid);
  const isPaid = billed - paid <= PAID_EPSILON;

  const closedStatementNet =
    getStatementAmount(transactions, card.id, cycles.closedStartISO, cycles.closedEndISO) -
    getStatementCashback(transactions, card.id, cycles.closedStartISO, cycles.closedEndISO);
  const spansMultipleCycles = pendingBilled > closedStatementNet + PAID_EPSILON;

  return {
    cycles,
    billed, open, paid, overpay,
    pendingBilled, openCycle, totalBalance,
    closedStatementNet, spansMultipleCycles, isPaid,
  };
}
```

- [ ] **Step 4: Correr los tests**

Run: `npx vitest run src/utils/creditCards.test.js -t getCardBalances`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "feat(tarjetas): getCardBalances con saldo derivado y arrastre"
```

---

## Task 4: Nueva firma de `getLifetimeCashback`

El cashback de por vida pasa a calcularse de las transacciones (no de `paidCycles`).

**Files:**
- Modify: `src/utils/creditCards.js:137-139`
- Test: `src/utils/creditCards.test.js:72-80`

- [ ] **Step 1: Actualizar los tests existentes**

En `src/utils/creditCards.test.js`, reemplazar el test "suma el cashback acumulado de por vida" (≈ líneas 72-75) y el assert de `getLifetimeCashback` dentro de "devuelve vacío/0" (≈ línea 79) por:

```js
  it('suma el cashback de por vida desde las transacciones de la tarjeta', () => {
    const txs = [
      { cardId: 'c1', cashbackEarned: 12.5 },
      { cardId: 'c1', cashbackEarned: 30 },
      { cardId: 'c2', cashbackEarned: 99 },
    ];
    expect(getLifetimeCashback({ id: 'c1' }, txs)).toBe(42.5);
  });

  it('devuelve vacío/0 si no hay historial', () => {
    expect(getStatementHistory({})).toEqual([]);
    expect(getLifetimeCashback({})).toBe(0);
    expect(getLifetimeCashback({ id: 'c1' }, [])).toBe(0);
  });
```

- [ ] **Step 2: Correr para verificar que fallan**

Run: `npx vitest run src/utils/creditCards.test.js -t "cashback de por vida"`
Expected: FAIL — el valor viejo sumaba `paidCycles`, no transacciones.

- [ ] **Step 3: Reemplazar la implementación**

En `src/utils/creditCards.js`, reemplazar la función `getLifetimeCashback` (líneas 137-139) y su comentario por:

```js
/**
 * Cashback acumulado de por vida: suma del cashback de TODAS las transacciones de
 * la tarjeta. Se calcula de las transacciones (no de paidCycles), más robusto.
 */
export function getLifetimeCashback(card, transactions = []) {
  if (!card || !card.id) return 0;
  return transactions.reduce(
    (sum, t) => (t.cardId === card.id ? sum + (Number(t.cashbackEarned) || 0) : sum),
    0
  );
}
```

- [ ] **Step 4: Correr todo el archivo de tests**

Run: `npx vitest run src/utils/creditCards.test.js`
Expected: PASS (todos, incluidos getCardCycles, isStatementPaid, getStatementHistory, computeCashback).

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "refactor(tarjetas): getLifetimeCashback desde transacciones"
```

---

## Task 5: Store — `payments`, `addCardPayment`, `deleteCardPayment`

**Files:**
- Modify: `src/stores/useCreditCardStore.js`

> Las acciones del store son async/Supabase; el repo no testea stores. Implementación con verificación manual al final (Task 8 / Task 9).

- [ ] **Step 1: Mapear `payments` en `mapFromDb`**

En `src/stores/useCreditCardStore.js`, dentro de `mapFromDb` (≈ línea 7-18), añadir la propiedad `payments` justo después de `paidCycles`:

```js
  paidCycles: Array.isArray(c.paid_cycles) ? c.paid_cycles : [],
  payments: Array.isArray(c.payments) ? c.payments : [],
```

- [ ] **Step 2: Reemplazar `markStatementPaid` por `addCardPayment` y `deleteCardPayment`**

Eliminar por completo la acción `markStatementPaid` (líneas 102-140, incluido su comentario de bloque) y poner en su lugar:

```js
      // Un abono LIQUIDA el saldo de la tarjeta; nunca es un gasto del presupuesto
      // (el gasto ya se contó al registrar cada consumo). Se guarda en `payments`.
      addCardPayment: async (cardId, { amount, date, note } = {}) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const value = Number(amount) || 0;
        if (value <= 0) return;

        const entry = {
          id: (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`),
          amount: value,
          date: date || todayISO(),
          note: note || '',
        };
        const newPayments = [...(card.payments || []), entry];

        const { error } = await supabase.from('credit_cards').update({ payments: newPayments }).eq('id', cardId);
        if (error) {
          console.error('Add card payment error:', error);
          toast.error('Error al registrar el abono');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, payments: newPayments } : c)),
        }));
        toast.success('Abono registrado');
      },

      deleteCardPayment: async (cardId, paymentId) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const newPayments = (card.payments || []).filter((p) => p.id !== paymentId);

        const { error } = await supabase.from('credit_cards').update({ payments: newPayments }).eq('id', cardId);
        if (error) {
          console.error('Delete card payment error:', error);
          toast.error('Error al eliminar el abono');
          return;
        }
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? { ...c, payments: newPayments } : c)),
        }));
        toast.success('Abono eliminado');
      },
```

> `todayISO` ya está importado en este archivo (línea 5). `supabase` y `toast` también.

- [ ] **Step 3: Verificar que el proyecto compila / linta**

Run: `npm run lint`
Expected: sin errores nuevos en `useCreditCardStore.js`. (`CreditCardsPage.jsx` reportará que `markStatementPaid` ya no existe; se arregla en la Task 6.)

- [ ] **Step 4: Commit**

```bash
git add src/stores/useCreditCardStore.js
git commit -m "feat(tarjetas): addCardPayment/deleteCardPayment y payments en el store"
```

---

## Task 6: UI — página de Tarjetas (3 balances + modal de abono + historial)

**Files:**
- Modify: `src/pages/CreditCardsPage.jsx`

- [ ] **Step 1: Actualizar imports y desestructuración del store**

Reemplazar la línea de import de utils (línea 13):

```js
import { getCardBalances, getLifetimeCashback, paidCyclesToPayments } from '../utils/creditCards';
```

Quitar `Calendar` del import de `lucide-react` (línea 4), porque el nuevo render
ya no lo usa (sí se siguen usando `Plus, CreditCard, Edit3, Trash2, CheckCircle2, History, RotateCcw`):

```js
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, History, RotateCcw } from 'lucide-react';
```

Reemplazar la desestructuración del store (línea 21):

```js
  const { cards, addCard, updateCard, deleteCard, addCardPayment, deleteCardPayment } = useCreditCardStore();
```

- [ ] **Step 2: Añadir estado del modal de abono**

Después de `const [historyCard, setHistoryCard] = useState(null);` (≈ línea 29), añadir:

```js
  const [payingCard, setPayingCard] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoDate, setAbonoDate] = useState(todayISO());
  const [abonoNote, setAbonoNote] = useState('');
```

- [ ] **Step 3: Añadir helpers de abono**

Antes de `const rows = useMemo(...)` (≈ línea 121), añadir:

```js
  const openAbono = (card, prefill) => {
    setPayingCard(card);
    setAbonoAmount(prefill ? String(Math.round(prefill * 100) / 100) : '');
    setAbonoDate(todayISO());
    setAbonoNote('');
  };

  const closeAbono = () => {
    setPayingCard(null);
    setAbonoAmount('');
    setAbonoNote('');
  };

  const handleAbonoSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(abonoAmount);
    if (!payingCard || !amount || amount <= 0) return;
    await addCardPayment(payingCard.id, { amount, date: abonoDate, note: abonoNote });
    closeAbono();
  };
```

- [ ] **Step 4: Reemplazar el `rows = useMemo`**

Reemplazar todo el bloque `const rows = useMemo(() => { ... }, [cards, transactions]);` (líneas 121-141) por:

```js
  const rows = useMemo(() => {
    return cards.map((card) => {
      const bal = getCardBalances(card, transactions, new Date());
      const lifetimeCashback = getLifetimeCashback(card, transactions);
      const abonos = [
        ...(card.payments || []),
        ...paidCyclesToPayments(card, transactions),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return { card, bal, lifetimeCashback, abonos };
    });
  }, [cards, transactions]);
```

- [ ] **Step 5: Reemplazar el render de cada tarjeta**

Reemplazar todo el `.map((...) => (...))` que dibuja las tarjetas (líneas 170-269, desde `{rows.map(({ card, cy, ...`) por:

```jsx
          {rows.map(({ card, bal, lifetimeCashback, abonos }) => (
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
                {/* Ciclo abierto: consumo nuevo, aún sin cortar */}
                <div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Ciclo abierto (consumo)</span>
                    <span className="font-semibold">{formatCurrency(bal.openCycle)}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">Corte al: {formatDate(bal.cycles.openEndISO)}</div>
                </div>

                {/* Por pagar antes del vencimiento: la deuda urgente */}
                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  {bal.isPaid ? (
                    <>
                      <div className="kpi-label">Estado de cuenta</div>
                      <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--color-success)' }}>
                        <CheckCircle2 size={16} /> Pagado
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="kpi-label">Por pagar antes del {formatDate(bal.cycles.dueDateISO)}</div>
                      <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(bal.pendingBilled)}
                      </div>
                      {bal.spansMultipleCycles && (
                        <div className="text-xs text-muted mt-1">Incluye saldo de meses anteriores</div>
                      )}
                      <div className="flex items-center gap-2 mt-4">
                        <button className="btn btn-primary btn-sm" onClick={() => openAbono(card, bal.pendingBilled)}>
                          <CheckCircle2 size={14} /> Pagar todo
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openAbono(card)}>
                          <Plus size={14} /> Abonar
                        </button>
                      </div>
                    </>
                  )}
                  {/* Botón Abonar disponible también cuando está pagado, por si hay ciclo abierto */}
                  {bal.isPaid && bal.openCycle > 0 && (
                    <button className="btn btn-secondary btn-sm mt-3" onClick={() => openAbono(card)}>
                      <Plus size={14} /> Abonar al ciclo abierto
                    </button>
                  )}
                </div>

                {/* Saldo total acumulado de la tarjeta */}
                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Saldo total de la tarjeta</span>
                    <span className="font-bold text-primary">{formatCurrency(bal.totalBalance)}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">Incluye consumo nuevo aún sin cortar</div>
                </div>

                {/* Cashback acumulado e historial de abonos */}
                {(lifetimeCashback > 0 || abonos.length > 0) && (
                  <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="kpi-label" style={{ marginBottom: 2 }}>Cashback acumulado</div>
                        <div className="font-bold" style={{ color: 'var(--color-income)' }}>
                          +{formatCurrency(lifetimeCashback)}
                        </div>
                      </div>
                      {abonos.length > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setHistoryCard(card)}>
                          <History size={14} /> Abonos ({abonos.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
```

- [ ] **Step 6: Reemplazar el modal de Historial**

Reemplazar el `<Modal isOpen={!!historyCard} ...>...</Modal>` completo (líneas 444-481) por uno que liste abonos con opción de borrar los reales:

```jsx
      {/* Historial de abonos */}
      <Modal
        isOpen={!!historyCard}
        onClose={() => setHistoryCard(null)}
        title={historyCard ? `Abonos — ${historyCard.name}` : 'Abonos'}
      >
        {historyCard && (() => {
          const lifetime = getLifetimeCashback(historyCard, transactions);
          const abonos = [
            ...(historyCard.payments || []),
            ...paidCyclesToPayments(historyCard, transactions),
          ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
          return (
            <>
              <div className="flex justify-between items-center mb-4 p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span className="text-sm text-muted">Cashback acumulado de por vida</span>
                <span className="font-bold" style={{ color: 'var(--color-income)' }}>+{formatCurrency(lifetime)}</span>
              </div>
              {abonos.length === 0 ? (
                <div className="text-sm text-muted">Aún no hay abonos registrados.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {abonos.map((a) => {
                    const isLegacy = String(a.id).startsWith('mig-');
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <div className="font-semibold text-sm">{formatDate(a.date)}</div>
                          <div className="text-xs text-muted">{a.note || (isLegacy ? 'Estado de cuenta pagado' : 'Abono')}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold amount-positive">{formatCurrency(a.amount)}</span>
                          {!isLegacy && (
                            <button
                              className="btn-icon"
                              title="Eliminar abono"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => deleteCardPayment(historyCard.id, a.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </Modal>
```

- [ ] **Step 7: Añadir el modal de Abono**

Justo antes del `<ConfirmDialog ...>` (≈ línea 483), añadir el modal de abono. Usa `CurrencyInput`, que hay que importar:

En los imports (cerca de la línea 11), añadir:

```js
import CurrencyInput from '../components/ui/CurrencyInput';
```

Y el modal:

```jsx
      {/* Modal de abono */}
      <Modal
        isOpen={!!payingCard}
        onClose={closeAbono}
        title={payingCard ? `Abonar — ${payingCard.name}` : 'Abonar'}
      >
        <form onSubmit={handleAbonoSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto del abono *</label>
              <CurrencyInput value={abonoAmount} onChange={(val) => setAbonoAmount(val)} placeholder="0.00" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" value={abonoDate} onChange={(e) => setAbonoDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input type="text" value={abonoNote} onChange={(e) => setAbonoNote(e.target.value)} placeholder="Ej: pago al corte, ingreso extra..." />
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 'var(--space-1)' }}>
            Un abono solo baja el saldo de la tarjeta; no se registra como gasto del presupuesto.
          </p>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeAbono}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Registrar abono</button>
          </div>
        </form>
      </Modal>
```

- [ ] **Step 8: Lint + arranque manual**

Run: `npm run lint`
Expected: sin errores (no debe quedar referencia a `markStatementPaid`, `getCardCycles`, `getStatementAmount`, `isStatementPaid`, `getStatementHistory` en este archivo).

Run: `npm run dev` y abrir la página de Tarjetas. Verificar:
- Una tarjeta con consumo facturado muestra "Por pagar antes del [fecha]", "Saldo total" y "Ciclo abierto".
- "Abonar" abre el modal; registrar un abono parcial baja "Por pagar" y "Saldo total".
- "Pagar todo" deja "Pagado ✓".
- "Abonos (n)" lista los abonos y permite borrar uno (el saldo vuelve a subir).

- [ ] **Step 9: Commit**

```bash
git add src/pages/CreditCardsPage.jsx
git commit -m "feat(tarjetas): UI de abonos parciales con 3 balances e historial"
```

---

## Task 7: Dashboard y Header usan `getCardBalances`

Para que los abonos silencien los recordatorios de "por pagar".

**Files:**
- Modify: `src/pages/DashboardPage.jsx:39` y `:124-139`
- Modify: `src/components/layout/Header.jsx:10` y `:54-69`

- [ ] **Step 1: DashboardPage — actualizar import**

Reemplazar la línea 39:

```js
import { getCardBalances } from '../utils/creditCards';
```

- [ ] **Step 2: DashboardPage — reemplazar `cardAlerts`**

Reemplazar el bloque `const cardAlerts = useMemo(...)` (líneas 124-139) por:

```js
  const cardAlerts = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cards
      .map((card) => {
        const bal = getCardBalances(card, transactions, today);
        const due = new Date(bal.cycles.dueDateISO + 'T00:00:00');
        const days = Math.round((due - todayMidnight) / 86400000);
        return { card, amount: bal.pendingBilled, dueISO: bal.cycles.dueDateISO, days, paid: bal.isPaid };
      })
      .filter((a) => !a.paid && a.amount > 0 && a.days >= 0 && a.days <= 5);
  }, [cards, transactions]);
```

- [ ] **Step 3: Header — actualizar import**

Reemplazar la línea 10:

```js
import { getCardBalances } from '../../utils/creditCards';
```

- [ ] **Step 4: Header — reemplazar el bloque de tarjetas en `reminders`**

Reemplazar el `cards.forEach(...)` (líneas 54-69) por:

```js
    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.pendingBilled <= 0 || bal.isPaid) return;
      const days = daysUntil(bal.cycles.dueDateISO, todayMid);
      if (days != null && days >= 0 && days <= REMINDER_WINDOW_DAYS) {
        items.push({
          id: `card-${card.id}`,
          icon: '💳',
          title: card.name,
          detail: formatCurrency(bal.pendingBilled),
          days,
          dueISO: bal.cycles.dueDateISO,
        });
      }
    });
```

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: sin errores. No deben quedar imports sin usar (`getCardCycles`, `getStatementAmount`, `getStatementCashback`, `isStatementPaid`) en estos dos archivos.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.jsx src/components/layout/Header.jsx
git commit -m "fix(tarjetas): abonos silencian recordatorios en Dashboard y Header"
```

---

## Task 8: Verificación final

**Files:** ninguno (validación).

- [ ] **Step 1: Suite de tests completa**

Run: `npm test`
Expected: PASS, todos los archivos (incluye `creditCards.test.js`, `calculations.test.js`, `recurrence.test.js`, `creditCardCatalog.test.js`, `defaultCategories.test.js`).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errores.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Verificación manual de regresión**

Con `npm run dev`:
- Una cuenta con un estado de cuenta marcado como pagado en el sistema viejo (`paidCycles`) debe seguir mostrándose como "Pagado ✓" (la conversión legada cuadra el saldo).
- El Dashboard y la 🔔 del Header no muestran como "por pagar" una tarjeta cuyo saldo facturado ya fue abonado por completo.

---

## Notas de cierre

- **No-objetivos (confirmados en el spec):** intereses (sería el módulo Deudas), enlace automático "ingreso extra → abono", KPI de deuda-en-tarjetas en el Dashboard.
- **Sin doble conteo:** ningún abono crea transacción ni toca el presupuesto. Documentado en `addCardPayment` y en `getCardBalances`.
