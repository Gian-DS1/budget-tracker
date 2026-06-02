# Stores de dominio: budget · debt · savings · recurring · category

> Cada uno usa Zustand + `persist`. Patrón común: `fetchX` (sin user ⇒ vacía + loading
> false), acciones async que escriben en Supabase y luego en el estado, mapeo
> snake_case↔camelCase. Todos cachean en localStorage (`fintrack-*-cache`).

---

## useBudgetStore (`fintrack-budgets-cache`)

**Forma:** `{ id, categoryId, year, month(0-11), estimatedAmount, currency:'DOP', createdAt }`.
DB `budgets`: `month` es texto `'YYYY-MM'` (1-based) → se parsea a `{year, month:m-1}`.

| Acción | Notas |
|---|---|
| `fetchBudgets()` | carga todos del user. |
| `setBudget(categoryId, year, month, amount)` | **Optimista con rollback**: actualiza estado sync (id `temp-…`), luego upsert manual (select `maybeSingle` → update o insert), reemplaza la fila temp con la real. Si falla, restaura `previousBudgets` + toast error. |
| `bulkSetBudgets(year, month, entries)` | auto-presupuesto sugerido: separa insert/update (ignora ids `temp-`), Promise.all updates + insert en lote, sin toast por ítem. Devuelve nº aplicadas. |
| `getBudgetsByMonth(year, month)` | filtro en memoria. |
| `deleteBudget(id)` · `copyBudgetFromPreviousMonth(year, month)` | copia solo categorías que el mes destino no tenga ya; devuelve bool. |

---

## useDebtStore (`fintrack-debts-cache`) — debts + payments

**Deuda:** `{ id, creditorName, originalAmount, currentBalance, interestRate,
monthlyPayment, due_date, status('active'|'paid_off'), currency, createdAt }`.
DB `debts`: `total_amount, current_balance, interest_rate, minimum_payment, due_date`.
**Legado:** filas con sufijo `' [USD]'` en el nombre → se detecta moneda y se limpia el nombre.

**Pago:** `{ id, debtId, amount, date, remainingBalance, notes, transactionId|null, createdAt }`.

| Acción | Notas críticas |
|---|---|
| `addDebt(debt)` | status inicial = `currentBalance<=0 ? 'paid_off' : 'active'`. |
| `updateDebt(id, updates)` | recalcula status si cambia balance; **no muta `updates`** (usa locals). |
| `deleteDebt(id)` | DB `ON DELETE CASCADE` borra sus pagos. |
| ⭐ `addPayment(debtId, amount, date, notes)` | (1) baja saldo `max(0, bal-amount)` + status. (2) inserta pago. (3) **crea una transacción enlazada** tipo `fixed_expense` en la categoría `pago-deuda` (slug, fallback por nombre), en la moneda de la deuda, y guarda `transaction_id` en el pago (DB + estado) para poder revertir EXACTAMENTE esa tx. |
| ⭐ `deletePayment(paymentId)` | revierte TODO: devuelve monto al saldo, recalcula status, borra el pago y, si tiene `transactionId`, borra la transacción enlazada (`deleteTransactionSilent`). Devuelve `{ ok, payment, hadLinkedTx, hadTransactionLink }` para "Deshacer". |
| `restorePayment(payment)` | re-aplica vía `addPayment` (recrea la tx enlazada). |
| `getTotalDebt()` / `getTotalMonthlyPayment()` | suma deudas activas; **convierte USD→DOP** con `useRateStore.getRate()`. |

> Dependencias: `addPayment`/`deletePayment` usan `useTransactionStore` y `useCategoryStore`.
> Es el acoplamiento más delicado de la app: pago de deuda ↔ transacción. Preservarlo.

---

## useSavingsStore (`fintrack-savings-cache`)

**Meta:** `{ id, title, targetAmount, currentAmount, deadline, icon, color,
status('active'|'completed'|'paused'), createdAt }`. DB `savings`: `target_amount, current_amount`.

| Acción | Notas |
|---|---|
| `addGoal(goal)` | status inicial `'active'`. |
| `updateGoal(id, updates)` | auto-completa: si `currentAmount>=targetAmount` ⇒ `status:'completed'`. |
| `addContribution(id, amount)` | suma a `currentAmount` vía `updateGoal` (dispara auto-complete). **Nota:** la PÁGINA además crea una transacción tipo `savings` (no el store). |
| `togglePause(id)` · `deleteGoal(id)` · `getTotalSaved()` (Σ currentAmount) · `getActiveGoals()`. |

---

## useRecurringStore (`fintrack-recurring-cache`)

**Plantilla:** `{ id, categoryId, cardId|null, amount, type, description, notes, currency,
frequency('weekly'|'biweekly'|'monthly'), nextDate, active, createdAt }`. DB `recurring_transactions`.

| Acción | Notas |
|---|---|
| `fetchRecurring()` ord. por `next_date` asc · `addRecurring(t)` · `toggleActive(id)` · `deleteRecurring(id)`. |
| ⭐ `materializeDue()` | **Dedupe de concurrencia** (`materializeInFlight` — evita doble-montaje en StrictMode). Para cada plantilla activa con `nextDate<=hoy`: genera transacciones para CADA ocurrencia vencida (recupera saltadas; `guard<120`), convierte USD→DOP con la tasa, las inserta vía `bulkAddTransactions`, y avanza `next_date` (DB + estado) con `advanceDate`. Devuelve `{count, created[]}`. Se llama al cargar la app (`App.jsx`). |

Re-exporta `advanceDate` (de `utils/recurrence`).

---

## useCategoryStore (`fintrack-categories-cache`)

**Categoría:** `{ id, name, type, icon, color, slug, keywords[], isActive, sortOrder,
isAccumulative, accumulationStart, createdAt }`. DB `categories`: `is_active, sort_order,
is_accumulative, accumulation_start`. Semilla: `data/defaultCategories.js`.

| Acción | Notas críticas |
|---|---|
| ⭐ `fetchCategories()` | **Dedupe de concurrencia** (`fetchInFlight`). Si el user no tiene categorías ⇒ **siembra** las default. Auto-limpia duplicados en DB (`findDuplicateCategories` → remap de `transactions`/`budgets` al canónico, luego delete). Inserta categorías default que falten (sin duplicar por `name|type`). Ordena por nombre (es, base). |
| `dedupeCategories()` | versión manual del auto-dedupe; reasigna referencias antes de borrar. Devuelve nº borradas. |
| `resetCategoriesToDefault()` | borra todas y re-siembra. |
| ⭐ `ensureCategory(def)` | crea (si no existe por slug o name+type) y devuelve id. Usada por tarjetas (categorías de "ecosistema" para cashback). Al crear, **quita las keywords de esa categoría del "Supermercado"** del usuario para que el auto-categorizador rutee bien. |
| `addCategory` · `updateCategory(id, updates)` (mapea isActive/sortOrder/isAccumulative/accumulationStart) · `deleteCategory` · `toggleCategory`. |
| getters: `getActiveCategories`, `getCategoriesByType(type)` (solo activas), `getCategoryById`. |

> `isAccumulative` + `accumulationStart` alimentan los "botes acumulados"
> (`getAccumulatedBalance`, ver [`../utils/calculations.md`](../utils/calculations.md)).
> Auto-categorización: `autoCategorize(description, categories)` en `data/defaultCategories.js`
> (matchea keywords) — la usa el form de transacción.
