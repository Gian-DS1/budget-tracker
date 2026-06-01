-- ── Abonos / pagos parciales en tarjetas de crédito ─────────────────────────
-- Añade la columna `payments` a credit_cards para registrar abonos de monto
-- libre. Cada abono es { id, amount, date, note }. Liquida el saldo de la
-- tarjeta; NO es un gasto del presupuesto (el gasto ya se cuenta al consumir).
-- Idempotente: seguro de ejecutar varias veces.

alter table public.credit_cards
  add column if not exists payments jsonb not null default '[]'::jsonb;

comment on column public.credit_cards.payments is
  'Abonos / pagos parciales: [{ id, amount, date, note }]. Solo liquidan el saldo de la tarjeta, no son gastos del presupuesto.';
