-- ============================================================================
-- DIAGNÓSTICO v2 (solo lectura): estado ACTUAL del saldo, con ciclo abierto
-- ============================================================================
-- Muestra, por tarjeta, lo que el sistema calcula HOY (tras tu abono de ajuste):
--   - pendiente al corte (= facturado hasta el último corte − abonado)
--   - ciclo abierto (consumo nuevo entre el último corte y el próximo)
--   - balance a la fecha (= pendiente al corte + ciclo abierto)
-- y lo compara con tus cifras reales para calcular el abono fino exacto.
--
-- No modifica nada. Ejecútalo en el SQL Editor de Supabase.
-- ============================================================================

with me as (
  select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid
),
cards as (
  select c.id, c.name, c.cutoff_day, c.opening_balance,
         coalesce(c.payments, '[]'::jsonb) as payments
  from public.credit_cards c, me
  where c.user_id = me.uid and c.catalog_id in ('popular-mc-plus-ccn', 'qik-credito-basica')
),
cyc as (
  select cards.*,
    case
      when current_date >=
           make_date(extract(year from current_date)::int, extract(month from current_date)::int,
                     least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int,
                     least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      else make_date(extract(year from (current_date - interval '1 month'))::int,
                     extract(month from (current_date - interval '1 month'))::int,
                     least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
    end as last_cutoff,
    -- próximo corte: un mes después del último.
    make_date(extract(year from (
      case when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
           then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
           else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
      end + interval '1 month'))::int,
      extract(month from (
      case when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
           then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
           else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
      end + interval '1 month'))::int,
      least(cutoff_day, 28)) as next_cutoff
  from cards
),
calc as (
  select cyc.*,
    coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
              where t.card_id = cyc.id and t.date <= cyc.last_cutoff), 0) as billed,
    coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
              where t.card_id = cyc.id and t.date > cyc.last_cutoff and t.date <= cyc.next_cutoff), 0) as open_cycle,
    coalesce((select sum((p->>'amount')::numeric) from jsonb_array_elements(cyc.payments) p), 0) as paid
  from cyc
)
select
  name as tarjeta,
  last_cutoff as ultimo_corte,
  next_cutoff as proximo_corte,
  round(opening_balance + billed - paid, 2)            as pendiente_al_corte_sistema,
  round(open_cycle, 2)                                  as ciclo_abierto_sistema,
  round(opening_balance + billed - paid + open_cycle, 2) as balance_a_la_fecha_sistema,
  -- Tus cifras reales (edítalas si cambian):
  case when name like '%CCN%' then 51302.94 when name like '%Qik%' then 24543.99 end as pendiente_real,
  case when name like '%CCN%' then 57746.82 when name like '%Qik%' then 59150.93 end as balance_fecha_real,
  -- Abono adicional para que el pendiente cuadre con tu cifra real:
  round((opening_balance + billed - paid)
        - (case when name like '%CCN%' then 51302.94 when name like '%Qik%' then 24543.99 end), 2) as abono_adicional_necesario
from calc
order by tarjeta;
