-- Ahorros: aportes individuales + moneda + aporte mensual por meta.
-- Correr a mano en el SQL editor de Supabase. Idempotente. RLS consistente.

-- Columnas nuevas en savings.
alter table public.savings add column if not exists currency text not null default 'DOP';
alter table public.savings add column if not exists monthly_contribution numeric not null default 0;

-- Tabla de aportes (espejo de debt_payments): enlaza la transacción autogenerada
-- para poder revertirla exactamente al eliminar el aporte.
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

create index if not exists savings_contributions_user_id_idx        on public.savings_contributions (user_id);
create index if not exists savings_contributions_goal_id_idx        on public.savings_contributions (goal_id);
create index if not exists savings_contributions_transaction_id_idx on public.savings_contributions (transaction_id);

alter table public.savings_contributions enable row level security;

drop policy if exists savings_contributions_own on public.savings_contributions;
create policy savings_contributions_own on public.savings_contributions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.savings_contributions from anon;
grant select, insert, update, delete on public.savings_contributions to authenticated, service_role;
