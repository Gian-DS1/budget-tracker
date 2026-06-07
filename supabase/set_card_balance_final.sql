-- ============================================================================
-- AJUSTE FINAL: fijar el pendiente al corte en tu cifra real (auto-calculado)
-- ============================================================================
-- Reemplaza los abonos de AJUSTE (los que tienen nota 'Ajuste...') por UN solo
-- abono cuyo monto se calcula DENTRO del UPDATE leyendo el facturado actual, de
-- modo que el pendiente al corte quede EXACTO en tu cifra real, sin importar
-- cómo hayan quedado las transacciones tras tus correcciones.
--
--   pendiente = opening + facturado_hasta_corte − abonos
--   queremos pendiente = REAL  →  abono_ajuste = opening + facturado_hasta_corte − REAL
--
-- Objetivo:  CCN → 51,302.94   ·   Qik → 24,543.99
--
-- IMPORTANTE:
--   - Conserva tus abonos REALES (los que NO empiezan con 'Ajuste'); solo
--     reemplaza los de ajuste para no acumular ajustes encima de ajustes.
--   - No toca ninguna transacción.
--   - El "ciclo abierto" (consumos > corte) NO se toca: tu balance a la fecha
--     será (pendiente real + ciclo abierto). Si el ciclo ya lo cuadraste con las
--     transacciones, el balance a la fecha también cuadrará solo.
--   - Idempotente: puedes correrlo otra vez; recalcula y deja el mismo resultado.
-- ============================================================================

with me as (select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid),
target as (
  select * from (values
    ('popular-mc-plus-ccn', 51302.94::numeric),
    ('qik-credito-basica',  24543.99::numeric)
  ) as t(catalog_id, pendiente_real)
),
calc as (
  select
    c.id,
    c.catalog_id,
    t.pendiente_real,
    coalesce(c.opening_balance, 0) as opening,
    -- último corte (mismo criterio que la app)
    (case
      when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
      else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
    end) as last_cutoff,
    -- abonos REALES que se conservan (los que NO son de ajuste)
    coalesce((
      select jsonb_agg(p) from jsonb_array_elements(coalesce(c.payments, '[]'::jsonb)) p
      where coalesce(p->>'note','') not like 'Ajuste%'
    ), '[]'::jsonb) as real_payments,
    coalesce((
      select sum((p->>'amount')::numeric) from jsonb_array_elements(coalesce(c.payments, '[]'::jsonb)) p
      where coalesce(p->>'note','') not like 'Ajuste%'
    ), 0) as real_paid
  from public.credit_cards c
  join me on c.user_id = me.uid
  join target t on t.catalog_id = c.catalog_id
),
final as (
  select
    calc.*,
    coalesce((select sum(tx.amount - coalesce(tx.cashback_earned,0)) from public.transactions tx
              where tx.card_id = calc.id and tx.date <= calc.last_cutoff), 0) as facturado_hasta_corte
  from calc
)
update public.credit_cards c
set payments = f.real_payments || jsonb_build_array(
  jsonb_build_object(
    'id',     gen_random_uuid()::text,
    'amount', round(f.opening + f.facturado_hasta_corte - f.real_paid - f.pendiente_real, 2),
    'date',   to_char(current_date, 'YYYY-MM-DD'),
    'note',   'Ajuste: cuadre del pendiente al corte (saldo real)'
  )
)
from final f
where c.id = f.id
  -- Solo si hace falta abonar algo (monto > 0). Si el cálculo diera ≤ 0 (no
  -- debería con tus cifras), no se inserta un abono inválido.
  and round(f.opening + f.facturado_hasta_corte - f.real_paid - f.pendiente_real, 2) > 0;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Confirma que el pendiente quedó en tu cifra real:
with me as (select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid)
select c.name,
  round(coalesce(c.opening_balance,0)
    + coalesce((select sum(tx.amount - coalesce(tx.cashback_earned,0)) from public.transactions tx
        where tx.card_id = c.id and tx.date <= (case
          when current_date >= make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
          then make_date(extract(year from current_date)::int, extract(month from current_date)::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int))
          else make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, least(c.cutoff_day, extract(day from (date_trunc('month', current_date - interval '1 month') + interval '1 month - 1 day'))::int))
        end)), 0)
    - coalesce((select sum((p->>'amount')::numeric) from jsonb_array_elements(coalesce(c.payments,'[]'::jsonb)) p), 0)
  , 2) as pendiente_al_corte_final
from public.credit_cards c, me
where c.user_id = me.uid and c.catalog_id in ('popular-mc-plus-ccn','qik-credito-basica');
