-- ── Grupos de presupuesto ────────────────────────────────────────────────────
-- Permite agrupar varias categorías para ver su total combinado en Presupuesto
-- (p. ej. Bravo + Grupo CCN + Supermercado = "Supermercados").
-- Idempotente: seguro de re-correr en una base con datos.

create table if not exists public.budget_groups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  icon         text,
  category_ids uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists budget_groups_user_id_idx on public.budget_groups (user_id);

alter table public.budget_groups enable row level security;
drop policy if exists budget_groups_own on public.budget_groups;
create policy budget_groups_own on public.budget_groups for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.budget_groups from anon;
grant select, insert, update, delete on public.budget_groups to authenticated, service_role;
