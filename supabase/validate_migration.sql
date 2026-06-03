-- ============================================================================
-- VALIDACIÓN de las migraciones del rediseño (Plan→Ahorros + aportes).
-- Correr a mano en el SQL editor de Supabase DESPUÉS de:
--   1. add_savings_contributions.sql
--   2. add_savings_horizon.sql
--
-- Solo LEE: no modifica nada. Es ROBUSTO: si falta una columna/tabla, lo reporta
-- en vez de abortar (usa SQL dinámico, así no referencia columnas inexistentes).
-- Los resultados salen como mensajes NOTICE en la pestaña "Messages"/"Logs"
-- del SQL editor (no como tabla de filas).
-- ============================================================================
do $$
declare
  has_currency  boolean;
  has_monthly   boolean;
  has_horizon   boolean;
  has_contrib   boolean;
  has_plans     boolean;
  has_rls       boolean;
  has_policy    boolean;
  n             bigint;
  n2            bigint;
begin
  -- Helpers: existencia de columnas/tablas vía catálogo (nunca abortan).
  has_currency := exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='currency');
  has_monthly  := exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='monthly_contribution');
  has_horizon  := exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='horizon');
  has_contrib  := to_regclass('public.savings_contributions') is not null;
  has_plans    := to_regclass('public.plans') is not null;

  raise notice '==================================================================';
  raise notice 'VALIDACIÓN DE MIGRACIÓN — Plan→Ahorros + aportes';
  raise notice '==================================================================';

  -- ── 1. Columnas nuevas en savings ──────────────────────────────────────────
  raise notice '[1] COLUMNAS EN savings';
  raise notice '    savings.currency .............. %', case when has_currency then '✅ PASS' else '❌ FAIL — corre add_savings_contributions.sql' end;
  raise notice '    savings.monthly_contribution .. %', case when has_monthly  then '✅ PASS' else '❌ FAIL — corre add_savings_contributions.sql' end;
  raise notice '    savings.horizon ............... %', case when has_horizon  then '✅ PASS' else '❌ FAIL — corre add_savings_horizon.sql' end;

  -- ── 2. Tabla savings_contributions + RLS + policy ──────────────────────────
  raise notice '[2] TABLA savings_contributions';
  if has_contrib then
    has_rls := exists (select 1 from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
      where ns.nspname='public' and c.relname='savings_contributions' and c.relrowsecurity);
    has_policy := exists (select 1 from pg_policies
      where schemaname='public' and tablename='savings_contributions' and policyname='savings_contributions_own');
    raise notice '    tabla existe .................. ✅ PASS';
    raise notice '    RLS habilitado ............... %', case when has_rls then '✅ PASS' else '❌ FAIL' end;
    raise notice '    policy _own .................. %', case when has_policy then '✅ PASS' else '❌ FAIL' end;
  else
    raise notice '    tabla existe .................. ❌ FAIL — corre add_savings_contributions.sql';
  end if;

  -- ── 3. Migración de datos plans → savings ──────────────────────────────────
  raise notice '[3] MIGRACIÓN DE DATOS plans → savings';
  if not has_plans then
    raise notice '    ✅ N/A — no existe la tabla plans (nada que migrar)';
  elsif not has_horizon then
    raise notice '    ⏭  PENDIENTE — falta savings.horizon; corre add_savings_horizon.sql y vuelve a validar';
  else
    -- Planes sin su meta equivalente (por user_id + título esperado).
    execute $q$
      with esperado as (
        select p.user_id,
               case when p.description is not null and length(trim(p.description)) > 0
                    then p.title || ' — ' || p.description else p.title end as expected_title
        from public.plans p
      )
      select count(*) from esperado e
      where not exists (select 1 from public.savings s
                        where s.user_id = e.user_id and s.title = e.expected_title)
    $q$ into n;
    execute 'select count(*) from public.plans' into n2;
    if n2 = 0 then
      raise notice '    ✅ PASS — no había planes que migrar';
    elsif n = 0 then
      raise notice '    ✅ PASS — los % planes tienen su meta en savings', n2;
    else
      raise notice '    ❌ FAIL — % de % planes SIN migrar (corre el query de detalle abajo)', n, n2;
    end if;
  end if;

  -- ── 4. Conteos de referencia ───────────────────────────────────────────────
  raise notice '[4] CONTEOS';
  if has_plans then execute 'select count(*) from public.plans' into n; raise notice '    planes (tabla plans) ......... %', n; end if;
  execute 'select count(*) from public.savings' into n; raise notice '    metas (tabla savings) ........ %', n;
  if has_horizon then execute 'select count(*) from public.savings where horizon is not null' into n; raise notice '    metas con horizonte .......... %', n; end if;
  if has_contrib then execute 'select count(*) from public.savings_contributions' into n; raise notice '    aportes (contributions) ...... %', n; end if;

  -- ── 5. Integridad (currency / monthly_contribution sin NULL) ───────────────
  raise notice '[5] INTEGRIDAD';
  if has_currency then
    execute 'select count(*) from public.savings where currency is null' into n;
    raise notice '    metas con currency NULL ...... % %', n, case when n=0 then '✅' else '❌' end;
  end if;
  if has_monthly then
    execute 'select count(*) from public.savings where monthly_contribution is null' into n;
    raise notice '    metas con monthly NULL ....... % %', n, case when n=0 then '✅' else '❌' end;
  end if;

  raise notice '==================================================================';
end $$;

-- ── DETALLE (opcional) — solo si el bloque [3] dio FAIL y existe savings.horizon.
-- Lista los planes que NO encontraron su meta en savings (vacío = todo migrado).
-- Si la columna horizon aún no existe, comenta este SELECT o ignóralo.
with esperado as (
  select p.user_id, p.title as plan_title,
         case when p.description is not null and length(trim(p.description)) > 0
              then p.title || ' — ' || p.description else p.title end as expected_title
  from public.plans p
)
select e.user_id, e.plan_title, e.expected_title as titulo_esperado_en_savings
from esperado e
where not exists (
  select 1 from public.savings s
  where s.user_id = e.user_id and s.title = e.expected_title
);
