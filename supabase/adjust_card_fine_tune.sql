-- ============================================================================
-- Ajuste FINO del pendiente al corte (abono adicional)
-- ============================================================================
-- Tras el abono de ajuste inicial, el "pendiente al corte" quedó un poco alto vs.
-- tu realidad. Este abono adicional lo cuadra exactamente:
--   - Mastercard Plus CCN  : +RD$ 2,966.07  → pendiente al corte = 51,302.94
--   - Mastercard Qik Básica: +RD$   223.62  → pendiente al corte = 24,543.99
--
-- IMPORTANTE: estos montos asumen que el "facturado hasta el último corte" NO
-- cambió al reasignar las transacciones del ciclo. Eso es cierto SOLO si las
-- transacciones que reasignaste tienen fecha DESPUÉS del último corte (ciclo
-- abierto). Si alguna quedó con fecha <= corte, vuelve a correr
-- diagnose_card_balances_v2.sql y usa su columna `abono_adicional_necesario`.
--
-- Qué NO toca: ninguna transacción. Solo añade una entrada a `payments` (jsonb).
-- Idempotente (no duplica si ya existe la nota de ajuste fino). Reversible desde
-- la app. Ejecútalo en el SQL Editor de Supabase.
-- ============================================================================

-- ── Mastercard Plus CCN: +2,966.07 ──────────────────────────────────────────
update public.credit_cards
set payments = coalesce(payments, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'id',     gen_random_uuid()::text,
    'amount', 2966.07,
    'date',   to_char(current_date, 'YYYY-MM-DD'),
    'note',   'Ajuste fino: cuadre del pendiente al corte'
  )
)
where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and catalog_id = 'popular-mc-plus-ccn'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(payments, '[]'::jsonb)) p
    where p->>'note' = 'Ajuste fino: cuadre del pendiente al corte'
  );

-- ── Mastercard Qik Básica: +223.62 ──────────────────────────────────────────
update public.credit_cards
set payments = coalesce(payments, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'id',     gen_random_uuid()::text,
    'amount', 223.62,
    'date',   to_char(current_date, 'YYYY-MM-DD'),
    'note',   'Ajuste fino: cuadre del pendiente al corte'
  )
)
where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and catalog_id = 'qik-credito-basica'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(payments, '[]'::jsonb)) p
    where p->>'note' = 'Ajuste fino: cuadre del pendiente al corte'
  );

-- ── Verificación (opcional) ─────────────────────────────────────────────────
-- select name, (select sum((p->>'amount')::numeric) from jsonb_array_elements(payments) p) as total_abonado
-- from public.credit_cards
-- where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
--   and catalog_id in ('popular-mc-plus-ccn', 'qik-credito-basica');
