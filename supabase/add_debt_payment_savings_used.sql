-- Origen del ahorro usado por la cascada al pagar (para revertir el pago exacto).
-- Formato: [{ "goalId": "...", "amount": N }]. Tarjetas usa su columna payments
-- (jsonb) existente, así que no necesita una columna nueva.
alter table public.debt_payments
  add column if not exists savings_used jsonb not null default '[]'::jsonb;
