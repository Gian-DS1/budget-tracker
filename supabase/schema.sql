-- ============================================================================
-- FinTrack RD — Esquema completo de base de datos (Supabase / PostgreSQL)
-- ============================================================================
-- Ejecuta este archivo COMPLETO en el SQL Editor de tu proyecto Supabase para
-- dejar la base de datos lista. Es idempotente: puedes correrlo varias veces.
--
-- Modelo de seguridad:
--   - Cada tabla tiene una columna `user_id` que referencia auth.users.
--   - Row Level Security (RLS) está ACTIVADO en todas las tablas y la política
--     permite a cada usuario ver/editar SOLO sus propias filas (auth.uid()).
--   - Sin RLS, la llave anónima (pública) permitiría leer datos de todos los
--     usuarios. Por eso RLS es OBLIGATORIO y este script lo configura.
--
-- Nota: las tablas creadas por SQL crudo NO otorgan privilegios automáticamente
-- a los roles de Supabase, por eso al final se hacen los GRANT explícitos.
-- ============================================================================

-- ── Categorías ──────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  type               text not null,                 -- income | fixed_expense | variable_expense | savings
  icon               text,
  color              text,
  slug               text,
  keywords           text[] not null default '{}',
  is_active          boolean not null default true,
  sort_order         integer not null default 0,
  is_accumulative    boolean not null default false,
  accumulation_start text,                           -- 'YYYY-MM' (bote/sinking fund)
  created_at         timestamptz not null default now()
);

-- ── Tarjetas de crédito ─────────────────────────────────────────────────────
create table if not exists public.credit_cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  bank           text,
  cutoff_day     integer not null,                  -- día de corte (1-31)
  due_day        integer not null,                  -- día de pago (1-31)
  color          text default '#6366f1',
  paid_cycles    jsonb not null default '[]'::jsonb,  -- historial de estados de cuenta pagados
  cashback_rules jsonb not null default '[]'::jsonb,  -- [{ categoryId, percentage }]
  created_at     timestamptz not null default now()
);

-- ── Transacciones ───────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  card_id         uuid references public.credit_cards(id) on delete set null,
  amount          numeric not null,                 -- siempre en DOP (moneda base)
  type            text not null,                    -- income | expense | fixed_expense | variable_expense | savings
  description     text,
  date            date not null,
  notes           text,
  currency        text not null default 'DOP',
  cashback_earned numeric not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ── Presupuestos (base cero, por mes y categoría) ───────────────────────────
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount      numeric not null default 0,
  month       text not null,                         -- 'YYYY-MM'
  created_at  timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ── Metas de ahorro ─────────────────────────────────────────────────────────
create table if not exists public.savings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  target_amount  numeric not null default 0,
  current_amount numeric not null default 0,
  deadline       date,
  icon           text,
  color          text,
  status         text not null default 'active',     -- active | paused | completed
  created_at     timestamptz not null default now()
);

-- ── Deudas ──────────────────────────────────────────────────────────────────
create table if not exists public.debts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  creditor_name   text not null,
  total_amount    numeric not null default 0,
  current_balance numeric not null default 0,
  interest_rate   numeric not null default 0,
  minimum_payment numeric not null default 0,        -- "pago mensual" en la UI
  due_date        date,                              -- fecha de pago (alimenta los recordatorios)
  status          text not null default 'active',    -- active | paid_off
  currency        text not null default 'DOP',
  created_at      timestamptz not null default now()
);

-- ── Pagos de deudas ─────────────────────────────────────────────────────────
create table if not exists public.debt_payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  debt_id           uuid not null references public.debts(id) on delete cascade,
  amount            numeric not null,
  date              date not null,
  remaining_balance numeric,
  notes             text,
  created_at        timestamptz not null default now()
);

-- ── Plan financiero (metas a corto/mediano/largo plazo) ─────────────────────
create table if not exists public.plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  description    text,
  target_amount  numeric not null default 0,
  current_amount numeric not null default 0,
  deadline       date,
  type           text,                               -- short | medium | long (horizonte)
  status         text not null default 'pending',    -- pending | in_progress | completed
  created_at     timestamptz not null default now()
);

-- ── Transacciones recurrentes (plantillas) ──────────────────────────────────
create table if not exists public.recurring_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  card_id     uuid references public.credit_cards(id) on delete set null,
  amount      numeric not null,
  type        text not null,
  description text,
  notes       text,
  currency    text not null default 'DOP',
  frequency   text not null default 'monthly',       -- weekly | biweekly | monthly
  next_date   date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security + políticas "solo mis filas" + grants para cada tabla.
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'categories', 'credit_cards', 'transactions', 'budgets', 'savings',
    'debts', 'debt_payments', 'plans', 'recurring_transactions'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_own', t
    );
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated, service_role;',
      t
    );
  end loop;
end $$;
