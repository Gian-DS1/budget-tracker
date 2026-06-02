# utils/calculations.js — Cálculos financieros núcleo

> Fuente: `src/utils/calculations.js` (434 líneas). Tests: `calculations.test.js`.
> Todos los montos en **DOP**. El llamante pasa totales de deuda ya convertidos a DOP.

## Concepto transversal: monto efectivo (neto de cashback)

```js
getEffectiveAmount(t) = (Number(t.amount) || 0) - (Number(t.cashbackEarned) || 0)
```

- `cashbackEarned` solo es > 0 en **gastos con tarjeta**; en ingreso/ahorro/deuda es 0,
  así que restarlo es seguro para cualquier tipo.
- Refleja "lo que realmente gastaste" (RD$1000 con RD$10 cashback ⇒ RD$990).
- **NO** afecta lo que debes a la tarjeta (eso usa el bruto, en `creditCards.js`).
- `sumAmounts(txs)` = Σ `getEffectiveAmount`. Casi todos los agregados usan esto.

## Agregados de periodo

| Función | Qué suma (filtro por `t.type`) |
|---|---|
| `calculateIncome(txs)` | `type === 'income'` |
| `calculateExpenses(txs)` | `'expense' \| 'fixed_expense' \| 'variable_expense'` |
| `calculateSavings(txs)` | `type === 'savings'` |
| `calculateBalance(txs)` | `income − expenses` (NO resta ahorro ni deuda) |
| `calculateSavingsRate(txs)` | `income===0 ? 0 : savings/income*100` |

`calculatePercentChange(current, previous)`: si `previous===0` ⇒ `current>0 ? 100 : 0`;
si no ⇒ `((current−previous)/|previous|)*100`.

## Presupuesto / progreso

- `calculateBudgetProgress(actual, estimated)`: `!estimated ? 0 : actual/estimated*100`.
- `getProgressStatus(pct)`: `≤80 'good'` · `≤100 'warning'` · `>100 'danger'`.
- `groupByCategory(txs, categories)`: agrupa por `categoryId`; cada grupo
  `{category, transactions[], total}` con `total` = Σ efectivo. Categoría faltante ⇒
  placeholder `{name:'Sin Categoría', icon:'❓', color:'#94a3b8'}`.

## ⭐ getBudgetSummary — fuente de verdad del "puedes gastar"

Entrada: `{ monthTransactions, monthBudgets, categories, debtPlanned, debtPaid }` (todo DOP).

**Clasifica por el TIPO DE LA CATEGORÍA** (resuelta vía `categoryId`), no por `t.type`.
Categorías marcadas `isAccumulative` van a un bucket aparte (botes/sinking funds).

```
estimatedByType[tipo] = Σ budget.estimatedAmount de categorías de ese tipo (no acumulativas)
accumulativePlan      = Σ budget.estimatedAmount de categorías acumulativas
actualByType[tipo]    = Σ getEffectiveAmount(tx) de categorías de ese tipo (no acumulativas)
accumulativeSpent     = Σ getEffectiveAmount(tx) de categorías acumulativas

comprometido = gastosFijosPlan + debtPlanned + ahorroPlan + accumulativePlan
disponible   = ingresoRecibido − comprometido − variableGastado
puedesGastar = max(0, disponible)
porAsignar   = ingresoEstimado − gastosFijosPlan − gastosVariablesPlan − ahorroPlan
               − accumulativePlan − debtPlanned

estado: ingresoRecibido===0 ⇒ 'neutral'
        disponible < 0        ⇒ 'danger'
        disponible < 0.1*ingresoRecibido ⇒ 'warning'
        else                  ⇒ 'good'
```

Devuelve: `{ ingresoRecibido, ingresoEstimado, gastosFijosPlan, gastosVariablesPlan,
ahorroPlan, variableGastado, accumulativePlan, accumulativeSpent, debtPlanned, debtPaid,
comprometido, disponible, puedesGastar, porAsignar, estado }`.

> **Clave del modelo base cero:** los gastos FIJOS y el ahorro se cuentan por su PLAN
> (comprometido), mientras los VARIABLES se cuentan por lo REALMENTE gastado. Así
> "puedes gastar" = lo que queda libre tras honrar compromisos y descontar lo variable ya
> gastado.

## getAccumulatedBalance — bote acumulado (sinking fund)

`{ categoryId, accumulationStart('YYYY-MM'), budgets, transactions, uptoYear, uptoMonth }`
⇒ `{ budgeted, spent, available }`.

- Suma `estimatedAmount` de los budgets de esa categoría con índice `year*12+month` entre
  `startIdx` (desde `accumulationStart`, o el mes actual si no hay) y `uptoIdx` inclusive.
- Suma efectivo de transacciones con `date` en `[startISO, endExclusiveISO)` (primer día
  del mes siguiente a `upto` como límite superior exclusivo).
- `available = budgeted − spent` (puede acumularse mes a mes; de ahí "acumulativo").

## getMonthlySavingCapacity — capacidad de ahorro estimada

`(transactions, refDate=new Date(), monthsBack=3)` ⇒
`{ capacity, monthsCounted, avgIncome, avgExpense }`.

- Promedia `(ingreso − gasto)` de los últimos `monthsBack` meses **COMPLETOS** (excluye el
  mes en curso). El ahorro **no** cuenta como gasto (es lo que se estima apartar).
- Solo promedia meses con actividad (`income>0 || expense>0`) para no diluir con vacíos.
- Sin meses activos ⇒ todo 0.

## getBudgetSuggestions — sugerencia base cero

`(transactions, categories, year, month, monthsBack=3)` ⇒ `[{ categoryId, amount }]`.

- Para cada categoría **activa**, promedia lo registrado en los `monthsBack` meses
  ANTERIORES al mes objetivo. Divide siempre entre `monthsBack` (un gasto esporádico no
  infla el presupuesto). Usa monto **bruto** (`t.amount`), no efectivo. Solo devuelve avg > 0.

## ⭐ getFinancialHealthScore — score 0-100

`{ avgIncome, avgExpense, monthlyDebt }` (promedios mensuales DOP) ⇒
`{ score, label, savingsRate }`. Si `avgIncome<=0` ⇒ `{0, 'Sin datos', 0}`.

```
savingsRate = (avgIncome − avgExpense) / avgIncome
savingsPts  = clamp01(savingsRate / 0.20) * 45     // 20%+ ahorro = máximo
expenseRatio= avgExpense / avgIncome
expensePts  = clamp01((1 − expenseRatio) / 0.50) * 30   // ≤50% gasto = máx, ≥100% = 0
dti         = monthlyDebt / avgIncome
debtPts     = clamp01(1 − dti/0.36) * 25            // 0 deuda = máx, ≥36% DTI = 0
score       = round(savingsPts + expensePts + debtPts)
```

`label`: `≥80 'Excelente'` · `≥60 'Buena'` · `≥40 'Regular'` · else `'Necesita atención'`.

## Otros

- `calculateAmortization(balance, interestRate, monthlyPayment)`: tabla mes a mes
  (`monthlyRate = rate/100/12`); corta si el pago no cubre el interés (`principal<=0`) o a
  600 meses. Filas `{month, payment, principal, interest, balance}`.
- `monthsToGoal(current, target, monthly)`: `monthly<=0 ⇒ Infinity`; `remaining<=0 ⇒ 0`;
  else `ceil(remaining/monthly)`. `projectedCompletionDate(...)`: hoy + meses (o `null` si ∞).
- `movingAverage(data, windowSize=3)`: media móvil; si `data.length<window` devuelve `data`.
- `detectAnomalies(values, threshold=2)`: marca valores a ≥`threshold` desviaciones estándar
  de la media; necesita ≥3 valores. Devuelve `[{index, value, deviation, isAnomaly}]` filtrado.
