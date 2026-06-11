-- Globalización: una sola moneda por usuario.
-- 1) profiles.currency (ISO 4217). Default DOP = los usuarios existentes quedan
--    en su realidad actual sin tocar nada.
-- 2) Fila de perfil para quien no la tenga.
-- 3) Transacciones, ahorros, deudas y transacciones recurrentes en USD → DOP
--    con la tasa de abajo; los montos originales quedan anotados en notes.
--
-- ⚠️ EDITAR LA TASA antes de correr: usa la tasa de venta vigente del usuario
-- (la que muestra Ajustes → Tasa de cambio en la app, p. ej. 61.45).
-- Correr a mano en el SQL editor de Supabase. Irreversible (el original queda en notes).
--
-- Tablas SIN columna currency (no requieren conversión):
--   budgets            — no maneja moneda (los montos viven en la moneda del perfil implícitamente)
--   debt_payments      — no maneja moneda (hereda la de la deuda padre)
--   savings_contributions — no maneja moneda (hereda la de la meta padre)
--   plans              — no maneja moneda
--   credit_cards       — no maneja moneda

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Añadir profiles.currency
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists currency text not null default 'DOP';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Crear perfil para usuarios que aún no tienen fila en profiles
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.profiles (user_id)
select id from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificar primero cuánto hay en USD (correr SELECT antes del UPDATE):
--   select 'transactions'            as tabla, count(*) from public.transactions           where currency = 'USD'
--   union all
--   select 'savings'                 as tabla, count(*) from public.savings                where currency = 'USD'
--   union all
--   select 'debts'                   as tabla, count(*) from public.debts                  where currency = 'USD'
--   union all
--   select 'recurring_transactions'  as tabla, count(*) from public.recurring_transactions where currency = 'USD';
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Convertir transactions USD → DOP
--    Columnas de monto: amount
--    Columna de notas:  notes
-- ─────────────────────────────────────────────────────────────────────────────
with params as (
  select 61.45::numeric as rate   -- ⚠️ EDITAR: tasa USD→DOP vigente
)
update public.transactions t
set
  notes    = trim(coalesce(t.notes, '') || ' (US$ ' || t.amount::text || ' @ ' || p.rate::text || ')'),
  amount   = round(t.amount * p.rate, 2),
  currency = 'DOP'
from params p
where t.currency = 'USD';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Convertir savings (metas de ahorro) USD → DOP
--    Columnas de monto: target_amount, current_amount, monthly_contribution
--    (sin columna notes — no se anota el original)
-- ─────────────────────────────────────────────────────────────────────────────
with params as (
  select 61.45::numeric as rate   -- ⚠️ EDITAR: tasa USD→DOP vigente
)
update public.savings s
set
  target_amount        = round(s.target_amount        * p.rate, 2),
  current_amount       = round(s.current_amount       * p.rate, 2),
  monthly_contribution = round(s.monthly_contribution * p.rate, 2),
  currency             = 'DOP'
from params p
where s.currency = 'USD';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Convertir debts (deudas) USD → DOP
--    Columnas de monto: total_amount, current_balance, minimum_payment
-- ─────────────────────────────────────────────────────────────────────────────
with params as (
  select 61.45::numeric as rate   -- ⚠️ EDITAR: tasa USD→DOP vigente
)
update public.debts d
set
  total_amount     = round(d.total_amount     * p.rate, 2),
  current_balance  = round(d.current_balance  * p.rate, 2),
  minimum_payment  = round(d.minimum_payment  * p.rate, 2),
  currency         = 'DOP'
from params p
where d.currency = 'USD';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Convertir recurring_transactions USD → DOP
--    Columnas de monto: amount
--    Columna de notas:  notes
-- ─────────────────────────────────────────────────────────────────────────────
with params as (
  select 61.45::numeric as rate   -- ⚠️ EDITAR: tasa USD→DOP vigente
)
update public.recurring_transactions rt
set
  notes    = trim(coalesce(rt.notes, '') || ' (US$ ' || rt.amount::text || ' @ ' || p.rate::text || ')'),
  amount   = round(rt.amount * p.rate, 2),
  currency = 'DOP'
from params p
where rt.currency = 'USD';
