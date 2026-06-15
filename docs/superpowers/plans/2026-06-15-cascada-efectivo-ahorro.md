# Cascada efectivo → ahorro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al pagar una deuda o tarjeta en modo demo, si el efectivo no alcanza, tomar el faltante de una meta de ahorro que el usuario elige (avisando), bloqueando si ni efectivo ni ahorros alcanzan, y registrando el origen para poder revertir el pago exactamente.

**Architecture:** Dos selectores puros (`getCashShortfall`, `canAffordPayment`) calculan el faltante y la viabilidad. Un orquestador en `demoMode.js` aplica el retiro de ahorro (como un **aporte negativo** que reusa `demoAddContribution`) + el pago, y guarda `savingsUsed` en el pago. Un `SavingsPickerModal` pide la meta. Los dos `PaymentModal` (deudas/tarjetas) deciden el flujo en su `submit`. La reversa devuelve el ahorro a su meta. Todo tras `isDemoActive()`.

**Tech Stack:** React 19, Zustand, Vitest, framer-motion, TailwindCSS v4.

**Spec:** [docs/superpowers/specs/2026-06-15-cascada-efectivo-ahorro-design.md](../specs/2026-06-15-cascada-efectivo-ahorro-design.md)

---

## Notas de implementación (leer antes de empezar)

- **Solo demo.** Toda la cascada vive en la rama `if (isDemoActive())`. La rama `else` (store real) NO se toca: el pago real se registra como hoy.
- **El retiro de ahorro = aporte negativo.** `demoAddContribution(goalId, -amount, ...)` baja la meta y, por la fórmula de `getLiquidCash` (savings resta del efectivo), DEVUELVE ese monto al efectivo. Reusa maquinaria ya probada. Cero tipos nuevos.
- **TDD donde aplica:** los selectores puros van con test primero (`selectors.test.js`). El orquestador/modal/reversa reusan funciones ya cubiertas; se verifican con build + inspección visual.
- **i18n es/en** para toda cadena visible nueva.
- **Commits:** español, imperativo.

---

## File Structure

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `src/stitch/screens/dashboard/selectors.js` | Modificar | `getCashShortfall`, `canAffordPayment` (puros). |
| `src/stitch/screens/dashboard/selectors.test.js` | Modificar | Tests de los dos selectores. |
| `src/stitch/demoMode.js` | Modificar | Orquestadores `applyDebtPaymentWithCascade`/`applyCardPaymentWithCascade`; `savingsUsed` en pagos; reversa en delete. |
| `src/stitch/screens/finances/SavingsPickerModal.jsx` | Crear | Modal: elegir la meta de la cual tomar el faltante. |
| `src/stitch/screens/debts/PaymentModal.jsx` | Modificar | Flujo de decisión en submit (cubierto/bloquear/pedir meta). |
| `src/stitch/screens/cards/PaymentModal.jsx` | Modificar | Idem para tarjetas. |
| `src/i18n/translations.js` | Modificar | Claves `cascade.*`. |

---

## Task 1: Selectores `getCashShortfall` y `canAffordPayment`

**Files:**
- Modify: `src/stitch/screens/dashboard/selectors.js`
- Test: `src/stitch/screens/dashboard/selectors.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Añadir `getCashShortfall, canAffordPayment` al import de la línea 2 de [selectors.test.js](../../../src/stitch/screens/dashboard/selectors.test.js):

```javascript
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash, getLiquidDelta, getFirstDataMonth, getCumulativeLiquidWealth, getCashShortfall, canAffordPayment } from './selectors';
```

Añadir al final del archivo:

```javascript
describe('getCashShortfall', () => {
  it('pago cubierto por el efectivo → shortfall 0', () => {
    // efectivo: saldo inicial 5000, sin movimientos.
    const r = getCashShortfall([], 5000, [], 3000);
    expect(r.available).toBe(5000);
    expect(r.shortfall).toBe(0);
  });

  it('pago mayor que el efectivo → shortfall = diferencia', () => {
    const r = getCashShortfall([], 5000, [], 8000);
    expect(r.available).toBe(5000);
    expect(r.shortfall).toBe(3000);
  });

  it('considera los movimientos en el efectivo disponible', () => {
    // efectivo: 5000 + 1000 income = 6000; pago 7000 → falta 1000.
    const txs = [{ categoryId: 'c1', amount: 1000, type: 'income', cashbackEarned: 0 }];
    const r = getCashShortfall(txs, 5000, [], 7000);
    expect(r.available).toBe(6000);
    expect(r.shortfall).toBe(1000);
  });
});

describe('canAffordPayment', () => {
  it('alcanza cuando efectivo + ahorros ≥ pago', () => {
    expect(canAffordPayment(5000, 10000, 12000)).toBe(true);
  });

  it('no alcanza cuando efectivo + ahorros < pago', () => {
    expect(canAffordPayment(5000, 4000, 12000)).toBe(false);
  });

  it('límite exacto cuenta como alcanza', () => {
    expect(canAffordPayment(5000, 5000, 10000)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npm test -- selectors.test.js`
Expected: FAIL — `getCashShortfall is not a function`.

- [ ] **Step 3: Implementar los selectores**

Añadir al final de [selectors.js](../../../src/stitch/screens/dashboard/selectors.js):

```javascript
// Cuánto falta de efectivo para cubrir un pago. `shortfall` es lo que habría que
// tomar de ahorros; `available` es el efectivo disponible hoy.
export function getCashShortfall(transactions, initialCashBalance, cards, paymentAmount) {
  const available = getLiquidCash(transactions, initialCashBalance, cards);
  const amt = Number(paymentAmount) || 0;
  return { available, shortfall: Math.max(0, amt - available) };
}

// ¿Se puede pagar? (efectivo + ahorros ≥ pago). totalSavings = Σ goal.currentAmount.
export function canAffordPayment(available, totalSavings, paymentAmount) {
  return (Number(available) || 0) + (Number(totalSavings) || 0) >= (Number(paymentAmount) || 0);
}
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npm test -- selectors.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/dashboard/selectors.js src/stitch/screens/dashboard/selectors.test.js
git commit -m "feat(cascada): selectores getCashShortfall y canAffordPayment"
```

---

## Task 2: Orquestador de pago de deuda con cascada

**Files:**
- Modify: `src/stitch/demoMode.js`

**Contexto:** `demoAddDebtPayment(debtId, amount, date, notes)` existe en [demoMode.js:506](../../../src/stitch/demoMode.js#L506) y registra el pago (transacción `fixed_expense` + registro en `payments`). Hay que: (1) añadir el campo `savingsUsed` al pago, (2) crear un orquestador que aplique el retiro de ahorro antes del pago.

- [ ] **Step 1: Añadir `savingsUsed` al registro de pago de deuda**

En `demoAddDebtPayment`, la línea que crea el `payment` ([demoMode.js:523](../../../src/stitch/demoMode.js#L523)):

```javascript
  const payment = { id: demoId(), debtId, amount: value, date, remainingBalance: newBalance, notes: notes || null, transactionId, createdAt: new Date().toISOString() };
```

Añadir un parámetro `savingsUsed = []` a la firma de la función y guardarlo en el pago:

```javascript
export function demoAddDebtPayment(debtId, amount, date, notes = '', savingsUsed = []) {
```

y en el objeto `payment`:

```javascript
  const payment = { id: demoId(), debtId, amount: value, date, remainingBalance: newBalance, notes: notes || null, transactionId, savingsUsed, createdAt: new Date().toISOString() };
```

- [ ] **Step 2: Crear el orquestador de deuda**

Añadir, justo después de `demoAddDebtPayment` (antes de `demoDeleteDebtPayment`):

```javascript
// Aplica un pago de deuda con cascada: si `savingsPick` ({ goalId, amount }) no es
// null, primero retira ese monto del ahorro (aporte negativo, que devuelve efectivo
// vía getLiquidCash) y luego registra el pago, anotando savingsUsed para la reversa.
export function applyDebtPaymentWithCascade(debtId, amount, date, notes, savingsPick) {
  const savingsUsed = [];
  if (savingsPick && savingsPick.amount > 0) {
    demoAddContribution(savingsPick.goalId, -Math.abs(savingsPick.amount), date, 'Retiro para pago de deuda');
    savingsUsed.push({ goalId: savingsPick.goalId, amount: Math.abs(savingsPick.amount) });
  }
  return demoAddDebtPayment(debtId, amount, date, notes, savingsUsed);
}
```

- [ ] **Step 3: Reversa — devolver el ahorro al borrar el pago**

En `demoDeleteDebtPayment` ([demoMode.js:530](../../../src/stitch/demoMode.js#L530)), justo después de obtener `payment` y antes de borrar la transacción, devolver el ahorro:

```javascript
export function demoDeleteDebtPayment(paymentId) {
  const { payments, debts } = useDebtStore.getState();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return { ok: false };
  // Reversa de cascada: devuelve a cada meta lo que el pago tomó del ahorro.
  for (const s of payment.savingsUsed || []) {
    demoAddContribution(s.goalId, Math.abs(s.amount), payment.date, 'Reversa de retiro por pago');
  }
  const debt = debts.find((d) => d.id === payment.debtId);
  // ... (resto igual)
```

(El resto de la función no cambia.)

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/demoMode.js
git commit -m "feat(cascada): orquestador de pago de deuda + reversa de ahorro"
```

---

## Task 3: Orquestador de pago de tarjeta con cascada

**Files:**
- Modify: `src/stitch/demoMode.js`

**Contexto:** `demoAddCardPayment(cardId, { amount, date, note })` existe en [demoMode.js:427](../../../src/stitch/demoMode.js#L427) y añade una entrada a `card.payments`. `demoDeleteCardPayment(cardId, paymentId)` la quita ([demoMode.js:436](../../../src/stitch/demoMode.js#L436)).

- [ ] **Step 1: Añadir `savingsUsed` a la entrada de pago de tarjeta**

En `demoAddCardPayment`, la línea que crea `entry` ([demoMode.js:430](../../../src/stitch/demoMode.js#L430)):

```javascript
  const entry = { id: demoId(), amount: value, date: date || iso(new Date()), note: note || '' };
```

Añadir `savingsUsed` (vía un 5º campo en el payload) — cambiar la firma para aceptarlo:

```javascript
export function demoAddCardPayment(cardId, { amount, date, note, savingsUsed = [] } = {}) {
```

y en `entry`:

```javascript
  const entry = { id: demoId(), amount: value, date: date || iso(new Date()), note: note || '', savingsUsed };
```

- [ ] **Step 2: Crear el orquestador de tarjeta**

Añadir después de `demoAddCardPayment`:

```javascript
// Aplica un pago de tarjeta con cascada (ver applyDebtPaymentWithCascade).
export function applyCardPaymentWithCascade(cardId, { amount, date, note }, savingsPick) {
  const savingsUsed = [];
  if (savingsPick && savingsPick.amount > 0) {
    demoAddContribution(savingsPick.goalId, -Math.abs(savingsPick.amount), date, 'Retiro para pago de tarjeta');
    savingsUsed.push({ goalId: savingsPick.goalId, amount: Math.abs(savingsPick.amount) });
  }
  return demoAddCardPayment(cardId, { amount, date, note, savingsUsed });
}
```

- [ ] **Step 3: Reversa en `demoDeleteCardPayment`**

En `demoDeleteCardPayment` ([demoMode.js:436](../../../src/stitch/demoMode.js#L436)), obtener la entrada y devolver su ahorro antes de quitarla:

```javascript
export function demoDeleteCardPayment(cardId, paymentId) {
  const card = useCreditCardStore.getState().cards.find((c) => c.id === cardId);
  const entry = card?.payments?.find((p) => p.id === paymentId);
  for (const s of (entry?.savingsUsed || [])) {
    demoAddContribution(s.goalId, Math.abs(s.amount), entry.date, 'Reversa de retiro por pago');
  }
  useCreditCardStore.setState((s) => ({
    cards: s.cards.map((c) => (c.id === cardId ? { ...c, payments: (c.payments || []).filter((p) => p.id !== paymentId) } : c)),
  }));
}
```

(Reescribe la función actual, que hoy solo filtra el pago; ahora primero revierte el ahorro.)

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/demoMode.js
git commit -m "feat(cascada): orquestador de pago de tarjeta + reversa de ahorro"
```

---

## Task 4: Claves i18n de la cascada

**Files:**
- Modify: `src/i18n/translations.js`

- [ ] **Step 1: Añadir el bloque `cascade` (es)**

Junto al bloque `finances` español (creado antes), añadir:

```javascript
    cascade: {
      shortfallTitle: 'Falta efectivo',
      shortfallBody: 'Te faltan {amt} para cubrir este pago. ¿De qué meta los tomamos?',
      noFunds: 'No tienes fondos suficientes. Disponible {avail} (efectivo + ahorros), necesitas {need}.',
      noSingleGoal: 'Ninguna meta tiene suficiente para cubrir el faltante de {amt}. Reduce el monto del pago.',
      takeFrom: 'Tomar de',
      confirm: 'Confirmar pago',
      usedSavings: 'Se usaron {amt} de "{goal}" para este pago.',
    },
```

- [ ] **Step 2: Añadir el bloque `cascade` (en)**

```javascript
    cascade: {
      shortfallTitle: 'Not enough cash',
      shortfallBody: 'You are {amt} short for this payment. Which goal should we take it from?',
      noFunds: 'Not enough funds. Available {avail} (cash + savings), you need {need}.',
      noSingleGoal: 'No goal has enough to cover the {amt} shortfall. Lower the payment amount.',
      takeFrom: 'Take from',
      confirm: 'Confirm payment',
      usedSavings: 'Used {amt} from "{goal}" for this payment.',
    },
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations.js
git commit -m "feat(i18n): claves de la cascada efectivo-ahorro"
```

---

## Task 5: `SavingsPickerModal`

**Files:**
- Create: `src/stitch/screens/finances/SavingsPickerModal.jsx`

**Contexto:** Modal que muestra el faltante y deja elegir UNA meta con `currentAmount ≥ shortfall`. Reusa `StitchSelect` o una lista de botones. Patrón de modal: ver `debts/PaymentModal.jsx` (usa `Modal`/`Field`/`FormActions` de su `Ui`). Aquí se hace un modal propio simple con el patrón de overlay de `SaveToVaultModal` (ya borrado, pero el patrón está en el historial) — o más simple, reusar el patrón de overlay con framer-motion.

- [ ] **Step 1: Crear el modal**

Crear `src/stitch/screens/finances/SavingsPickerModal.jsx`:

```javascript
// Pide al usuario de qué meta tomar el faltante de efectivo para cubrir un pago.
// Solo lista metas que pueden cubrirlo solas (currentAmount ≥ shortfall), porque no
// repartimos entre metas. Devuelve { goalId, amount: shortfall } al confirmar.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';
import { EASE_OUT } from '../../motionTokens';

const fmt = (n) => formatCurrency(n);

export default function SavingsPickerModal({ open, shortfall, goals, onPick, onClose }) {
  const { t } = useI18n();
  const eligibles = (goals || []).filter((g) => g.status !== 'completed' && Number(g.currentAmount) >= shortfall);
  const [goalId, setGoalId] = useState(eligibles[0]?.id || '');

  const confirm = () => {
    if (!goalId) return;
    onPick({ goalId, amount: shortfall });
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
            <h2 className="font-headline-md text-headline-md text-on-surface">{t('cascade.shortfallTitle')}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('cascade.shortfallBody').replace('{amt}', fmt(shortfall))}
            </p>

            <div className="flex flex-col gap-xs">
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('cascade.takeFrom')}</span>
              {eligibles.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalId(g.id)}
                  className={`flex justify-between items-center px-md py-sm rounded border text-left transition-colors ${
                    goalId === g.id ? 'border-primary bg-surface-container-high' : 'border-border-subtle hover:bg-surface-container-high'
                  }`}
                >
                  <span className="font-label-sm text-label-sm text-on-surface truncate">{g.title}</span>
                  <span className="font-mono-data text-mono-data text-secondary shrink-0">{fmt(g.currentAmount)}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-sm mt-sm">
              <button onClick={onClose} className="px-md py-sm rounded font-label-sm text-label-sm text-text-muted hover:text-on-surface">
                {t('common.cancel')}
              </button>
              <button
                onClick={confirm}
                disabled={!goalId}
                className="px-md py-sm rounded bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-40 active:scale-[0.97]"
              >
                {t('cascade.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

> Verificar: `common.cancel` existe (sí, lo usamos antes). `EASE_OUT` se exporta de motionTokens (sí).

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/finances/SavingsPickerModal.jsx
git commit -m "feat(cascada): modal para elegir la meta del retiro"
```

---

## Task 6: Cablear el flujo en el PaymentModal de deudas

**Files:**
- Modify: `src/stitch/screens/debts/PaymentModal.jsx`

**Contexto:** Hoy `submit` ([debts/PaymentModal.jsx:23-33](../../../src/stitch/screens/debts/PaymentModal.jsx#L23-L33)) llama directo a `demoAddDebtPayment`. Hay que: calcular shortfall; si 0 → pago normal; si >0 y no alcanza → bloquear; si >0 y alcanza → abrir el picker y, al elegir, llamar al orquestador.

- [ ] **Step 1: Añadir imports y estado**

En los imports de [debts/PaymentModal.jsx](../../../src/stitch/screens/debts/PaymentModal.jsx):

```javascript
import { isDemoActive, demoAddDebtPayment, applyDebtPaymentWithCascade } from '../../demoMode';
import useTransactionStore from '../../../stores/useTransactionStore';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import useSavingsStore from '../../../stores/useSavingsStore';
import usePrefsStore from '../../../stores/usePrefsStore';
import { getCashShortfall, canAffordPayment } from '../dashboard/selectors';
import SavingsPickerModal from '../finances/SavingsPickerModal';
```

Dentro del componente, junto a los demás hooks:

```javascript
  const transactions = useTransactionStore((s) => s.transactions);
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const [picker, setPicker] = useState(null); // { shortfall, amt } cuando hay faltante
```

- [ ] **Step 2: Reescribir `submit` con el flujo de decisión**

Reemplazar el `submit` actual por:

```javascript
  // Registra el pago (con o sin cascada). Llamado tras decidir la meta si hizo falta.
  const applyPayment = (amt, savingsPick) => {
    if (isDemoActive()) {
      if (savingsPick) applyDebtPaymentWithCascade(debt.id, amt, date, note.trim(), savingsPick);
      else demoAddDebtPayment(debt.id, amt, date, note.trim());
    } else {
      addPayment(debt.id, amt, date, note.trim()); // cuenta real: sin cascada (como hoy)
    }
    const newBal = Number(debt.currentBalance) - amt;
    if (newBal <= 0) toastCelebrate(t('screens.debts.debtPaidOff'));
    else toast.success(t('screens.debts.paymentRegistered').replace('{amt}', fmt(amt, debt.currency)), { duration: 4000 });
    if (savingsPick) {
      const g = goals.find((gg) => gg.id === savingsPick.goalId);
      toast(t('cascade.usedSavings').replace('{amt}', fmt(savingsPick.amount, debt.currency)).replace('{goal}', g?.title || ''), { icon: 'ℹ️' });
    }
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    // Cuenta real (no demo): sin cascada, comportamiento de hoy.
    if (!isDemoActive()) { applyPayment(amt, null); return; }

    const { available, shortfall } = getCashShortfall(transactions, initialCashBalance, cards, amt);
    if (shortfall === 0) { applyPayment(amt, null); return; }

    const totalSavings = getTotalSaved();
    if (!canAffordPayment(available, totalSavings, amt)) {
      toast.error(t('cascade.noFunds').replace('{avail}', fmt(available + totalSavings, debt.currency)).replace('{need}', fmt(amt, debt.currency)));
      return;
    }
    // ¿Hay una meta que cubra el faltante sola? (no repartimos)
    const hasEligible = goals.some((g) => g.status !== 'completed' && Number(g.currentAmount) >= shortfall);
    if (!hasEligible) {
      toast.error(t('cascade.noSingleGoal').replace('{amt}', fmt(shortfall, debt.currency)));
      return;
    }
    setPicker({ shortfall, amt }); // abre el modal de meta
  };
```

- [ ] **Step 3: Montar el `SavingsPickerModal`**

Antes del cierre del `return` (después de `</Modal>` o dentro, al final), añadir:

```javascript
      {picker && (
        <SavingsPickerModal
          open
          shortfall={picker.shortfall}
          goals={goals}
          onPick={(pick) => { const amt = picker.amt; setPicker(null); applyPayment(amt, pick); }}
          onClose={() => setPicker(null)}
        />
      )}
```

> Nota: como el picker se monta junto al Modal, asegurarse de que el JSX devuelva un fragmento si hace falta envolver `<Modal>...</Modal>` + el picker en `<>...</>`.

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build`
Expected: build OK.
Run: `npx eslint src/stitch/screens/debts/PaymentModal.jsx`
Expected: limpio.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/debts/PaymentModal.jsx
git commit -m "feat(cascada): flujo de pago de deuda con cascada y picker de meta"
```

---

## Task 7: Cablear el flujo en el PaymentModal de tarjetas

**Files:**
- Modify: `src/stitch/screens/cards/PaymentModal.jsx`

**Contexto:** Mismo patrón que Task 6. Hoy `submit` ([cards/PaymentModal.jsx:25-42](../../../src/stitch/screens/cards/PaymentModal.jsx#L25-L42)) llama a `demoAddCardPayment`. El componente ya recibe `transactions` por prop.

- [ ] **Step 1: Añadir imports y estado**

En los imports de [cards/PaymentModal.jsx](../../../src/stitch/screens/cards/PaymentModal.jsx):

```javascript
import { isDemoActive, demoAddCardPayment, applyCardPaymentWithCascade } from '../../demoMode';
import useSavingsStore from '../../../stores/useSavingsStore';
import usePrefsStore from '../../../stores/usePrefsStore';
import { getCashShortfall, canAffordPayment } from '../dashboard/selectors';
import SavingsPickerModal from '../finances/SavingsPickerModal';
```

Dentro del componente (ya hay `transactions` por prop y `cards` se obtiene del store que ya está importado — verificar; si no, importar `useCreditCardStore`):

```javascript
  const cards = useCreditCardStore((s) => s.cards);
  const goals = useSavingsStore((s) => s.goals);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const [picker, setPicker] = useState(null);
```

- [ ] **Step 2: Reescribir `submit`**

Reemplazar el `submit` por:

```javascript
  const applyPayment = (amt, savingsPick) => {
    const payload = { amount: amt, date, note: note.trim() };
    if (isDemoActive()) {
      if (savingsPick) applyCardPaymentWithCascade(card.id, payload, savingsPick);
      else demoAddCardPayment(card.id, payload);
      toast.success(t('screens.cards.paymentRegistered'));
    } else {
      addCardPayment(card.id, payload); // cuenta real: sin cascada
    }
    if (bal.pendingBilled > 0.01 && amt + bal.paid >= bal.billed - 0.01) {
      toastCelebrate(t('creditCards.amountPaid'));
    }
    if (savingsPick) {
      const g = goals.find((gg) => gg.id === savingsPick.goalId);
      toast(t('cascade.usedSavings').replace('{amt}', fmt(savingsPick.amount)).replace('{goal}', g?.title || ''), { icon: 'ℹ️' });
    }
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    if (!isDemoActive()) { applyPayment(amt, null); return; }

    const { available, shortfall } = getCashShortfall(transactions, initialCashBalance, cards, amt);
    if (shortfall === 0) { applyPayment(amt, null); return; }

    const totalSavings = getTotalSaved();
    if (!canAffordPayment(available, totalSavings, amt)) {
      toast.error(t('cascade.noFunds').replace('{avail}', fmt(available + totalSavings)).replace('{need}', fmt(amt)));
      return;
    }
    const hasEligible = goals.some((g) => g.status !== 'completed' && Number(g.currentAmount) >= shortfall);
    if (!hasEligible) {
      toast.error(t('cascade.noSingleGoal').replace('{amt}', fmt(shortfall)));
      return;
    }
    setPicker({ shortfall, amt });
  };
```

- [ ] **Step 3: Montar el `SavingsPickerModal`**

Igual que en Task 6 (envolver en fragmento si hace falta):

```javascript
      {picker && (
        <SavingsPickerModal
          open
          shortfall={picker.shortfall}
          goals={goals}
          onPick={(pick) => { const amt = picker.amt; setPicker(null); applyPayment(amt, pick); }}
          onClose={() => setPicker(null)}
        />
      )}
```

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build`
Expected: build OK.
Run: `npx eslint src/stitch/screens/cards/PaymentModal.jsx`
Expected: limpio.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/cards/PaymentModal.jsx
git commit -m "feat(cascada): flujo de pago de tarjeta con cascada y picker de meta"
```

---

## Task 8: Verificación final

- [ ] **Step 1: Build + tests + lint**

Run: `npm run build`
Expected: build OK.

Run: `npm test`
Expected: verde (incluye los nuevos `getCashShortfall`/`canAffordPayment`).

Run: `npx eslint src/stitch/demoMode.js src/stitch/screens/finances/SavingsPickerModal.jsx src/stitch/screens/debts/PaymentModal.jsx src/stitch/screens/cards/PaymentModal.jsx src/stitch/screens/dashboard/selectors.js`
Expected: limpio.

- [ ] **Step 2: Inspección visual en demo**

Run: `npm run dev`, Entrar como demo. Probar los 4 escenarios:
1. **Pago cubierto:** pagar una cuota pequeña (≤ efectivo) → se registra sin pedir meta.
2. **Cascada:** pagar un monto > efectivo pero ≤ efectivo+ahorros → abre el picker, elegir meta, se aplica; toast "se usaron X de la meta"; el efectivo no queda negativo; el ahorro de la meta baja; en el historial de esa meta (tab Ahorros → historial) aparece el retiro (−).
3. **Bloqueo:** pagar un monto > efectivo+ahorros → toast de bloqueo, no se registra nada.
4. **Reversa:** borrar/deshacer un pago que usó ahorro → la meta recupera su monto, la deuda/saldo sube, el historial de la meta muestra el retiro (−) y la reversa (+).

- [ ] **Step 3: Commit (si hubo ajustes de inspección)**

```bash
git add -A
git commit -m "chore(cascada): ajustes tras verificacion visual"
```

(Omitir si no hubo cambios.)

---

## Verificación final (todas las tareas completas)

- [ ] `npm run build` pasa.
- [ ] `npm test` verde (con los selectores nuevos).
- [ ] ESLint limpio en los archivos tocados.
- [ ] Pago cubierto: sin cascada (como hoy).
- [ ] Pago con faltante: pide meta, aplica retiro + pago, avisa; efectivo nunca negativo.
- [ ] Pago imposible: bloquea con mensaje claro.
- [ ] Reversa: borrar pago con ahorro devuelve a la meta; historial con retiro (−) y reversa (+).
- [ ] Cuenta real (no demo): sin cascada, pago como hoy.

---

## Self-Review (cobertura del spec)

- **`getCashShortfall` + `canAffordPayment` (puros, TDD)** → Task 1. ✅
- **Orquestador deuda (aporte negativo + savingsUsed)** → Task 2. ✅
- **Orquestador tarjeta** → Task 3. ✅
- **Reversa deuda y tarjeta (devuelve a la meta)** → Task 2 Step 3 + Task 3 Step 3. ✅
- **`SavingsPickerModal` (solo metas que cubren solas)** → Task 5. ✅
- **Flujo de decisión en ambos PaymentModal (cubierto/bloquear/pedir)** → Tasks 6-7. ✅
- **Bloqueo por fondos insuficientes** → Tasks 6-7 (`canAffordPayment` false). ✅
- **Bloqueo por ninguna meta sola suficiente** → Tasks 6-7 (`hasEligible` false). ✅
- **Aviso "se usaron X de la meta"** → Tasks 6-7 (`cascade.usedSavings`). ✅
- **Solo demo; cuenta real intacta** → ramas `if (isDemoActive())` en Tasks 6-7; orquestadores solo en demoMode. ✅
- **i18n es/en** → Task 4. ✅
- **Sin tipos nuevos (aporte negativo reusa demoAddContribution)** → Tasks 2-3. ✅

**Nota de ejecución:** las tareas piden verificar contratos existentes (`common.cancel`, `EASE_OUT`, que `useCreditCardStore` esté importado en cards/PaymentModal). Es deliberado: confirmar al cablear, no placeholders.
