# Diseño: Tarjetas de crédito (capa de seguimiento) — FinTrack

- **Fecha:** 2026-05-29
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **Modelo elegido:** Método de pago / capa de seguimiento (NO deuda)

## 1. Contexto y objetivo

El usuario paga gastos con tarjeta de crédito aunque ya tiene el dinero en el banco
("gastas dinero que ya tienes, pero con la tarjeta"). Quiere llevar control de cada
tarjeta: a qué banco pertenece, su fecha de corte, su fecha de pago, y cuánto lleva
consumido por ciclo — **sin alterar la lógica del presupuesto** del sistema.

## 2. Principio rector (restricción del usuario)

Una compra con tarjeta **sigue siendo un gasto normal** en su categoría y cuenta **una
sola vez** en el presupuesto y en "Puedes gastar", exactamente como hoy. La tarjeta es
solo una **etiqueta** sobre la transacción que permite agrupar el consumo por ciclo y
mostrar fechas. El pago del estado de cuenta **NO** crea un gasto nuevo (evitaría doble
conteo). La capa de tarjetas es puramente informativa.

## 3. Estado actual relevante

- Transacciones en Supabase (`transactions`), almacenadas en DOP (conversión USD→DOP ya
  ocurre al guardar). No tienen noción de "tarjeta".
- Las deudas viven en `useDebtStore` (modelo distinto: balance + interés). Las tarjetas
  NO se construyen sobre ese módulo.
- Stores Zustand con `persist` (caché en localStorage) + Supabase como fuente.

## 4. Alcance v1

Incluido:
- Definir tarjetas: nombre, banco, **día de corte** y **día de pago** (ambos ingresados
  manualmente por el usuario al crear la tarjeta, **editables** después), color.
- Etiquetar una transacción (solo gastos) con una tarjeta (opcional).
- Ver, por tarjeta: **consumo del ciclo abierto** y **estado de cuenta cerrado por pagar**
  con su fecha límite.
- **Aviso de pago próximo** (alerta cuando se acerca la fecha de pago de un estado no
  saldado).
- **Marcar estado de cuenta como pagado** (informativo; no crea gasto ni toca el
  presupuesto).

Diferido (fuera de v1):
- Límite de crédito y % de uso del cupo.
- Balance que carga interés (eso sería el modelo "deuda").
- Pago del estado de cuenta como evento de flujo de caja (timing del "float").

## 5. Datos (Supabase — requiere migración manual)

El usuario debe correr este SQL en Supabase antes de usar la función:

```sql
create table if not exists credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  cutoff_day int not null check (cutoff_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  color text default '#6366f1',
  paid_cycles text[] not null default '{}',
  created_at timestamptz default now()
);

alter table transactions add column if not exists card_id uuid references credit_cards(id) on delete set null;

-- RLS (consistente con el resto de tablas del proyecto)
alter table credit_cards enable row level security;
create policy "Users manage own credit cards" on credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Notas:
- `cutoff_day` y `due_day` son **día del mes** (1–31), ambos manuales y editables.
- `paid_cycles` guarda las fechas de cierre (ISO `YYYY-MM-DD`) de los estados ya marcados
  como pagados — evita una tabla extra.
- `transactions.card_id` es nullable; `on delete set null` para que borrar una tarjeta no
  borre ni huérfane transacciones (solo les quita la etiqueta).

## 6. Lógica de ciclo (función pura, testeable)

Archivo nuevo `src/utils/creditCards.js`. A partir de una tarjeta y una fecha de
referencia (`hoy`):

- `clampDay(year, month, day)` — ajusta días inexistentes al último del mes (ej. 31→28/29
  en febrero).
- `getCardCycles(card, refDate)` → devuelve:
  - `openCycleStart` = día siguiente al último corte ≤ hoy.
  - `openCycleEnd` (próximo corte) = siguiente fecha con día = `cutoff_day` > hoy.
  - `closedStatementStart` / `closedStatementEnd` = ciclo anterior (el que cerró en el
    último corte) → es el "por pagar".
  - `closedStatementDueDate` = siguiente fecha con día = `due_day` posterior al último
    corte (usa el `due_day` manual, NO se deriva del corte).
- `getStatementAmount(transactions, cardId, start, end)` → suma de transacciones con ese
  `card_id` y `date` en `(start, end]`, en DOP.
- `isStatementPaid(card, closedStatementEndISO)` → `card.paid_cycles.includes(...)`.

Casos borde cubiertos por tests: meses cortos, `due_day` < `cutoff_day` (pago cae el mes
siguiente), tarjeta recién creada sin ciclo anterior (montos 0).

## 7. Componentes

- **`useCreditCardStore`** (`src/stores/useCreditCardStore.js`): `fetchCards`, `addCard`,
  `updateCard`, `deleteCard`, `markStatementPaid(cardId, cycleEndISO)`. Caché persistido
  (`fintrack-cards-cache`), mismo patrón que los demás stores. Se agrega su `fetchCards`
  al arranque en `App.jsx` y su clave de caché a "Borrar datos" en Ajustes.
- **`CreditCardsPage`** (`src/pages/CreditCardsPage.jsx`, ruta `/tarjetas`, lazy como las
  demás): lista de tarjetas; por cada una: banco, consumo del ciclo abierto ("cierra el
  …"), estado de cuenta cerrado por pagar + fecha límite, botón "Marcar como pagado", y
  acciones editar/eliminar. Modal de crear/editar tarjeta (nombre, banco, día de corte,
  día de pago, color).
- **Sidebar**: nueva entrada "Tarjetas".
- **`TransactionsPage`**: en el formulario, selector opcional **"Tarjeta"** visible solo
  cuando el tipo es gasto (`expense`). Se guarda `card_id`. El store de transacciones
  (`addTransaction`, `updateTransaction`, `bulkAddTransactions`) incluye `card_id` en el
  whitelist de columnas.
- **`DashboardPage`**: banner de aviso cuando un estado de cuenta no pagado vence dentro
  de N días (N = 5), con monto y fecha.

## 8. Lo que NO cambia

- `getBudgetSummary`, "Por Asignar", "Puedes gastar": **idénticos**. `card_id` no entra en
  ningún cálculo del presupuesto.
- El modelo de deudas (`useDebtStore`) no se toca.

## 9. Criterios de éxito

- Puedo crear una tarjeta con banco, día de corte y día de pago, y editarla.
- Al registrar un gasto puedo asociarlo a una tarjeta; el gasto cuenta igual que hoy en el
  presupuesto (sin cambios en "Puedes gastar").
- En "Tarjetas" veo, por tarjeta, lo consumido en el ciclo abierto y el estado cerrado por
  pagar con su fecha límite.
- El Dashboard me avisa cuando un pago está próximo y no lo he marcado pagado.
- Puedo marcar un estado de cuenta como pagado y deja de avisarme.

## 10. Archivos afectados

- Crear: `src/utils/creditCards.js`, `src/utils/creditCards.test.js`,
  `src/stores/useCreditCardStore.js`, `src/pages/CreditCardsPage.jsx`.
- Modificar: `src/App.jsx` (ruta lazy + fetch al arranque),
  `src/components/layout/Sidebar.jsx` (entrada de menú),
  `src/pages/TransactionsPage.jsx` (selector de tarjeta en el form),
  `src/stores/useTransactionStore.js` (incluir `card_id`),
  `src/pages/DashboardPage.jsx` (aviso de pago),
  `src/pages/SettingsPage.jsx` (limpiar caché de tarjetas en "Borrar datos").
- Migración SQL en Supabase (sección 5), ejecutada por el usuario.
