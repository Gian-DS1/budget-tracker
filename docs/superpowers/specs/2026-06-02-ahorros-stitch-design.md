# Diseño — Ahorros (Vaults) pulido · Stitch

Fecha: 2026-06-02 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

Ahorros (`src/stitch/screens/StitchVaults.jsx`) es la siguiente página a pulir
según `handoff.md`. Hoy usa datos reales y `<Emoji>`, pero conserva inputs
nativos (`<input type=date>`, montos sin formateo), no tiene demo branching en
formularios, ni proyección, ni historial de aportes, ni toast Deshacer.

Hay que aplicar las 14 pautas del handoff y el patrón espejo de `screens/debts/`.

### Hallazgos que motivan el diseño

1. **No existe tabla de aportes.** A diferencia de Deudas (que tiene
   `debt_payments`), `savings` no guarda aportes individuales. `addContribution`
   solo suma a `current_amount` y crea una transacción de ahorro **suelta** (sin
   enlace, no reversible).
2. **`currency` no se persiste.** La UI usa moneda por meta, pero ni la tabla
   `savings` ni el store leen/escriben `currency`: una meta en USD pierde su
   moneda al recargar (bug latente).
3. **No hay dato de aporte mensual** para proyectar la fecha de completar la
   meta, aunque `monthsToGoal`/`projectedCompletionDate` ya existen en
   `src/utils/calculations.js`.

## Decisiones (acordadas en brainstorming)

1. **Historial de aportes:** crear tabla `savings_contributions` (espejo fiel de
   `debt_payments`) con transacción enlazada (`transaction_id`). Historial con
   borrar + Deshacer que revierte saldo **y** transacción.
2. **Aporte mensual:** columna nueva `monthly_contribution` en `savings` + campo
   en el formulario. Proyección exacta (como la cuota mensual en Deudas).
3. **Moneda:** persistir `currency` en `savings` (arregla el bug). Paridad con
   Deudas/Tarjetas.
4. **Saldo inicial:** editable **solo al crear** la meta (sin generar
   transacción ni aporte). Al editar es de solo lectura; el saldo solo cambia vía
   aportes / borrado de aportes. Evita descuadres saldo↔aportes.

## Arquitectura — patrón espejo de `screens/debts/`

Carpeta nueva `src/stitch/screens/vaults/`:

| Archivo | Rol |
|---|---|
| `vaultsUi.jsx` | Primitivas locales: `Modal`, `Field`, `FormActions`, `inputCls` (copia ~40 líneas, sin acoplar a otras carpetas). Mismo contenido que `debtsUi.jsx`. |
| `projection.js` | Helper puro `getProjection(goal)` → `{ reachable, months, projectedDate, remaining, pct, done }`. Envuelve `monthsToGoal`/`projectedCompletionDate` de utils. |
| `projection.test.js` | Tests del helper (espejo de `payoff.test.js`). |
| `VaultItem.jsx` | Tarjeta del grid. |
| `VaultForm.jsx` | Modal crear/editar meta. |
| `ContributionModal.jsx` | Modal de aporte. |
| `HistoryModal.jsx` | Historial de aportes con borrar + Deshacer. |

`StitchVaults.jsx` queda como **shell delgado**: header (ahorro total) + grid
`Stagger` + estado de modales + orquestación + toast Deshacer del borrado de meta
(captura los aportes para restaurarlos en cascada en el Deshacer).

## Capa de datos

### Migración SQL — `supabase/add_savings_contributions.sql` (idempotente, corre a mano)

```sql
-- Columnas nuevas en savings
alter table public.savings add column if not exists currency text not null default 'DOP';
alter table public.savings add column if not exists monthly_contribution numeric not null default 0;

-- Tabla de aportes (espejo de debt_payments)
create table if not exists public.savings_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_id         uuid not null references public.savings(id) on delete cascade,
  amount          numeric not null,
  date            date not null,
  notes           text,
  transaction_id  uuid references public.transactions(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists savings_contributions_user_id_idx on public.savings_contributions (user_id);
create index if not exists savings_contributions_goal_id_idx on public.savings_contributions (goal_id);

alter table public.savings_contributions enable row level security;
-- Policy CRUD por user_id, mismo patrón que debt_payments (ver schema.sql).
```

El SQL canónico de la tabla se añade también a `supabase/schema.sql` (junto a
`debt_payments`), y el nombre se agrega a la lista de tablas con RLS al final del
schema.

### `src/stores/useSavingsStore.js`

- **Estado:** añadir `contributions: []` (espejo de `payments` en `useDebtStore`).
- `fetchGoals`: mapear también `currency` y `monthlyContribution`
  (`monthly_contribution`). Cargar `contributions` en paralelo
  (`from('savings_contributions')`), formateadas con `goalId`/`transactionId`.
- `addGoal`: persistir `currency` y `monthly_contribution`. El `currentAmount`
  recibido es el **saldo inicial** (se guarda tal cual, sin aporte ni
  transacción).
- `updateGoal`: persistir `currency`/`monthlyContribution` cuando vengan.
  **El formulario de edición no envía `currentAmount`** (el saldo solo cambia vía
  aportes). `updateGoal` sigue aceptando `currentAmount` a nivel de función
  porque `addContribution`/`deleteContribution` lo usan internamente para mover el
  saldo; lo que cambia es que `VaultForm` (edición) deja de mandarlo. La
  derivación de `status` (completed cuando current>=target) se conserva.
- **Reemplazar** `addContribution(id, amount)` por
  `addContribution(goalId, amount, date, notes)`:
  1. inserta fila en `savings_contributions`,
  2. suma `amount` al `current_amount` de la meta (vía update),
  3. crea la transacción de ahorro enlazada (`type: 'savings'`,
     `categoryId = savingsCategoryId()`, `description = 'Aporte a meta - {título}'`),
  4. guarda `transaction_id` en la fila del aporte.
  Espejo de `addPayment` en `useDebtStore`.
- **Nuevos:**
  - `deleteContribution(id)`: borra la fila, **revierte** el saldo de la meta y
    borra la transacción enlazada vía `deleteTransactionSilent`. Devuelve
    `{ ok, hadTransactionLink }` (igual que `deletePayment`).
  - `restoreContribution(c)`: recrea el aporte (para el Deshacer).
- Helper `savingsCategoryId()`: resuelve la categoría de ahorro
  (`slug === 'ahorro' || type === 'savings'`), cae a `''` si no hay.

### `src/stitch/demoMode.js`

Mutadores nuevos (espejo de los de deuda), porque en demo no hay sesión Supabase:

- `demoAddGoal(goal)`, `demoUpdateGoal(id, updates)`.
- `demoDeleteGoal(id)`: cascade — borra la meta + sus aportes + las transacciones
  enlazadas de esos aportes.
- `demoRestoreGoal(goal, contributions)`: restaura meta + aportes + recrea
  transacciones enlazadas.
- `demoAddContribution(goalId, amount, date, notes)`: crea aporte + transacción
  enlazada + suma al saldo (espejo de `demoAddDebtPayment`).
- `demoDeleteContribution(id)`: revierte saldo + borra transacción enlazada.
- Helper `demoSavingsCategoryId()` (análogo a `demoLoanCategoryId`).
- `seedDemoStores`: sembrar `contributions: []` en `useSavingsStore`.

## Capa de presentación

### Categoría de la transacción de ahorro

`savingsCategoryId()` resuelve una categoría de tipo `savings`; si no existe, cae
a `''`. La transacción siempre lleva `type: 'savings'` (lo que lee el motor de
presupuesto). Descripción: `Aporte a meta - {título}`.

### `VaultItem.jsx` (tarjeta del grid) — espejo visual de `DebtItem`

- **Header:** emoji (cuadro) + título + badge `USD` si `currency === 'USD'`.
- **Saldo grande:** `currentAmount` (verde lima `#bdd200` si completada).
- **Barra de progreso** + línea `Meta: X · NN.N%`.
- **Caja de proyección** (análoga al payoff):
  - `monthlyContribution > 0` y falta saldo → `event_available` + "Completa en N
    meses" + fecha (`projectedCompletionDate`) + "Aporte mensual: X".
  - `monthlyContribution = 0` → aviso suave "Define un aporte mensual para ver la
    proyección".
  - completada → estado "Meta completada".
- **Botones:** `Abonar` (principal) · Historial · Editar · Eliminar (mismo layout
  que `DebtItem`).
- **Meta pausada** (`status: 'paused'`): opacidad reducida (se conserva el dato y
  el comportamiento actual).

### `VaultForm.jsx` (crear/editar)

Campos: Nombre (input) · Meta (`StitchCurrencyInput`) · **Saldo inicial**
(`StitchCurrencyInput`, **solo visible al crear**) · Aporte mensual
(`StitchCurrencyInput`) · Fecha límite (`StitchDatePicker`) · Moneda
(`StitchSelect` DOP/USD) · Ícono (grid de `<Emoji>`). Demo branching + toast.

### `ContributionModal.jsx` (aporte)

Monto (`StitchCurrencyInput`, prellenado con `monthlyContribution` si existe) +
Fecha (`StitchDatePicker`, max hoy) + Nota opcional. Nota informativa: "Se suma a
la meta y se crea una transacción de ahorro enlazada". Demo branching + toast
("🎉 ¡Meta completada!" si el aporte la completa).

### `HistoryModal.jsx` (historial de aportes)

Lee la meta **viva** del store. Resumen: total aportado + saldo actual +
proyección. Lista de aportes (monto, fecha, nota) con borrar + Deshacer (6s) que
revierte saldo y transacción. Espejo de `debts/HistoryModal.jsx`.

### `StitchVaults.jsx` (shell)

Header (ahorro total acumulado) + botón Nueva meta + grid `Stagger` (o estado
vacío) + estado de los 4 modales + orquestación + toast Deshacer del borrado de
meta (captura aportes para restaurar en cascada).

## Pautas aplicadas (handoff §1–14)

`<Emoji>` siempre · `StitchSelect`/`StitchDatePicker`/`StitchCurrencyInput` en vez
de nativos · `DropdownPanel` (ya dentro de esos componentes) · ISO local sin
`toISOString` · animación Emil (`EASE_OUT`, `Stagger`, reduced-motion) · íconos
Material Symbols con `!text-[Npx]` · tokens del tema · español sentence-case ·
demo branching en toda alta/edición/borrado/aporte · checkbox `.stitch-check` si
hiciera falta · ningún dropdown recorta ni genera scroll externo.

## Testing y verificación

- `projection.test.js`: casos de `getProjection` (aporte 0 → no reachable;
  completada → done; cálculo de meses/fecha; saldo > meta).
- Por página (handoff): `npm run build`, `npm run lint` (0 errores),
  `npm run test` (deben seguir pasando los 77 + los nuevos del helper).
- `http://localhost:5173/` responde 200; recorrer Ahorros en modo demo: crear /
  editar / abonar / ver historial / borrar aporte (Deshacer) / borrar meta
  (Deshacer).

## Fuera de alcance (YAGNI)

- Editar el saldo a mano tras crear (se decidió solo-lectura post-creación).
- Aporte mensual derivado de promedio histórico (se eligió campo declarado).
- Categorías de ahorro por meta o múltiples monedas por aporte.
