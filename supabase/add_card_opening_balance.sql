-- Añade "opening_balance" a las tarjetas de crédito.
-- Es el saldo que el usuario YA debía al empezar a usar la app (deuda previa,
-- de consumos anteriores). Se suma a lo "por pagar" SIN crear una transacción ni
-- contar como gasto del presupuesto del mes. Default 0. Idempotente.
-- Correr a mano en el SQL editor de Supabase.

alter table public.credit_cards
  add column if not exists opening_balance numeric not null default 0;
