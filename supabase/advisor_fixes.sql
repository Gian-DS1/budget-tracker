-- ============================================================================
-- FinTrack RD — Arreglos de los avisos del Security & Performance Advisor
-- ============================================================================
-- CÓMO USAR:
--   1. Abre Supabase Dashboard > SQL Editor.
--   2. Corre TODO el archivo de una vez. Es idempotente (puedes repetirlo).
--   3. En el Advisor, pulsa "Refresh". Los warnings deben bajar a 0.
--   4. El aviso "Leaked Password Protection" NO es SQL: actívalo en el panel
--      (ver PASO 4 al final).
--
-- Qué arregla:
--   PASO 1 · Quita el permiso de ejecución público sobre la función
--            SECURITY DEFINER `rls_auto_enable()` (los 2 warnings de Security).
--   PASO 2 · Crea índices que faltaban sobre las foreign keys (Performance:
--            "Unindexed foreign keys").
--   PASO 3 · Reescribe las políticas RLS para evaluar auth.uid() UNA vez por
--            consulta y no por fila (Performance: "Auth RLS Initialization
--            Plan"). De paso, deja de otorgar permisos al rol `anon`
--            (endurecimiento: el cliente anónimo no necesita tocar estas tablas).
-- ============================================================================


-- ── PASO 1 · Función SECURITY DEFINER expuesta ──────────────────────────────
-- `rls_auto_enable()` corre con privilegios elevados (DEFINER). Que cualquiera
-- (anon / authenticated / public) pueda ejecutarla es un riesgo de escalada.
-- La app NUNCA la llama desde el cliente, así que revocamos su ejecución.
-- Hecho de forma dinámica para cubrir cualquier firma que tenga la función.
do $$
declare
  fn text;
begin
  for fn in
    select 'public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'rls_auto_enable'
  loop
    execute 'revoke execute on function ' || fn || ' from public, anon, authenticated';
  end loop;
end $$;

-- Alternativa: si confirmas que NO usas esta función para nada, en vez de
-- revocar puedes eliminarla por completo (descomenta la línea):
-- drop function if exists public.rls_auto_enable();


-- ── PASO 2 · Índices para las foreign keys ──────────────────────────────────
-- Una FK sin índice hace lentos los JOIN y, sobre todo, los DELETE en cascada.
-- (transactions.user_id ya está cubierto por transactions_user_date_idx.)
create index if not exists categories_user_id_idx               on public.categories (user_id);
create index if not exists credit_cards_user_id_idx             on public.credit_cards (user_id);
create index if not exists transactions_category_id_idx         on public.transactions (category_id);
create index if not exists transactions_card_id_idx             on public.transactions (card_id);
create index if not exists budgets_user_id_idx                  on public.budgets (user_id);
create index if not exists budgets_category_id_idx              on public.budgets (category_id);
create index if not exists savings_user_id_idx                  on public.savings (user_id);
create index if not exists debts_user_id_idx                    on public.debts (user_id);
create index if not exists debt_payments_user_id_idx            on public.debt_payments (user_id);
create index if not exists debt_payments_debt_id_idx            on public.debt_payments (debt_id);
create index if not exists plans_user_id_idx                    on public.plans (user_id);
create index if not exists recurring_transactions_user_id_idx   on public.recurring_transactions (user_id);
create index if not exists recurring_transactions_category_id_idx on public.recurring_transactions (category_id);
create index if not exists recurring_transactions_card_id_idx   on public.recurring_transactions (card_id);


-- ── PASO 3 · Optimizar políticas RLS + quitar grants a `anon` ───────────────
-- `auth.uid() = user_id` se re-evalúa por CADA fila. Envolverlo en un subquery
-- `(select auth.uid())` hace que Postgres lo evalúe UNA sola vez por consulta.
-- Mismo resultado de seguridad, mucho más rápido en tablas grandes.
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
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);',
      t || '_own', t
    );
    -- Endurecimiento: el cliente anónimo no debe tener privilegios sobre estas
    -- tablas. RLS ya lo bloqueaba, pero quitar el grant es defensa en profundidad.
    execute format('revoke all on public.%I from anon;', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role;', t);
  end loop;
end $$;


-- ── PASO 4 · (Manual, NO SQL) Leaked Password Protection ────────────────────
-- En el Dashboard: Authentication > Sign In / Providers > sección de contraseñas
-- (o Authentication > Policies según versión) y activa
-- "Leaked password protection". Bloquea contraseñas filtradas (HaveIBeenPwned).
