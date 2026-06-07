-- ============================================================================
-- Cálculo del abono EXACTO para dejar el pendiente al corte en tu cifra real
-- ============================================================================
-- Lee el estado ACTUAL (tras arreglar las transacciones) y calcula, por tarjeta,
-- el abono total que debe existir y el ajuste necesario sobre lo ya abonado.
-- Solo lectura. Corre y pega el resultado: con eso genero el SQL final del abono.
--
-- Objetivo: pendiente_al_corte = facturado_hasta_corte + opening - abonado = REAL
--   CCN real = 51302.94   ·   Qik real = 24543.99
-- ============================================================================
with me as (select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid),
cards as (
  select c.id, c.name, c.catalog_id, c.cutoff_day, coalesce(c.opening_balance,0) as opening,
         coalesce(c.payments, '[]'::jsonb) as payments
  from public.credit_cards c, me
  where c.user_id = me.uid and c.catalog_id in ('popular-mc-plus-ccn', 'qik-credito-basica')
),
cyc as (
  select cards.*,
    case
      when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
    end as last_cutoff
  from cards
),
calc as (
  select cyc.*,
    coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
      where t.card_id = cyc.id and t.date <= cyc.last_cutoff), 0) as facturado_hasta_corte,
    coalesce((select sum((p->>'amount')::numeric) from jsonb_array_elements(cyc.payments) p), 0) as abonado_actual
  from cyc
)
select
  name as tarjeta,
  last_cutoff as ultimo_corte,
  round(opening, 2) as saldo_inicial,
  round(facturado_hasta_corte, 2) as facturado_hasta_corte,
  round(abonado_actual, 2) as abonado_actual,
  round(opening + facturado_hasta_corte - abonado_actual, 2) as pendiente_actual_sistema,
  case when name like '%CCN%' then 51302.94 when name like '%Qik%' then 24543.99 end as pendiente_real,
  -- Abono TOTAL que debería existir para que el pendiente = real:
  round(opening + facturado_hasta_corte - (case when name like '%CCN%' then 51302.94 when name like '%Qik%' then 24543.99 end), 2) as abono_total_objetivo,
  -- Ajuste sobre lo ya abonado (positivo = abonar más; negativo = sobra abono):
  round((opening + facturado_hasta_corte - (case when name like '%CCN%' then 51302.94 when name like '%Qik%' then 24543.99 end)) - abonado_actual, 2) as ajuste_necesario
from calc
order by tarjeta;
