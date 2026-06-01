# Abonos parciales en tarjetas de crédito — Diseño

**Fecha:** 2026-05-31
**Estado:** Aprobado para implementación
**Enfoque elegido:** Opción A — Abonos nativos en Tarjetas (solo-liquidación)

## Problema

La clienta paga el **balance al corte** para evitar intereses, mientras sigue
acumulando nuevos consumos para el próximo mes. La app solo ofrece un botón
binario **"Marcar como pagado"** ([useCreditCardStore.js:105](../../../src/stores/useCreditCardStore.js#L105)),
que lleva todo el estado de cuenta a pagado. No hay forma de:

1. Registrar un **abono de monto libre** (pago parcial).
2. Ver el **saldo restante por pagar** antes de la fecha límite.
3. Arrastrar el saldo no pagado de un mes al siguiente (caso sobregasto, en el
   que el monto se va abonando con ingresos extra a lo largo del tiempo).

### Hallazgo clave del diagnóstico

La app **ya separa** dos balances en [CreditCardsPage.jsx](../../../src/pages/CreditCardsPage.jsx):
"Ciclo abierto (consumo)" vs. "Estado de cuenta por pagar". Y opera en **base
devengo**: cada compra con tarjeta ya es un gasto en el presupuesto en su fecha;
el pago de la tarjeta solo liquida (no genera gasto). El módulo **Deudas**, en
cambio, opera en **base caja** (cada abono crea un gasto `fixed_expense`).

El verdadero hueco es únicamente la **rigidez del pago binario**, no la falta de
separación de balances.

## Principio rector (evita el doble conteo)

> Un **abono a la tarjeta es la *liquidación* de un saldo, nunca un gasto nuevo.**
> El gasto ocurre una sola vez: al consumir. El ingreso extra entra como ingreso;
> el abono solo hace bajar el saldo de la tarjeta.

Esto mantiene la coherencia con el modelo de devengo actual y elimina de raíz el
riesgo de doble conteo, incluso para usuarios que registran sus compras una a una.

## Modelo de datos

### Esquema

Nueva columna `payments` (jsonb, default `[]`) en la tabla `credit_cards`. Cada
abono es un objeto plano:

```js
{ id, amount, date, note }
// ej: { id: "uuid", amount: 10000, date: "2026-05-20", note: "Pago al corte" }
```

- `id`: string único (crypto.randomUUID()).
- `amount`: número en DOP (moneda base; los consumos ya se guardan en DOP).
- `date`: ISO `YYYY-MM-DD`.
- `note`: string opcional.

Se mapea en `useCreditCardStore.mapFromDb` como `payments: Array.isArray(c.payments) ? c.payments : []`.

**Alternativa considerada:** una tabla `card_payments` espejo de `debt_payments`
(más consistente con Deudas, escala mejor). Se descarta para v1 por mayor
fricción (tabla nueva + políticas RLS). El jsonb es consistente con cómo ya
funciona `paid_cycles` y los abonos por tarjeta son pocos.

### Cifras derivadas (funciones puras, neto de cashback)

Todas viven en [creditCards.js](../../../src/utils/creditCards.js). Se calculan a
partir de las transacciones de la tarjeta y de su libro de abonos. Una sola
función `getCardBalances(card, transactions, refDate)` devuelve el objeto
completo para que la página no recalcule a mano.

| Cifra | Fórmula | Significado |
|---|---|---|
| `billed` | Σ (consumo − cashback) con `date ≤ corte` | Todo lo facturado por el banco |
| `open` | Σ (consumo − cashback) en `(corte, próximo corte]` | Ciclo abierto, sin cortar aún |
| `paid` | Σ `amount` de todos los abonos | Total abonado |
| `pendingBilled` | `max(0, billed − paid)` | 🔴 Deuda urgente (incluye saldos arrastrados) |
| `openCycle` | `open` (con prepago aplicado, ver abajo) | Consumo nuevo, no vence aún |
| `totalBalance` | `max(0, billed + open − paid)` | Saldo total de la tarjeta |
| `isPaid` | `billed − paid ≤ EPSILON` | El estado de cuenta quedó saldado |

**Prepago / sobre-abono:** si `paid > billed`, el excedente (`paid − billed`)
reduce el ciclo abierto mostrado: `openCycle = max(0, open − max(0, paid − billed))`.
Ningún valor puede ser negativo.

**Saldo arrastrado:** no se almacena. Sale gratis del modelo: si un mes no se
paga completo, ese resto sigue dentro de `billed − paid` y vuelve a aparecer como
urgente el mes siguiente, sumándose al nuevo corte.

`EPSILON` = 0.01 para tolerar redondeos.

### Ejemplos verificables

**Caso clienta (pago al corte):**
```
Periodo 1 (date ≤ corte): 10,000   →  billed = 10,000
Periodo 2 (después corte):  5,000   →  open   = 5,000
paid = 0
→ pendingBilled = 10,000 · openCycle = 5,000 · totalBalance = 15,000
Abona 10,000 → paid = 10,000
→ pendingBilled = 0 (isPaid ✓) · openCycle = 5,000 · totalBalance = 5,000
```

**Caso sobregasto (arrastre + abono con ingreso extra):**
```
Corte del mes = 20,000, solo paga 12,000
→ pendingBilled = 8,000 (arrastra) · isPaid = false
Llega ingreso extra; abona 3,000 → paid = 15,000
→ pendingBilled = 5,000
```

**Caso sobre-abono (prepago):**
```
billed = 10,000 · open = 5,000 · paid = 12,000
→ pendingBilled = 0 · excedente = 2,000 → openCycle = 3,000 · totalBalance = 3,000
```

## Migración

Las cuentas existentes tienen `paidCycles` con estados de cuenta marcados como
pagados (formato string legado u objeto `{ cycleEnd, amount, cashback, paidAt }`).

**Estrategia: derivar, no reescribir.** No se migra nada en la base de datos. El
total abonado (`paid`) se calcula sumando **dos libros que nunca se solapan**:

```
paid = Σ(card.payments)  +  Σ(paidCycles convertidos a abonos)
```

Esto es seguro porque el flujo viejo de "Marcar como pagado" se **elimina**: tras
esta feature, ninguna tarjeta vuelve a escribir en `paidCycles`. Los estados de
cuenta saldados con el sistema viejo viven en `paidCycles` (congelado); los abonos
nuevos viven en `payments`. Son conjuntos disjuntos, así que sumarlos no cuenta
doble.

`paidCyclesToPayments(card, transactions)` convierte cada entrada legada en un
abono `{ id, amount, date, note }`:

- Formato objeto: usa `entry.amount` (preciso).
- Formato string legado (sin monto): reconstruye el monto del estado de cuenta
  desde las transacciones del período (`periodStart..periodEnd`, derivando
  `periodStart` con el día de corte si falta). Entradas que dan `amount ≤ 0` se
  descartan.

Ventajas frente a reescribir: sin escrituras de migración, sin problemas de orden
de carga entre stores, idempotente por construcción. `paidCycles` se conserva
intacto en la base de datos pero deja de ser la fuente de verdad del saldo.

**Cashback de por vida:** pasa a calcularse directo de las transacciones
(`Σ cashbackEarned` de los consumos facturados de la tarjeta), en vez de depender
de los estados de cuenta pagados. Es más robusto y no depende del modelo de pago.
`getLifetimeCashback(card, transactions)` cambia de firma.

## UI / UX (página de Tarjetas)

Reemplazar el bloque "Estado de cuenta + botón Marcar como pagado" por tres
líneas jerárquicas dentro de cada tarjeta:

```
┌─ Visa Popular ───────────────────────────────┐
│ Ciclo abierto (consumo)            RD$ 5,000  │  ← gris, informativo
│ Corte al: 20 jun                              │
├───────────────────────────────────────────────┤
│ POR PAGAR antes del 5 jul                     │  ← protagonista
│                                RD$ 10,000     │
│ Abonado: RD$ 0  ·  [ Abonar ]  [ Pagar todo ] │
├───────────────────────────────────────────────┤
│ Saldo total de la tarjeta          RD$ 15,000 │  ← total acumulado
│ ⓘ incluye consumo nuevo aún sin cortar        │
└───────────────────────────────────────────────┘
```

- **"Por pagar antes del [fecha]"** es la cifra protagonista. Si `isPaid` →
  se reemplaza por **"Pagado ✓"** en verde (conserva el indicador actual).
- **"Pagar todo"**: registra un abono por el monto exacto de `pendingBilled`
  (reemplaza el botón binario, conservando la comodidad de un clic).
- **"Abonar"**: abre un modal con **campo de monto libre** (`CurrencyInput`) +
  fecha (default hoy) + nota opcional. Mismo espíritu que el modal de pago de
  Deudas. Si `billed` abarca más de un ciclo, mostrar nota "incluye saldo de
  meses anteriores".
- **Historial:** el modal de "Historial" pasa a listar **abonos** (fecha, monto,
  nota) con opción de **borrar** cada abono. El cashback acumulado se mantiene
  en la parte superior.
- **Reutiliza** `CurrencyInput`, `Modal`, `ConfirmDialog` y los estilos de
  tarjeta existentes. No se introduce diseño nuevo.

### Store

- `markStatementPaid` se reemplaza/renombra por:
  - `addCardPayment(cardId, { amount, date, note })` — agrega un abono.
  - `deleteCardPayment(cardId, paymentId)` — elimina un abono.
- Ambas persisten el array `payments` completo en Supabase (igual que hoy con
  `paid_cycles`) y actualizan el estado local.
- Toasts de confirmación ("Abono registrado", "Estado de cuenta saldado 🎉"
  cuando `pendingBilled` llega a 0).

## Casos límite y no-objetivos

- **Sin doble conteo:** el abono nunca crea transacción ni toca el presupuesto
  (a diferencia de Deudas). Es deliberado y se documenta en comentario.
- **Sobre-abono:** el excedente reduce el ciclo abierto; `max(0, …)` evita
  negativos en todas las cifras.
- **Borrar abono:** permitido (corrige errores). Editar = borrar + crear.
- **No-objetivos v1:** modelar **intereses** (eso sería la Opción B / Deudas);
  enlazar automáticamente "ingreso extra → abono"; KPI de deuda-en-tarjetas en
  el Dashboard. Anotados como mejoras futuras, fáciles de sumar después.
- **Compatibilidad:** `isStatementPaid`, `getStatementHistory` se mantienen
  funcionando tras la migración para no romper nada existente.

## Pruebas

Ampliar [creditCards.test.js](../../../src/utils/creditCards.test.js) con tests puros:

- `getCardBalances()` con el caso clienta (pago al corte) y el caso sobregasto
  (abono parcial + arrastre).
- Sobre-abono → `openCycle` baja, nada negativo.
- Migración `paidCycles → payments` deja `billed − paid = 0` en una cuenta que
  ya tenía estados de cuenta pagados.
- `getLifetimeCashback` calculado desde transacciones.
- `isPaid` con tolerancia `EPSILON`.

## Resumen de archivos a tocar

- `src/utils/creditCards.js` — `getCardBalances`, `paidCyclesToPayments`,
  `getLifetimeCashback` (nueva firma `(card, transactions)`).
- `src/utils/creditCards.test.js` — tests nuevos + actualizar los de
  `getLifetimeCashback`.
- `src/stores/useCreditCardStore.js` — `payments` en `mapFromDb`,
  `addCardPayment`, `deleteCardPayment` (reemplazan `markStatementPaid`).
- `src/pages/CreditCardsPage.jsx` — UI de 3 balances, modal de abono, historial
  de abonos.
- `src/pages/DashboardPage.jsx` y `src/components/layout/Header.jsx` — usar
  `getCardBalances().pendingBilled`/`.isPaid` para que los abonos silencien los
  recordatorios de "por pagar".
- Migración SQL en Supabase — columna `payments jsonb default '[]'`.
