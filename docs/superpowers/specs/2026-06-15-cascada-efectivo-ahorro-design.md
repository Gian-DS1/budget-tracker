# Cascada efectivo → ahorro al pagar deudas/tarjetas — Diseño

**Fecha:** 2026-06-15
**Tipo:** Lógica financiera nueva (cascada de fondos)
**Alcance:** SOLO modo demo (localhost). Cero Supabase, cero migración SQL.
**Estado:** Diseño aprobado en brainstorming, pendiente de plan de implementación

---

## Contexto y motivación

El modelo de saldo líquido ya distingue dos bolsas: **efectivo disponible** (lo que
está "en el banco") y **ahorro** (las metas). Hoy, pagar una deuda o una tarjeta resta
del efectivo y, si el efectivo no alcanza, simplemente queda negativo — el sistema NO
toca los ahorros.

El usuario quiere modelar la realidad: **al pagar una deuda o tarjeta, si el efectivo
no alcanza, se toma del ahorro** (de una meta que el usuario elige), igual que en la
vida real sacarías de tus ahorros para cubrir una cuota. Los ahorros no se tocan
mientras haya efectivo; solo se usan como respaldo.

Esta es la pieza **A** de un modelo más amplio (la cascada). Las piezas B (etiqueta
"efectivo" en transacciones sin tarjeta) y C (panel de efectivo en Mis Finanzas) son
proyectos aparte posteriores.

## Objetivo

Cuando un pago de **deuda** o **tarjeta** excede el efectivo disponible, el sistema:
1. Calcula el faltante.
2. Si efectivo + ahorros no alcanzan → **avisa y bloquea** (no registra nada).
3. Si alcanzan → pide al usuario **una meta** de la cual tomar el faltante, y aplica
   el retiro + el pago juntos (el efectivo nunca pasa por negativo).
4. El pago **recuerda** de qué meta sacó y cuánto, para revertir con exactitud al
   borrarse/deshacerse.

Todo en **modo demo** (`isDemoActive()`); la rama no-demo queda como hoy.

## No-objetivos (YAGNI)

- NO repartir el faltante entre varias metas (una meta por pago).
- NO cascada en gastos cotidianos (solo pagos de deuda y tarjeta).
- NO la etiqueta "efectivo" (pieza B) ni el panel de efectivo (pieza C).
- NO persistencia en Supabase ni migración SQL (la rama no-demo no cambia).
- NO efectivo negativo: si no alcanza, se bloquea (no se permite sobregiro).

---

## Decisiones del modelo (cerradas en brainstorming)

| Decisión | Resolución |
| --- | --- |
| Qué dispara la cascada | Pagos de **deuda** y de **tarjeta** |
| De qué meta sale | El usuario **elige una** en el momento |
| Fondos insuficientes (ni efectivo ni ahorro) | **Avisa y bloquea**, no registra |
| Reversa (borrar pago con ahorro) | **Devuelve a la misma meta** (el pago recuerda su origen) |
| Modelado del retiro de ahorro | **Aporte negativo** a la meta (reusa `demoAddContribution`) |
| Flujo cuando falta | Calcular faltante → pedir meta → aplicar todo junto |
| Entorno | **Solo demo** primero |

---

## Por qué "aporte negativo" funciona (clave del enfoque)

`demoAddContribution(goalId, amount, ...)` crea una transacción tipo `'savings'` con el
monto y suma `amount` al `currentAmount` de la meta. Con `amount` **negativo**:
- `currentAmount += (−4000)` → la meta **baja** 4000 (retiro). ✅
- La transacción `'savings'` de −4000 entra a `getLiquidCash`, que hace `cash -= amount`
  para savings → `cash -= (−4000)` = `cash += 4000` → el efectivo **recupera** 4000 para
  cubrir el pago. ✅
- El retiro aparece en el **historial de la meta** (el HistoryModal de vaults ya lista
  contribuciones) como una línea negativa. ✅
- La reversa = aportar `+4000` de vuelta (otra contribución), que la maquinaria ya sabe
  hacer y deshacer.

Así, el retiro de ahorro reusa al 100% la maquinaria de aportes existente, sin tipos
nuevos ni cambios en `getLiquidCash`/donut/stores.

---

## Arquitectura

### Lógica pura (nueva, testeable)

En `src/stitch/screens/dashboard/selectors.js` (junto a `getLiquidCash`):

```javascript
// Cuánto falta de efectivo para cubrir un pago. shortfall = lo que habría que
// sacar de ahorros. available = efectivo disponible hoy.
export function getCashShortfall(transactions, initialCashBalance, cards, paymentAmount) {
  const available = getLiquidCash(transactions, initialCashBalance, cards);
  const amt = Number(paymentAmount) || 0;
  const shortfall = Math.max(0, amt - available);
  return { available, shortfall };
}

// ¿Se puede pagar? (efectivo + ahorros ≥ pago). totalSavings = Σ goal.currentAmount.
export function canAffordPayment(available, totalSavings, paymentAmount) {
  return (Number(available) || 0) + (Number(totalSavings) || 0) >= (Number(paymentAmount) || 0);
}
```

### Orquestador (en `demoMode.js`)

```
applyDebtPaymentWithCascade(debtId, amount, date, notes, savingsPick)
applyCardPaymentWithCascade(cardId, { amount, date, note }, savingsPick)
```

Donde `savingsPick = { goalId, amount }` (el retiro elegido por el usuario) o `null`
si el pago se cubre solo con efectivo. El orquestador:

1. Si `savingsPick` no es null: `demoAddContribution(savingsPick.goalId, -savingsPick.amount, date, "Retiro para pago …")`.
2. Aplica el pago normal (`demoAddDebtPayment` / `demoAddCardPayment`).
3. Guarda en el registro del pago el campo nuevo **`savingsUsed: [{ goalId, amount }]`**
   (o `[]` si fue solo efectivo).

> Nota: el orquestador NO decide la meta — eso lo hace la UI (el modal). El orquestador
> solo aplica lo que ya viene decidido. Mantiene la lógica de mutación en un solo sitio.

### UI

- **`SavingsPickerModal.jsx` (nuevo):** se abre cuando hay faltante. Muestra el monto
  faltante y la lista de metas con `currentAmount ≥ shortfall` (las que pueden cubrirlo
  solas, porque no repartimos). El usuario elige una y confirma. Devuelve
  `{ goalId, amount: shortfall }`.
- **`PaymentModal` de deudas y de tarjetas:** en `submit`, antes de aplicar el pago:
  1. Calcular `{ available, shortfall } = getCashShortfall(...)`.
  2. `shortfall === 0` → aplicar pago normal (cubierto con efectivo).
  3. `shortfall > 0` y `!canAffordPayment(...)` → toast de bloqueo, no registrar.
  4. `shortfall > 0` y sí alcanza → abrir `SavingsPickerModal`; al confirmar, llamar al
     orquestador con `savingsPick`.

### Reversa

- **`demoDeleteDebtPayment` / `demoDeleteCardPayment`:** al inicio, si el pago tiene
  `savingsUsed` no vacío, por cada `{ goalId, amount }` llamar
  `demoAddContribution(goalId, +amount, hoy, "Reversa de retiro por pago")`. Luego borrar
  el pago como hoy (elimina la transacción del pago, sube la deuda/saldo).
- El historial de la meta muestra el retiro (−) y la reversa (+) — rastro completo.

---

## Flujo completo (ejemplo)

Pago de RD$10,000 a un préstamo, con RD$6,000 de efectivo y meta "Viaje" con 60,000:

1. `getCashShortfall(..., 10000)` → `{ available: 6000, shortfall: 4000 }`.
2. `canAffordPayment(6000, 605000, 10000)` → true.
3. `SavingsPickerModal`: "Faltan RD$4,000. ¿De qué meta?" → usuario elige "Viaje".
4. Orquestador: `demoAddContribution('viaje', -4000, ...)` → Viaje 60k→56k, efectivo
   6k→10k (transitorio en el cálculo, no en la UI). Luego `demoAddDebtPayment(...10000)`
   → efectivo 10k→0, deuda −10k. Pago guarda `savingsUsed: [{ viaje, 4000 }]`.
5. Resultado: efectivo 6k→0, Viaje 60k→56k, deuda −10k. ✅
6. Si el usuario borra el pago: +4000 a Viaje (56k→60k), efectivo recupera, deuda +10k.

## Manejo de errores / casos borde

- **Pago ≤ efectivo:** cascada no se dispara; comportamiento idéntico a hoy.
- **Ni efectivo ni ahorro alcanzan:** bloqueo con mensaje claro (disponible vs requerido).
- **Ninguna meta sola cubre el faltante** (pero la suma de varias sí): como NO repartimos,
  se bloquea con un mensaje específico ("ninguna meta tiene suficiente; reduce el monto").
  Esto es una consecuencia honesta del no-objetivo "una meta por pago".
- **Cuenta real (no demo):** la cascada NO aplica; el pago se registra como hoy. La rama
  `else` (store real) queda intacta.

## Testing

- **Unitario (TDD):** `getCashShortfall` (cubierto, faltante parcial, faltante total) y
  `canAffordPayment` (alcanza, no alcanza, límite exacto). Pura, en `selectors.test.js`.
- **Reuso probado:** el retiro/reversa usa `demoAddContribution`/`demoDeleteContribution`,
  ya cubiertos por su comportamiento existente. El orquestador encadena; no añade cálculo.
- **Verificación:** `npm run build` + `npm test` verde + ESLint + inspección en demo:
  pago cubierto (sin cascada); pago que dispara cascada (elige meta, se aplica, historial
  de la meta muestra el retiro −); pago imposible (bloquea); borrar pago con ahorro (todo
  se revierte, historial muestra retiro − y reversa +).

## Reversibilidad

Todo vive tras `isDemoActive()` y en `demoMode.js` + dos selectores puros + un modal
nuevo + el campo `savingsUsed` en los pagos demo (en memoria). Revertir = quitar el
orquestador, el modal, los selectores y el campo. La rama no-demo nunca se tocó.

## Criterios de éxito

En demo, pagar una deuda/tarjeta que excede el efectivo toma del ahorro elegido (con
aviso), el efectivo nunca queda negativo, los pagos imposibles se bloquean, y deshacer
un pago con ahorro devuelve el dinero a la misma meta con rastro en su historial. El
modelo financiero refleja la vida real: efectivo primero, ahorros como respaldo.
