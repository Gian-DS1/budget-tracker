# Fase 2: conectar el modelo financiero a Supabase — Diseño

**Fecha:** 2026-06-15
**Tipo:** Persistencia + despliegue a producción
**Alcance:** Cuenta REAL (Supabase). Incluye migración SQL y deploy a Vercel.
**Estado:** Diseño aprobado en brainstorming, pendiente de plan de implementación

---

## Contexto y motivación

El modelo financiero (efectivo líquido, saldo inicial, cascada efectivo→ahorro) se
construyó y probó **solo en modo demo** (`isDemoActive()`). En producción, con cuentas
reales, no funciona: la lógica vive tras el flag demo y depende de datos que no existen
en Supabase (`initialCashBalance`, `savingsUsed` en pagos).

Esta fase 2 **conecta todo a Supabase** para que el modelo funcione con usuarios reales:
migración SQL mínima, persistencia en los stores reales (espejo de los mutadores demo
ya probados), y el campo de efectivo inicial en onboarding + Ajustes.

## Objetivo

Que en producción un usuario real pueda:
1. Declarar su **efectivo inicial** (en onboarding y/o Ajustes), persistido en `profiles`.
2. Ver su **efectivo líquido** real calculado de sus transacciones + saldo inicial.
3. Usar la **cascada** real: al pagar deuda/tarjeta sin efectivo suficiente, tomar de
   una meta (con aviso), con reversa exacta al borrar el pago.

## Decisiones (cerradas en brainstorming)

| Decisión | Resolución |
| --- | --- |
| Cómo declara el saldo inicial | **Onboarding + editable en Ajustes** |
| Usuarios existentes | Arrancan en **0** + el aviso "Declara tu efectivo" del dashboard (ya existe) |
| Alcance | **Todo a cuenta real**: SQL + stores + onboarding + quitar ramas demo de la cascada |
| Riesgo de la cascada | **Activar para todos** (sin flag). Red de seguridad = tests, no flag |
| Enfoque de código | **Gemelo del orquestador en el store real** (patrón demo/real existente) |

## No-objetivos (YAGNI)

- NO flag de activación gradual (se activa para todos).
- NO inferir el saldo inicial de usuarios existentes (arrancan en 0).
- NO cambios visuales nuevos (el rediseño ya está en esta rama).
- NO tocar la lógica de los selectores (ya es agnóstica del entorno y está testeada).

---

## Sección 1 — Migración SQL

Dos cambios, en archivos nuevos en `supabase/` (se corren a mano antes del deploy).
Ambos idempotentes y no destructivos.

**`supabase/add_initial_cash_balance.sql`:**
```sql
alter table public.profiles
  add column if not exists initial_cash_balance numeric not null default 0;
```

**`supabase/add_debt_payment_savings_used.sql`:**
```sql
alter table public.debt_payments
  add column if not exists savings_used jsonb not null default '[]'::jsonb;
```

- **Tarjetas:** `credit_cards.payments` ya es JSONB → `savingsUsed` entra en el JSON de
  cada pago, sin migración.
- **Aportes negativos (retiros):** se registran como filas normales en
  `savings_contributions` (amount negativo); la tabla ya lo acepta (verificado:
  `addContribution` usa `currentAmount + value`, negativo baja la meta).
- **Usuarios existentes:** `default 0` → arrancan con efectivo inicial 0.
- Actualizar `supabase/MIGRATIONS.md` con las dos migraciones nuevas.

---

## Sección 2 — Stores reales

Espejo de los `demoXxx` ya probados. La lógica de decisión (selectores) NO se duplica.

### `usePrefsStore`

- **`fetchPrefs`:** añadir `initial_cash_balance` al `select` de `profiles` y mapearlo a
  `initialCashBalance` en el estado (junto a budget_level/tutorial_seen/currency).
- **`setInitialCashBalance`:** hoy solo hace `set()` en memoria. Añadir el upsert a
  `profiles` siguiendo el patrón EXACTO de `setBudgetLevel`/`setCurrency`: set optimista,
  `if (isDemoActive()) return` antes del upsert, rollback en error.
- **`partialize`:** añadir `initialCashBalance` para que persista en el caché local
  (sessionStorage), igual que budgetLevel/currency.

### `useDebtStore`

- **`addPaymentWithCascade(debtId, amount, date, notes, savingsPick)`:** si `savingsPick`
  ({ goalId, amount }) no es null: primero `useSavingsStore.getState().addContribution(
  savingsPick.goalId, -Math.abs(savingsPick.amount), date, 'Retiro para pago de deuda')`
  (retiro real → fila negativa en `savings_contributions`, baja la meta, devuelve efectivo
  vía getLiquidCash). Luego `addPayment(...)` con `savings_used: [{ goalId, amount }]` en el
  insert. Espejo de `applyDebtPaymentWithCascade` (demo).
- **`addPayment`:** aceptar y persistir `savingsUsed` (insertar `savings_used` en
  `debt_payments`). Por defecto `[]`.
- **`deletePayment`:** antes de borrar, si el pago tiene `savings_used`, por cada
  `{ goalId, amount }` llamar `addContribution(goalId, +amount, ...)` (devuelve a la meta).
  Luego el borrado normal (ya existe). Espejo de `demoDeleteDebtPayment`.
- **`fetchDebts`/mapeo:** leer `savings_used` de `debt_payments` y mapearlo a `savingsUsed`.

### `useCreditCardStore`

- **`addCardPaymentWithCascade(cardId, payload, savingsPick)`:** igual; el `savingsUsed` va
  dentro del JSON del pago de tarjeta (sin SQL). Espejo de `applyCardPaymentWithCascade`.
- **`addCardPayment`:** aceptar `savingsUsed` en el payload y guardarlo en el JSON del pago.
- **`deleteCardPayment`:** revertir el ahorro (devolver a la meta) antes de quitar el pago.

---

## Sección 3 — Quitar las ramas `isDemoActive` (sin cascada) de los modales

En `debts/PaymentModal.jsx` y `cards/PaymentModal.jsx`, hoy la rama real dice
"cuenta real: sin cascada". Cambiar a usar el método real con cascada:

```javascript
// PaymentModal de deudas — applyPayment:
if (isDemoActive()) {
  if (savingsPick) applyDebtPaymentWithCascade(debt.id, amt, date, note.trim(), savingsPick);
  else demoAddDebtPayment(debt.id, amt, date, note.trim());
} else {
  if (savingsPick) addPaymentWithCascade(debt.id, amt, date, note.trim(), savingsPick);
  else addPayment(debt.id, amt, date, note.trim());
}
```

(Análogo para tarjetas con `addCardPaymentWithCascade`/`addCardPayment`.)

El flujo de decisión (calcular faltante con `getCashShortfall`, validar con
`canAffordPayment`, abrir `SavingsPickerModal`, bloquear) **ya es común a demo y real** —
no cambia. Solo se reemplaza la llamada final de la rama real.

> Importante: hoy ese flujo de decisión está **gateado** por `if (!isDemoActive()) { applyPayment(amt, null); return; }` (la cascada solo corre en demo). Hay que **quitar ese gate** para que el cálculo de faltante también corra en cuenta real. El `getCashShortfall` necesita las transacciones y el `initialCashBalance` reales, que ya están disponibles vía los stores.

---

## Sección 4 — Onboarding + Ajustes

### Ajustes (`StitchSettings.jsx`)

El campo "Efectivo inicial" ya existe pero hoy: (a) solo se muestra en demo, (b) llama
`demoSetInitialCashBalance`. Cambiar:
- Mostrarlo también en cuenta real (quitar el gate `demo &&` de su visibilidad).
- Ramificar el onChange: demo → `demoSetInitialCashBalance`; real → `setInitialCashBalance`
  (que ahora persiste a Supabase).
- El valor leído ya viene de `usePrefsStore((s) => s.initialCashBalance)`, que tras la
  Sección 2 se hidrata de `profiles`.

### Onboarding (`CurrencyOnboarding` o el componente del flujo de moneda)

- Añadir un campo opcional "¿Cuánto efectivo tienes hoy?" tras elegir la moneda.
- Si el usuario lo deja vacío → 0 (puede declararlo después en Ajustes).
- Al confirmar, persistir vía `setInitialCashBalance`.
- Verificar en implementación el nombre/ubicación exactos del componente de onboarding
  de moneda (gateado por `currency === null`).

### Usuarios existentes

No ven el onboarding (ya eligieron moneda) → `initial_cash_balance` queda en 0 → el
dashboard muestra el banner "Declara tu efectivo actual" (ya implementado) con enlace a
Ajustes. Cero migración de datos.

---

## Manejo de errores / casos borde

- **SQL no corrido antes del deploy:** si `fetchPrefs` lee `initial_cash_balance` y la
  columna no existe, Supabase devuelve error. Mitigar: el `select` debe degradar con
  gracia (como `savings_contributions` ya hace: "puede no existir aún; degrada a []").
  El plan correrá el SQL ANTES del push. Documentar el orden en el deploy.
- **Retiro negativo en el histórico de transacciones:** el aporte negativo crea una
  transacción `savings` de monto negativo. Verificar en implementación que el histórico
  de transacciones y los selectores la muestran/manejan sin romperse (el donut ya ignora
  savings; `getLiquidCash` la suma correctamente). Si se ve confusa en el ledger, evaluar
  una etiqueta, pero NO es bloqueante.
- **Cascada sin metas elegibles:** mismo comportamiento que demo (bloquea con mensaje).
- **Cuenta real sin saldo declarado (0):** el efectivo = 0 + flujo de transacciones; puede
  quedar negativo si hay gastos sin saldo inicial. Es información real; el banner invita a
  declararlo.

## Testing

- **Selectores:** ya testeados (`getCashShortfall`, `canAffordPayment`, `getLiquidCash`).
  Sin cambios; siguen verdes.
- **Persistencia:** la lógica de los stores reales es I/O a Supabase (no unit-testeable
  sin mocks que el repo no usa). Se verifica con inspección en una cuenta real de prueba.
- **Verificación:** `npm run build` + `npm test` verde + ESLint + inspección manual:
  (1) demo sigue funcionando igual; (2) en cuenta real de prueba: declarar efectivo en
  Ajustes persiste tras recargar; pagar con cascada toma de la meta y persiste; borrar el
  pago revierte; el onboarding pide el efectivo a un usuario nuevo.

## Despliegue

**Orden estricto (la SQL primero):**
1. Correr `add_initial_cash_balance.sql` y `add_debt_payment_savings_used.sql` a mano en
   Supabase (producción).
2. Verificar que las columnas existen.
3. Push a `main` → Vercel despliega.

Si se invierte el orden (deploy antes que SQL), el código que lee `initial_cash_balance`
falla hasta correr la SQL. Por eso el plan deja el deploy como paso final manual del
usuario, no automatizado.

## Reversibilidad

Las columnas nuevas son aditivas (no destructivas); revertir el código deja columnas sin
uso (inofensivas). La cascada real se puede desactivar restaurando las ramas
`isDemoActive` de los modales. Sin pérdida de datos.

## Criterios de éxito

En producción, un usuario real declara su efectivo, ve su saldo líquido real, y paga
deudas/tarjetas con la cascada efectivo→ahorro funcionando (con aviso y reversa) — el
mismo modelo que se probó en demo, ahora persistido en Supabase y activo para todos.
