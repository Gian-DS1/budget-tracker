# Modelo de datos — Supabase (PostgreSQL)

> Fuente: `supabase/schema.sql` (idempotente). 9 tablas, todas con `user_id` →
> `auth.users(id) ON DELETE CASCADE`, **RLS activado** (cada usuario ve/edita solo sus
> filas: `auth.uid() = user_id`). `anon` no toca estas tablas; solo `authenticated`/`service_role`.

## Convención snake_case (DB) ↔ camelCase (app)

La DB usa `snake_case`; los stores mapean a `camelCase` al cargar y de vuelta al guardar.
Ej: `category_id↔categoryId`, `cashback_earned↔cashbackEarned`, `is_active↔isActive`,
`cutoff_day↔cutoffDay`, `target_amount↔targetAmount`, `current_balance↔currentBalance`.

## Tablas

### categories
`id, user_id, name, type, icon, color, slug, keywords text[], is_active, sort_order,
is_accumulative, accumulation_start('YYYY-MM'), created_at`.
`type`: `income | fixed_expense | variable_expense | savings`.

### credit_cards
`id, user_id, name, bank, cutoff_day(1-31), due_day(1-31), color, paid_cycles jsonb(legado),
payments jsonb([{id,amount,date,note}]), cashback_rules jsonb([{categoryId,percentage}]),
catalog_id(null=personalizada), created_at`.

### transactions
`id, user_id, category_id(→categories ON DELETE SET NULL), card_id(→credit_cards SET NULL),
amount numeric(SIEMPRE DOP), type, description, date, notes, currency(default 'DOP'),
cashback_earned numeric, created_at`. Índice `(user_id, date desc)`.
`type`: `income | expense | fixed_expense | variable_expense | savings`.

### budgets
`id, user_id, category_id(→categories ON DELETE CASCADE), amount, month('YYYY-MM'),
created_at`. **UNIQUE (user_id, category_id, month)** — un presupuesto por categoría/mes.

### savings
`id, user_id, title, target_amount, current_amount, deadline, icon, color,
status('active'|'paused'|'completed'), created_at`.

### debts
`id, user_id, creditor_name, total_amount, current_balance, interest_rate,
minimum_payment(="pago mensual"), due_date(alimenta recordatorios), status('active'|'paid_off'),
currency, created_at`.

### debt_payments
`id, user_id, debt_id(→debts ON DELETE CASCADE), amount, date, remaining_balance, notes,
transaction_id(→transactions ON DELETE SET NULL), created_at`.
> ⭐ `transaction_id` enlaza el pago con su transacción autogenerada (para revertir exacto).
> `ON DELETE SET NULL`: si la tx se borra por otro lado, el pago no se cae, solo pierde enlace.

### plans
`id, user_id, title, description, target_amount, current_amount, deadline,
type(short|medium|long = horizonte), status('pending'|'in_progress'|'completed'), created_at`.

### recurring_transactions
`id, user_id, category_id(SET NULL), card_id(SET NULL), amount, type, description, notes,
currency, frequency('weekly'|'biweekly'|'monthly'), next_date, active, created_at`.

## Relaciones clave

```
auth.users 1──* (todas las tablas vía user_id, CASCADE)
categories 1──* transactions / budgets / recurring_transactions   (SET NULL / CASCADE)
credit_cards 1──* transactions / recurring_transactions           (SET NULL)
debts 1──* debt_payments                                          (CASCADE)
transactions 1──1 debt_payments.transaction_id                    (SET NULL, enlace de reversión)
```

## Migraciones auxiliares en `supabase/`

- `add_card_payments_column.sql` — añade `payments` jsonb a tarjetas (abonos).
- `add_vehiculo_categories.sql` — categorías de vehículo.
- `cleanup_duplicate_categories.sql` — limpieza de duplicados.
- `advisor_fixes.sql` — recomendaciones del advisor (RLS/índices/perf).

> **Workflow de despliegue:** push a `main` despliega en Vercel; las migraciones SQL en
> `supabase/` se corren A MANO en el SQL Editor de Supabase (no hay migración automática).
