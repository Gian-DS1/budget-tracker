-- ============================================================================
-- FinTrack RD — Categorías de vehículo: Lavado + Reparación, y fix de keywords
-- ============================================================================
-- CÓMO USAR:
--   1. Abre Supabase Dashboard > SQL Editor.
--   2. Corre todo el archivo de una vez (es idempotente y acotado a TU usuario).
--   3. Corre el PASO 3 para verificar el resultado.
--
-- Qué hace:
--   PASO 1 · Quita el keyword 'lavado de carro' de "Mantenimiento de Vehículo"
--            para que esos gastos caigan en la nueva categoría "Lavado de
--            Vehículo" al auto-categorizar. (La app NO actualiza keywords de
--            categorías ya existentes, solo inserta las que faltan; por eso
--            este cambio hay que hacerlo aquí.)
--   PASO 2 · Inserta "Lavado de Vehículo" (gasto fijo) y "Reparación de
--            Vehículo" (gasto variable) SOLO si aún no existen. Es el mismo
--            resultado que la app hace sola al recargar; correrlo aquí lo deja
--            listo de inmediato y no duplica nada.
--
-- Está acotado a TU usuario por email. Si cambia tu email, edítalo abajo.
-- Idempotente: puedes correrlo varias veces sin crear duplicados.
-- ============================================================================

-- ── PASO 1 · Quitar 'lavado de carro' de "Mantenimiento de Vehículo" ────────
update public.categories
set keywords = array_remove(keywords, 'lavado de carro')
where user_id = (select id from auth.users where email = 'giancarlos.estevez@gmail.com')
  and name = 'Mantenimiento de Vehículo'
  and 'lavado de carro' = any(keywords);


-- ── PASO 2 · Insertar las 2 categorías nuevas (si no existen) ───────────────
-- "Lavado de Vehículo" · gasto fijo
insert into public.categories (user_id, name, type, icon, color, slug, keywords, is_active, sort_order)
select
  u.uid,
  'Lavado de Vehículo',
  'fixed_expense',
  '🧼',
  '#38bdf8',
  null,
  array['lavado de vehiculo','lavado de carro','lavado de auto','autolavado','lavadero','car wash','detailing','pulido'],
  true,
  (select coalesce(max(sort_order), 0) + 1 from public.categories where user_id = u.uid)
from (select id as uid from auth.users where email = 'giancarlos.estevez@gmail.com') u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.uid and c.name = 'Lavado de Vehículo' and c.type = 'fixed_expense'
);

-- "Reparación de Vehículo" · gasto variable
insert into public.categories (user_id, name, type, icon, color, slug, keywords, is_active, sort_order)
select
  u.uid,
  'Reparación de Vehículo',
  'variable_expense',
  '🔩',
  '#fb923c',
  null,
  array['reparacion de vehiculo','reparacion de carro','reparacion de auto','reparacion motor','chapisteria','desabolladura','pintura de carro','grua','embrague','transmision','frenos','bomba de agua','radiador','alternador'],
  true,
  (select coalesce(max(sort_order), 0) + 1 from public.categories where user_id = u.uid)
from (select id as uid from auth.users where email = 'giancarlos.estevez@gmail.com') u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.uid and c.name = 'Reparación de Vehículo' and c.type = 'variable_expense'
);


-- ── PASO 3 · Verificar el resultado ─────────────────────────────────────────
select name, type, keywords
from public.categories
where user_id = (select id from auth.users where email = 'giancarlos.estevez@gmail.com')
  and name in ('Mantenimiento de Vehículo', 'Lavado de Vehículo', 'Reparación de Vehículo')
order by type, name;
