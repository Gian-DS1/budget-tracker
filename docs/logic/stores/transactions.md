# useTransactionStore — el store más complejo

> Fuente: `src/stores/useTransactionStore.js` (466 líneas). Persist:
> `name:'fintrack-transactions-cache'`, `partialize` → solo las **500** txs más recientes
> (límite ~5MB localStorage; Supabase es la fuente completa).

## Forma de una transacción (en memoria, camelCase)

```
{ id, categoryId, cardId|null, amount(DOP), type, description, date('YYYY-MM-DD'),
  notes|null, currency:'DOP', cashbackEarned(number), createdAt }
```
Mapeo DB (snake_case): `category_id, card_id, cashback_earned, created_at, user_id`.
La columna `currency` en DB SIEMPRE es `'DOP'` (USD ya convertido al guardar).

## Helper exportado: fetchUSDRate(dateStr)

Tasa histórica USD→DOP del día `dateStr`:
1. fetch `currency-api@{dateStr}` → `data.usd.dop`.
2. si falla, fetch `@latest`. Si también falla, usa `useRateStore.getRate()` (respeta
   override manual del usuario).
3. aplica spread bancario dominicano **×1.012** y redondea a 2 decimales.

## Acciones (todas async, todas exigen sesión Supabase salvo getters)

| Acción | Efecto + reglas clave |
|---|---|
| `fetchTransactions()` | Carga del user ordenada `date desc, created_at desc`. `loading` true→false. Sin user ⇒ vacía. |
| `addTransaction(tx)` | **(1)** si `currency==='USD'`: convierte con `fetchUSDRate(tx.date)`, añade nota `"US$ X → RD$ Y - Tasa del día: Z"`. **(2)** si `cardId && type==='expense'`: `cashbackEarned = computeCashback(card, categoryId, amountDOP)`. **(3)** inserta (currency:'DOP'). Devuelve el `id` creado (para enlazar, p.ej. pago de deuda). |
| `updateTransaction(id, updates)` | **Whitelist** de columnas reales (el form trae extra: id, createdAt, currency, isRecurring…). Solo manda las que existen en DB. |
| `deleteTransaction(id)` | Borra + toast. Devuelve bool. |
| `deleteTransactionSilent(id)` | Sin toast/confirm (uso interno: revertir pago de deuda enlazado). |
| `restoreTransaction(tx)` | Re-inserta TAL CUAL (monto DOP y cashback ya procesados, **sin** re-convertir/recalcular). Para "Deshacer". `id` nuevo (nada referencia txs por id). |
| `bulkDeleteTransactions(ids)` | Captura filas antes de borrar y las devuelve (para deshacer en bloque). |
| `restoreManyTransactions(txs)` | Re-inserta varias (deshacer en bloque). |
| `bulkAssignCard(ids, cardId)` | Reasigna tarjeta y **recalcula cashback** de cada una (solo gastos). Promise.all + toast con id `'bulk-update'`. |
| `bulkAssignCategory(ids, categoryId)` | Reasigna categoría y recalcula cashback según tarjeta ya asignada. |
| `bulkAddTransactions(txs)` | Import: inserta en lotes de 100. Recalcula cashback (gastos con tarjeta). Devuelve nº insertadas. |

## Getters (sincrónicos, sobre el estado en memoria)

- `getTransactionsByMonth(year, month)` — parsea `date+'T00:00:00'`, compara `getFullYear/getMonth`.
- `getTransactionsByDateRange(start, end)` — comparación string ISO `>=`/`<=`.
- `getTransactionsByCategory(categoryId)` · `getTransactionsByType(type)`.

## Dependencias entre stores

- Lee `useCreditCardStore.getState().cards` (para cashback) y `useRateStore.getState()` (tasa).
- Lo consumen: `useDebtStore` (pago de deuda crea/borra una transacción enlazada),
  `SavingsPage` (abono crea transacción tipo savings), Dashboard/Reports/Budget (lectura).

## Edge cases a preservar

- USD→DOP **siempre** antes de persistir; nota de conversión legible.
- Cashback solo gastos-con-tarjeta, sobre monto en DOP.
- Restore preserva valores procesados (no recalcula) ⇒ deshacer es exacto.
- Cache parcial 500; skeleton solo en carga en frío (`loading && length===0`).
