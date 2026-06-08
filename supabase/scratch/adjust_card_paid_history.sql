-- ============================================================================
-- Ajuste de saldo: registrar el abono de lo YA PAGADO (consumos viejos importados)
-- ============================================================================
-- Contexto: se importaron consumos de meses anteriores (ya pagados en la vida
-- real) y se les asignó la tarjeta para organizarlos. El sistema los cuenta como
-- deuda porque no había un abono que los saldara. Este script registra UN abono
-- de ajuste por tarjeta, por el monto facturado hasta el corte ANTERIOR al último,
-- de modo que "por pagar" quede solo en el último estado de cuenta cortado + el
-- ciclo actual (la deuda real).
--
-- Montos (del diagnóstico diagnose_card_balances.sql, fechados HOY):
--   - Mastercard Plus CCN  : RD$ 251,947.24  → deja pendiente ~RD$ 54,269.01
--   - Mastercard Qik Básica: RD$ 273,605.53  → deja pendiente ~RD$ 24,767.61
--   - Visa Bravo (Santa Cruz): al día, NO se toca.
--
-- Qué NO toca: ninguna transacción ni su categorización. Solo añade una entrada
-- al arreglo `payments` (jsonb) de cada tarjeta. Reversible: el abono aparece en
-- el historial de la tarjeta y puedes borrarlo desde la app si algo no cuadra.
--
-- Idempotente: si ya existe un abono con la nota de ajuste, no lo duplica.
-- Ejecútalo en el SQL Editor de Supabase. Usa el UUID del usuario (auth.uid() es
-- null ahí). Reemplázalo por el tuyo si fuera necesario.
-- ============================================================================

-- ── Mastercard Plus CCN ─────────────────────────────────────────────────────
update public.credit_cards
set payments = coalesce(payments, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'id',     gen_random_uuid()::text,
    'amount', 251947.24,
    'date',   to_char(current_date, 'YYYY-MM-DD'),
    'note',   'Ajuste: consumos previos ya pagados (importados)'
  )
)
where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and catalog_id = 'popular-mc-plus-ccn'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(payments, '[]'::jsonb)) p
    where p->>'note' = 'Ajuste: consumos previos ya pagados (importados)'
  );

-- ── Mastercard Qik Básica ───────────────────────────────────────────────────
update public.credit_cards
set payments = coalesce(payments, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'id',     gen_random_uuid()::text,
    'amount', 273605.53,
    'date',   to_char(current_date, 'YYYY-MM-DD'),
    'note',   'Ajuste: consumos previos ya pagados (importados)'
  )
)
where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and catalog_id = 'qik-credito-basica'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(payments, '[]'::jsonb)) p
    where p->>'note' = 'Ajuste: consumos previos ya pagados (importados)'
  );

-- ── Verificación (opcional) ─────────────────────────────────────────────────
-- Descomenta para confirmar el abono registrado y el nuevo "por pagar" esperado:
-- select name,
--        (select sum((p->>'amount')::numeric) from jsonb_array_elements(payments) p) as total_abonado,
--        jsonb_array_length(payments) as num_abonos
-- from public.credit_cards
-- where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
--   and catalog_id in ('popular-mc-plus-ccn', 'qik-credito-basica');
