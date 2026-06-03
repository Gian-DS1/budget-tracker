-- ============================================================================
-- VALIDACIÓN de las migraciones del rediseño (Plan→Ahorros + aportes).
-- Correr a mano en el SQL editor de Supabase DESPUÉS de:
--   1. add_savings_contributions.sql
--   2. add_savings_horizon.sql
-- Solo LEE: no modifica nada. Cada bloque imprime PASS/FAIL con detalle.
-- ============================================================================

-- ── 1. Columnas nuevas en savings ───────────────────────────────────────────
select
  'savings.currency'              as check,
  case when exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='savings' and column_name='currency')
       then '✅ PASS' else '❌ FAIL — falta. Corre add_savings_contributions.sql' end as resultado
union all
select
  'savings.monthly_contribution',
  case when exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='savings' and column_name='monthly_contribution')
       then '✅ PASS' else '❌ FAIL — falta. Corre add_savings_contributions.sql' end
union all
select
  'savings.horizon',
  case when exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='savings' and column_name='horizon')
       then '✅ PASS' else '❌ FAIL — falta. Corre add_savings_horizon.sql' end;

-- ── 2. Tabla savings_contributions + índices + RLS ──────────────────────────
select
  'tabla savings_contributions' as check,
  case when exists (select 1 from information_schema.tables
        where table_schema='public' and table_name='savings_contributions')
       then '✅ PASS' else '❌ FAIL — falta la tabla' end as resultado
union all
select
  'RLS habilitado en savings_contributions',
  case when exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='savings_contributions' and c.relrowsecurity)
       then '✅ PASS' else '❌ FAIL — RLS apagado' end
union all
select
  'policy savings_contributions_own',
  case when exists (select 1 from pg_policies
        where schemaname='public' and tablename='savings_contributions' and policyname='savings_contributions_own')
       then '✅ PASS' else '❌ FAIL — falta la policy' end;

-- ── 3. Migración de datos plans → savings ───────────────────────────────────
-- Cuenta cuántos planes activos NO tienen su meta equivalente en savings (por
-- user_id + título esperado). Debe ser 0 si la copia corrió bien.
with esperado as (
  select
    p.user_id,
    case when p.description is not null and length(trim(p.description)) > 0
         then p.title || ' — ' || p.description else p.title end as expected_title
  from public.plans p
)
select
  'planes migrados a savings' as check,
  case
    when not exists (select 1 from public.plans) then '✅ PASS — no había planes que migrar'
    when (select count(*) from esperado e
          where not exists (select 1 from public.savings s
                            where s.user_id = e.user_id and s.title = e.expected_title)) = 0
      then '✅ PASS — todos los planes tienen su meta en savings'
    else '❌ FAIL — hay planes sin migrar (revisa el detalle abajo)'
  end as resultado;

-- Detalle (filas = planes sin equivalente en savings; vacío = todo migrado).
with esperado as (
  select
    p.user_id, p.title as plan_title,
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

-- ── 4. Conteos de referencia (para tu inspección manual) ────────────────────
select 'total planes (tabla plans)'            as metrica, count(*)::text as valor from public.plans
union all
select 'total metas (tabla savings)',          count(*)::text from public.savings
union all
select 'metas con horizonte (migradas de plan)', count(*)::text from public.savings where horizon is not null
union all
select 'total aportes (savings_contributions)', count(*)::text from public.savings_contributions
union all
select 'metas con saldo (current_amount > 0)',  count(*)::text from public.savings where current_amount > 0;

-- ── 5. Integridad de las metas (datos que el código nuevo espera) ────────────
-- currency y monthly_contribution NO deben quedar NULL (la migración pone
-- defaults; el código los lee). Si algo sale > 0 aquí, hay filas inconsistentes.
select
  'metas con currency NULL' as check,
  case when (select count(*) from public.savings where currency is null) = 0
       then '✅ PASS' else '❌ FAIL — hay metas con currency NULL' end as resultado
union all
select
  'metas con monthly_contribution NULL',
  case when (select count(*) from public.savings where monthly_contribution is null) = 0
       then '✅ PASS' else '❌ FAIL — hay metas con monthly_contribution NULL' end;
