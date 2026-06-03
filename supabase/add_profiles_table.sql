-- Perfil / preferencias del usuario (una fila por usuario).
-- Guarda el nivel de presupuesto elegido (Seguimiento / 50-30-20 / Base cero).
-- Correr a mano en el SQL editor de Supabase. RLS consistente con el resto.

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  budget_level text not null default 'tracking',  -- 'tracking' | '503020' | 'zero'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
