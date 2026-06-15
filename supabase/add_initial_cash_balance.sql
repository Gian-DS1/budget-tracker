-- Efectivo inicial declarado por el usuario (lo que tiene "en el banco" al empezar).
-- Aditivo y no destructivo; usuarios existentes arrancan en 0.
alter table public.profiles
  add column if not exists initial_cash_balance numeric not null default 0;
