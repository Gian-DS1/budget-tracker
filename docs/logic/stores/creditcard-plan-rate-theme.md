# Stores de soporte: creditCard · plan · rate · theme

---

## useCreditCardStore (`fintrack-cards-cache`)

**Tarjeta:** `{ id, name, bank, cutoffDay, dueDay, color, paidCycles[], payments[],
cashbackRules[], catalogId, createdAt }`. DB `credit_cards`: `cutoff_day, due_day,
paid_cycles(jsonb), payments(jsonb), cashback_rules(jsonb), catalog_id`.

- `payments[]` = abonos nuevos `{id, amount, date, note}` (jsonb en la fila, no tabla aparte).
- `paidCycles[]` = legado (ver [`../utils/credit-cards.md`](../utils/credit-cards.md)).
- `cashbackRules[]` = `{categoryId|'all', percentage}`.

| Acción | Notas |
|---|---|
| `fetchCards()` ord. `created_at` asc · `addCard` · `updateCard(id, updates)` (whitelist DB) · `deleteCard`. |
| ⭐ `addCardPayment(cardId, {amount, date, note})` | añade un abono a `payments[]` (update del jsonb). **El abono LIQUIDA saldo, nunca es gasto del presupuesto.** Genera id con `crypto.randomUUID`. |
| `deleteCardPayment(cardId, paymentId)` | filtra `payments[]` y persiste. |

> El saldo NO se almacena: se deriva con `getCardBalances` (utils). Este store solo guarda
> la definición de la tarjeta + abonos. El cashback se calcula en `addTransaction` y se
> guarda por transacción.

---

## usePlanStore (`fintrack-plans-cache`) — plan financiero / objetivos

**Plan:** `{ id, title, description, targetAmount, currentAmount, deadline,
type, horizon(=type), status('pending'|'in_progress'|'completed'), createdAt }`.
DB `plans`: `target_amount, current_amount, type`. **`horizon` y `type` son el mismo
campo** (la UI usa `horizon`, la DB `type` con valores `short_term`/`medium_term`/`long_term`).

| Acción | Notas |
|---|---|
| `fetchPlans` · `addPlan` (status inicial `'pending'`) · `updatePlan(id, updates)` (mapea horizon→type) · `deletePlan` · `updateStatus(id, status)`. |
| getters: `getPlansByHorizon(h)` (matchea horizon o type), `getPlansByStatus(s)`. |

---

## useRateStore (`fintrack-rate-cache`) — tasa USD→DOP (fuente única)

Estado: `{ liveRate(=60 fallback), manualRate(null), source('mercado'|'popular'),
lastFetched, loading }`. Constante `BANK_SPREAD = 1.012`.

| Miembro | Comportamiento |
|---|---|
| ⭐ `getRate()` | **Fuente única de verdad** para valorar balances USD en TODA la app. Devuelve `manualRate` si es número > 0; si no `liveRate` (>0); si no `USD_TO_DOP_RATE` (60). |
| `fetchRate()` | (1) intenta `/api/rate` (Banco Popular, serverless, tasa real sin spread). (2) fallback API global de mercado × `BANK_SPREAD`. Setea `source` según origen. Se llama una vez al cargar la app. |
| `setManualRate(value)` | override del usuario (Ajustes); `null`/`''` lo limpia (vuelve a live). |

> Lo usan: `useDebtStore` (getTotalDebt/MonthlyPayment), `useTransactionStore`
> (fetchUSDRate fallback), `useRecurringStore` (materializeDue). Cambiar la tasa
> revalúa todos los balances USD de forma consistente.

---

## useThemeStore (`fintrack-theme`) — UI, NO dominio

Estado: `{ theme('dark'|'light'), sidebarCollapsed, mobileMenuOpen }`.
> **OJO (estado en `main`):** el default es `prefers-color-scheme` →
> `light ? 'light' : 'dark'`. (En la rama del re-skin Stitch se cambió a `'dark'` fijo +
> migración `persist` v1. Si reconstruyes y quieres dark-first como la identidad Stitch,
> aplica ese cambio.)

Acciones: `toggleTheme`, `setTheme(theme)`, `toggleSidebar`, `toggleMobileMenu`,
`closeMobileMenu`. El atributo `data-theme` lo aplica `App.jsx` (`useEffect` sobre `theme`).

---

## Resumen de claves localStorage (persist)

| Store | Clave | partialize |
|---|---|---|
| transactions | `fintrack-transactions-cache` | 500 más recientes |
| budgets | `fintrack-budgets-cache` | todo |
| debts | `fintrack-debts-cache` | debts + payments |
| savings | `fintrack-savings-cache` | goals |
| recurring | `fintrack-recurring-cache` | recurring |
| categories | `fintrack-categories-cache` | categories |
| cards | `fintrack-cards-cache` | cards |
| plans | `fintrack-plans-cache` | plans |
| rate | `fintrack-rate-cache` | todo |
| theme | `fintrack-theme` | todo |

> Borrar estas claves = reset de caché local (Supabase repuebla). `SettingsPage` borra las
> `*-cache` de datos al limpiar; conserva `fintrack-theme`.
