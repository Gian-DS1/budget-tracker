# utils/{formatters, recurrence, constants}.js — Formateo, recurrencia, constantes

## formatters.js (129 líneas)

| Función | Comportamiento |
|---|---|
| `formatCurrency(amount, code='DOP')` | `Intl.NumberFormat('es-DO')` 2 decimales; antepone símbolo (`RD$`/`US$`) y signo `-` si negativo. Trabaja sobre `Math.abs`. |
| `formatCurrencyCompact(amount, code)` | `≥1M → 'X.XM'`, `≥1K → 'X.XK'`, else 2 decimales. Mismo signo/símbolo. |
| `formatPercent(value, decimals=1)` | `` `${value.toFixed(decimals)}%` `` |
| `formatDate(dateStr)` | `''` si vacío; parsea `dateStr+'T00:00:00'` (medianoche LOCAL) → `'es-DO'` `{day:'numeric', month:'short', year:'numeric'}`. |
| `toISODate(date)` | **CRÍTICO:** usa componentes de calendario LOCAL, NO `toISOString()` (que es UTC y en RD GMT-4 saltaría al día siguiente por la tarde). Devuelve `YYYY-MM-DD` o `''` si inválida. |
| `todayISO()` | `toISODate(new Date())` |
| `generateId()` | `crypto.randomUUID()` con fallback `Date.now().toString(36)+random`. |
| `titleCase(str)` | Mayúscula inicial de cada palabra SIN forzar minúsculas el resto (preserva "ATM", "USD"). Regex unicode `(^|\s)(\p{L})`. |
| `getTypeLabel(type)` | español: income→'Ingreso', expense→'Gasto', savings→'Ahorro', debt_payment→'Pago Deuda', fixed_expense→'Gasto Fijo', variable_expense→'Gasto Variable'. |
| `getTypeBadgeClass(type)` | mapea a clase CSS `badge-{income\|expense\|fixed\|variable\|savings\|debt}`. |

> **Regla de fechas:** TODA la app trabaja fechas como `YYYY-MM-DD` y las parsea con
> `+'T00:00:00'` para forzar medianoche local. Nunca `new Date(isoString)` directo (UTC).
> Al reconstruir, mantener `toISODate` local-aware o se rompen los días en RD (GMT-4).

## recurrence.js (25 líneas)

`advanceDate(iso, frequency)` — avanza una fecha `YYYY-MM-DD`:
- `weekly` → +7 días · `biweekly` → +14 días (vía objeto Date local).
- `monthly` → mismo día del mes siguiente, **recortado** a la longitud del mes destino
  (31 ene → 28/29 feb). Maneja cruce de año (dic→ene).

> La materialización de recurrentes (crear las transacciones que tocan) vive en
> `useRecurringStore` (`materializeDue`) — ver [`../stores/recurring.md`](../stores/recurring.md).

## constants.js (66 líneas)

- `CURRENCIES`: `DOP {symbol:'RD$'}`, `USD {symbol:'US$'}`. `DEFAULT_CURRENCY='DOP'`.
- `USD_TO_DOP_RATE = 60` (fallback estático; el valor real lo da `useRateStore` en runtime).
- **Enums** (strings que viajan a la DB — preservar literales exactos):
  - `TRANSACTION_TYPES`: income, expense, savings, debt_payment.
  - `CATEGORY_TYPES`: income, fixed_expense, variable_expense, savings.
  - `RECURRENCE_PATTERNS`: weekly, biweekly, monthly.
  - `SAVINGS_STATUS`: active, completed, paused.
  - `DEBT_STATUS`: active, paid_off.
  - `PLAN_HORIZONS`: short, medium, long. `PLAN_STATUSES`: pending, in_progress, completed.
- `MONTHS_ES` / `MONTHS_SHORT_ES` (12) · `DAYS_SHORT_ES` (['Dom'..'Sáb'], domingo primero).
