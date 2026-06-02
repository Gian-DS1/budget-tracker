# utils/creditCards.js — Ciclos y saldos de tarjetas (puro)

> Fuente: `src/utils/creditCards.js` (261 líneas). Tests: `creditCards.test.js`.
> **Fuente única de verdad** del saldo de tarjeta para: página Tarjetas, Dashboard y los
> recordatorios del Header. Todo en **DOP** y **neto de cashback** (salvo donde se diga bruto).

## Modelo mental

Una tarjeta tiene `cutoffDay` (día de corte) y `dueDay` (día de pago). Los consumos son
transacciones con `cardId`. El saldo se **deriva** de las transacciones + abonos (modelo de
devengo); nunca se almacena un "balance".

## getCardCycles(card, refDate=new Date()) → fechas del ciclo

Calcula, a partir de hoy, las ventanas del estado de cuenta cerrado y del ciclo abierto.
Usa `dayInMonth(y, m0, day)` que ajusta a meses cortos (31 en feb → 28/29).

Devuelve ISO strings:
- `lastCutoffISO` / `nextCutoffISO` — corte anterior y siguiente respecto a hoy.
- `openStartISO` = corte anterior + 1 día · `openEndISO` = próximo corte → **ciclo abierto**.
- `closedStartISO` = corte previo-al-anterior + 1 · `closedEndISO` = `lastCutoffISO` →
  **estado de cuenta cerrado** (lo que toca pagar).
- `dueDateISO` = primera ocurrencia del `dueDay` posterior al corte.

## Sumas de período (sobre transacciones de la tarjeta, en `[startISO, endISO]`)

- `getStatementAmount(txs, cardId, start, end)` — suma monto **BRUTO** (`t.amount`).
- `getStatementCashback(txs, cardId, start, end)` — suma `t.cashbackEarned`.
- Neto del período = amount − cashback.

## ⭐ getCardBalances(card, transactions, refDate) → saldo derivado

Fuente única de verdad. Todo neto de cashback, en DOP.

```
billed = Σ consumo con date ≤ closedEndISO          (todo lo facturado, neto)
open   = Σ consumo en (corte, próximo corte]         (ciclo abierto, neto)
paid   = Σ card.payments[].amount  +  Σ paidCyclesToPayments(...)   (disjuntos)

pendingBilled = max(0, billed − paid)    → deuda urgente (incluye saldo arrastrado)
overpay       = max(0, paid − billed)    → prepago
openCycle     = max(0, open − overpay)   → consumo nuevo no facturado
totalBalance  = max(0, billed + open − paid)
isPaid        = (billed − paid) ≤ 0.01   (PAID_EPSILON)

closedStatementNet = neto del último estado de cuenta cerrado
spansMultipleCycles = pendingBilled > closedStatementNet + EPSILON  (hay arrastre)
```

Devuelve `{ cycles, billed, open, paid, overpay, pendingBilled, openCycle, totalBalance,
closedStatementNet, spansMultipleCycles, isPaid }`.

> **Regla de oro:** un abono NUNCA es gasto del presupuesto; solo liquida este saldo. El
> gasto se contó al registrar cada consumo. (Por eso los abonos viven en `card.payments`,
> no en `transactions`.)

## Abonos y migración de legados

- **Formato nuevo:** `card.payments = [{ id, amount, date, note }]`.
- **Formato legado:** `card.paidCycles` (string ISO o `{cycleEnd, amount, cashback, ...}`)
  marcaba estados de cuenta enteros como pagados.
- `paidCyclesToPayments(card, txs)`: convierte legados en abonos equivalentes
  `{id:'mig-…', amount, date, note}`. Si el snapshot trae monto, le resta su `cashback`
  (se guardó bruto, el saldo es neto). Si no, reconstruye desde transacciones del período.
  Descarta montos ≤ 0. **Son disjuntos de `card.payments`** (tras esta feature ya no se
  escribe `paidCycles`).
- `isStatementPaid(card, closedEndISO)` · `getStatementHistory(card)` (normalizado, desc).
- `getLifetimeCashback(card, txs)`: Σ `cashbackEarned` de todas las txs de la tarjeta.

## ⭐ computeCashback(card, categoryId, amount) → cashback en DOP

Fuente única de verdad — la usa el formulario (preview) y el store (al guardar).

```
regla = card.cashbackRules.find(r => r.categoryId === categoryId)   // categoría exacta
     || card.cashbackRules.find(r => r.categoryId === 'all')        // fallback genérico
cashback = round(amount * regla.percentage / 100, 2)   // 0 si no hay tarjeta/regla/monto
```

`amount` debe estar en DOP. Solo se aplica a **gastos** (el store lo garantiza).
