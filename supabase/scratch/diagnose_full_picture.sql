-- ============================================================================
-- DIAGNÓSTICO COMPLETO (solo lectura): panorama de transacciones por tarjeta
-- ============================================================================
-- Para entender por qué el ciclo abierto no cuadra. Muestra 3 consultas:
--   (1) Resumen por tarjeta: facturado (≤ corte) y ciclo abierto (> corte).
--   (2) Total de transacciones SIN tarjeta, por rango de fecha.
--   (3) Detalle de transacciones SIN tarjeta de los últimos ~2 meses.
-- No modifica nada. Corre las 3 y pega los resultados.
-- ============================================================================

-- ── (1) Resumen por tarjeta del usuario ─────────────────────────────────────
with me as (select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid),
cards as (
  select c.id, c.name, c.catalog_id, c.cutoff_day
  from public.credit_cards c, me
  where c.user_id = me.uid
),
cyc as (
  select cards.*,
    case
      when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
    end as last_cutoff
  from cards
)
select
  cyc.name as tarjeta,
  cyc.last_cutoff as ultimo_corte,
  (select count(*) from public.transactions t where t.card_id = cyc.id) as total_tx,
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id = cyc.id and t.date <= cyc.last_cutoff), 0), 2) as facturado_hasta_corte,
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id = cyc.id and t.date > cyc.last_cutoff), 0), 2) as ciclo_abierto_total,
  (select max(t.date) from public.transactions t where t.card_id = cyc.id) as ultima_fecha_tx
from cyc
order by tarjeta;

-- ── (2) Transacciones SIN tarjeta, agrupadas por mes ────────────────────────
select to_char(date_trunc('month', t.date), 'YYYY-MM') as mes,
       count(*) as num_tx,
       round(sum(t.amount), 2) as monto_total
from public.transactions t, me
where t.user_id = me.uid and t.card_id is null
group by date_trunc('month', t.date)
order by mes desc;

-- ── (3) Detalle de transacciones SIN tarjeta (últimos 2 meses) ──────────────
select t.id, t.date as fecha, t.description as descripcion,
       round(t.amount, 2) as monto
from public.transactions t, me
where t.user_id = me.uid and t.card_id is null
  and t.date >= (current_date - interval '2 months')
order by t.date desc, t.amount desc;
