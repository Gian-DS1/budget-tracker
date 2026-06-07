-- ============================================================================
-- DIAGNÓSTICO (solo lectura): saldo facturado por tarjeta vs. lo ya abonado
-- ============================================================================
-- No modifica NADA. Sirve para ver, por cada tarjeta, cuánto está contando el
-- sistema como "facturado hasta el último corte" y cuánto tienes registrado como
-- pagado. La diferencia es la deuda que la app muestra como "por pagar".
--
-- Úsalo para decidir el abono de ajuste: si en la vida real ya pagaste todo lo
-- viejo, el abono a registrar = (facturado_hasta_corte_anterior_al_ultimo), de
-- modo que solo quede pendiente el último estado de cuenta cortado + el ciclo
-- abierto actual.
--
-- Cómo se calcula el "último corte" (igual que la app): el día `cutoff_day` del
-- mes actual si ya pasó hoy; si no, el del mes anterior. Se ajusta a meses cortos.
--
-- Ejecútalo en el SQL Editor de Supabase con tu UUID (auth.uid() es null ahí).
-- Reemplaza el UUID de abajo por el tuyo si fuera necesario.
-- ============================================================================

with me as (
  select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid
),
cards as (
  select c.id, c.name, c.bank, c.cutoff_day, c.opening_balance,
         coalesce(c.payments, '[]'::jsonb) as payments
  from public.credit_cards c, me
  where c.user_id = me.uid
),
-- Último corte de cada tarjeta (fecha del día de corte; mes actual si ya pasó,
-- si no el mes anterior), ajustando a meses cortos con LEAST sobre el último día.
cycles as (
  select
    cards.*,
    case
      when current_date >=
           make_date(extract(year from current_date)::int, extract(month from current_date)::int,
                     least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int,
                     least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      else make_date(
             extract(year from (current_date - interval '1 month'))::int,
             extract(month from (current_date - interval '1 month'))::int,
             least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
    end as last_cutoff
  from cards
),
-- Corte ANTERIOR al último (un mes antes): hasta aquí es lo "viejo" que querrías
-- dar por pagado, dejando pendiente solo el último estado de cuenta.
cuts as (
  select cy.*,
    make_date(
      extract(year from (last_cutoff - interval '1 month'))::int,
      extract(month from (last_cutoff - interval '1 month'))::int,
      least(cutoff_day, extract(day from (date_trunc('month', last_cutoff - interval '1 month') + interval '1 month - 1 day'))::int)
    ) as prev_cutoff
  from cycles cy
),
sums as (
  select
    cuts.*,
    -- Facturado NETO (consumo - cashback) hasta el ÚLTIMO corte.
    coalesce((select sum(t.amount - coalesce(t.cashback_earned,0))
              from public.transactions t
              where t.card_id = cuts.id and t.date <= cuts.last_cutoff), 0) as billed_hasta_ultimo,
    -- Facturado NETO hasta el corte ANTERIOR (lo "viejo" candidato a abono).
    coalesce((select sum(t.amount - coalesce(t.cashback_earned,0))
              from public.transactions t
              where t.card_id = cuts.id and t.date <= cuts.prev_cutoff), 0) as billed_hasta_anterior,
    -- Total ya abonado (suma de payments).
    coalesce((select sum((p->>'amount')::numeric) from jsonb_array_elements(cuts.payments) p), 0) as ya_abonado,
    -- Nº de transacciones (para confirmar que nada se perderá).
    (select count(*) from public.transactions t where t.card_id = cuts.id) as num_tx
  from cuts
)
select
  name                                   as tarjeta,
  bank                                   as banco,
  cutoff_day                             as dia_corte,
  last_cutoff                            as ultimo_corte,
  prev_cutoff                            as corte_anterior,
  num_tx                                 as transacciones,
  round(opening_balance, 2)              as saldo_inicial,
  round(billed_hasta_ultimo, 2)          as facturado_hasta_ultimo_corte,
  round(billed_hasta_anterior, 2)        as facturado_hasta_corte_anterior,
  round(ya_abonado, 2)                   as ya_abonado,
  -- Deuda que la app muestra hoy como "por pagar" (incluye saldo inicial).
  round(opening_balance + billed_hasta_ultimo - ya_abonado, 2) as por_pagar_actual,
  -- ABONO SUGERIDO para dejar pendiente solo el último estado cortado + ciclo
  -- actual: salda todo lo facturado hasta el corte ANTERIOR (más el saldo inicial
  -- si lo viejo ya estaba pagado). Si ya tienes abonos, réstalos.
  round(greatest(0, opening_balance + billed_hasta_anterior - ya_abonado), 2) as abono_sugerido
from sums
order by banco, tarjeta;
