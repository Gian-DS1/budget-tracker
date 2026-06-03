-- Fusión Plan→Ahorros: columna horizonte en savings + migración de plans.
-- Correr a mano en el SQL editor de Supabase. Idempotente.

-- 1. Columna horizonte (nullable: las metas normales no la necesitan).
alter table public.savings add column if not exists horizon text;  -- short | medium | long | null

-- 2. Copia cada plan del usuario a savings como meta con saldo inicial.
--    title := title (+ ' — ' + description si hay). type → horizon.
--    current_amount → saldo. monthly_contribution := 0. currency := 'DOP'.
--    Idempotente vía NOT EXISTS por (user_id, title) para no duplicar al re-correr.
insert into public.savings (user_id, title, target_amount, current_amount, deadline, icon, color, status, currency, monthly_contribution, horizon)
select
  p.user_id,
  case when p.description is not null and length(trim(p.description)) > 0
       then p.title || ' — ' || p.description else p.title end,
  p.target_amount,
  p.current_amount,
  p.deadline,
  '🎯',
  '#bec2ff',
  case when p.current_amount >= p.target_amount and p.target_amount > 0 then 'completed' else 'active' end,
  'DOP',
  0,
  p.type
from public.plans p
where not exists (
  select 1 from public.savings s
  where s.user_id = p.user_id
    and s.title = (case when p.description is not null and length(trim(p.description)) > 0
                        then p.title || ' — ' || p.description else p.title end)
);

-- La tabla public.plans NO se elimina aquí. Queda huérfana; el usuario decide
-- cuándo borrarla una vez verificada la migración.
