-- ============================================================================
-- VALIDACIÓN (formato TABLA) — Plan→Ahorros + aportes.
-- Correr DESPUÉS de add_savings_contributions.sql Y add_savings_horizon.sql.
-- Devuelve filas (columna `check` + `resultado`) visibles en "Results".
-- Solo lee; no modifica nada. Usa referencias directas, así que requiere que las
-- dos migraciones ya estén aplicadas (si no, usa validate_migration.sql).
-- ============================================================================

-- 1 · Columnas nuevas en savings
select '1 · savings.currency' as check,
  case when exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='currency')
    then '✅ PASS' else '❌ FAIL' end as resultado
union all
select '1 · savings.monthly_contribution',
  case when exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='monthly_contribution')
    then '✅ PASS' else '❌ FAIL' end
union all
select '1 · savings.horizon',
  case when exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='savings' and column_name='horizon')
    then '✅ PASS' else '❌ FAIL' end

-- 2 · Tabla savings_contributions + RLS + policy
union all
select '2 · tabla savings_contributions',
  case when to_regclass('public.savings_contributions') is not null then '✅ PASS' else '❌ FAIL' end
union all
select '2 · RLS en savings_contributions',
  case when exists (select 1 from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and c.relname='savings_contributions' and c.relrowsecurity)
    then '✅ PASS' else '❌ FAIL' end
union all
select '2 · policy savings_contributions_own',
  case when exists (select 1 from pg_policies
    where schemaname='public' and tablename='savings_contributions' and policyname='savings_contributions_own')
    then '✅ PASS' else '❌ FAIL' end

-- 3 · Migración plans → savings (0 planes sin migrar = PASS)
union all
select '3 · planes migrados a savings',
  case
    when not exists (select 1 from public.plans) then '✅ PASS (no había planes)'
    when (with esperado as (
            select p.user_id,
              case when p.description is not null and length(trim(p.description))>0
                   then p.title||' — '||p.description else p.title end as t
            from public.plans p)
          select count(*) from esperado e
          where not exists (select 1 from public.savings s
                            where s.user_id=e.user_id and s.title=e.t)) = 0
      then '✅ PASS (todos migrados)'
    else '❌ FAIL (hay planes sin migrar)'
  end

-- 4 · Integridad: currency / monthly_contribution sin NULL
union all
select '4 · metas con currency NULL',
  case when (select count(*) from public.savings where currency is null)=0 then '✅ PASS' else '❌ FAIL' end
union all
select '4 · metas con monthly_contribution NULL',
  case when (select count(*) from public.savings where monthly_contribution is null)=0 then '✅ PASS' else '❌ FAIL' end

-- 5 · Conteos de referencia (informativo)
union all select '5 · planes (tabla plans)',           (select count(*)::text from public.plans)
union all select '5 · metas (tabla savings)',          (select count(*)::text from public.savings)
union all select '5 · metas con horizonte (migradas)', (select count(*)::text from public.savings where horizon is not null)
union all select '5 · aportes (savings_contributions)',(select count(*)::text from public.savings_contributions);
