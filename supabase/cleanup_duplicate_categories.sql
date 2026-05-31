-- ============================================================================
-- FinTrack RD — Limpieza de categorías duplicadas / redundantes (one-off)
-- ============================================================================
-- CÓMO USAR:
--   1. Abre Supabase Dashboard > SQL Editor.
--   2. (Opcional pero recomendado) corre primero el PASO 1 para revisar tus
--      categorías actuales.
--   3. Revisa el mapa de reasignación del PASO 2 y ajústalo si hace falta.
--   4. Corre los PASOS 2 y 3 (puedes correr todo el archivo de una vez).
--   5. Corre el PASO 4 para verificar el resultado.
--
-- IMPORTANTE: reemplaza 'TU-EMAIL-AQUI@ejemplo.com' por el email de tu cuenta
-- (puedes usar Reemplazar todo en el editor) antes de correr el script.
--
-- Qué hace al borrar una categoría (según el esquema):
--   - transactions.category_id  -> ON DELETE SET NULL  (la transacción queda
--     "Sin categoría" si no se reasignó antes).
--   - recurring_transactions    -> ON DELETE SET NULL  (igual que arriba).
--   - budgets                   -> ON DELETE CASCADE   (el presupuesto de esa
--     categoría se elimina, que es justo lo que se pidió).
--
-- Nota: las reglas de cashback de tarjetas guardan `categoryId` dentro de un
-- JSON (credit_cards.cashback_rules). Si alguna de las categorías borradas
-- tenía una regla de cashback, esa regla quedará apuntando a un id inexistente
-- (inofensivo, simplemente deja de aplicar). Revísalo en Ajustes > Tarjetas si
-- usabas cashback en alguna de las categorías eliminadas.
-- ============================================================================

-- ── PASO 1 · Revisar tus categorías actuales (solo lectura) ─────────────────
select name, type, created_at
from public.categories
where user_id = (select id from auth.users where email = 'TU-EMAIL-AQUI@ejemplo.com')
order by type, name;


-- ── PASO 2 · Reasignar transacciones y recurrentes a la categoría que conservas
-- Solo se reasigna cuando la categoría destino EXISTE. Lo que no tenga destino
-- quedará "Sin categoría" automáticamente al borrarse en el PASO 3.
-- Edita esta tabla `mapping` si quieres mover alguna a otra categoría.
with u as (
  select id as uid from auth.users where email = 'TU-EMAIL-AQUI@ejemplo.com'
),
mapping(del_name, keep_name) as (
  values
    ('Alquiler / Renta',                  'Alquiler'),
    ('Internet y Comunicaciones',         'Internet/Cable/Teléfono'),
    ('Servicios Públicos (Luz/Agua/Gas)', 'Servicios (Luz/Agua/Gas)'),
    ('Electricidad',                      'Servicios (Luz/Agua/Gas)'),
    ('Salud y Seguro Médico',             'Seguro'),
    ('Restaurantes',                      'Restaurantes y Delivery'),
    ('Transporte',                        'Taxi y Transporte'),
    ('Alimentación',                      'Supermercado'),
    ('Ferretería y Reparaciones',         'Hogar y Reparaciones'),
    ('Muebles y Equipamiento',            'Hogar y Reparaciones')
    -- Sin destino (quedarán "Sin categoría"): Otros Gastos, Educación y Estudios,
    -- Cuidado Personal y Pelo, Trámites y Documentos, Entretenimiento y Ocio,
    -- Freelance. Si quieres conservar su historial en otra categoría, agrégalas
    -- aquí con el formato ('Nombre a borrar', 'Categoría destino').
),
keep as (  -- un id destino por nombre (el más antiguo si hay duplicados)
  select distinct on (c.name) c.name, c.id
  from public.categories c, u
  where c.user_id = u.uid
  order by c.name, c.created_at
),
del as (  -- cada fila a borrar emparejada con el id de su destino
  select c.id as del_id, k.id as keep_id
  from public.categories c
  join u        on c.user_id = u.uid
  join mapping m on m.del_name = c.name
  join keep k    on k.name = m.keep_name
)
update public.transactions t
set category_id = d.keep_id
from del d, u
where t.user_id = u.uid
  and t.category_id = d.del_id;

-- Reasignar también las plantillas recurrentes (misma lógica)
with u as (
  select id as uid from auth.users where email = 'TU-EMAIL-AQUI@ejemplo.com'
),
mapping(del_name, keep_name) as (
  values
    ('Alquiler / Renta',                  'Alquiler'),
    ('Internet y Comunicaciones',         'Internet/Cable/Teléfono'),
    ('Servicios Públicos (Luz/Agua/Gas)', 'Servicios (Luz/Agua/Gas)'),
    ('Electricidad',                      'Servicios (Luz/Agua/Gas)'),
    ('Salud y Seguro Médico',             'Seguro'),
    ('Restaurantes',                      'Restaurantes y Delivery'),
    ('Transporte',                        'Taxi y Transporte'),
    ('Alimentación',                      'Supermercado'),
    ('Ferretería y Reparaciones',         'Hogar y Reparaciones'),
    ('Muebles y Equipamiento',            'Hogar y Reparaciones')
),
keep as (
  select distinct on (c.name) c.name, c.id
  from public.categories c, u
  where c.user_id = u.uid
  order by c.name, c.created_at
),
del as (
  select c.id as del_id, k.id as keep_id
  from public.categories c
  join u        on c.user_id = u.uid
  join mapping m on m.del_name = c.name
  join keep k    on k.name = m.keep_name
)
update public.recurring_transactions r
set category_id = d.keep_id
from del d, u
where r.user_id = u.uid
  and r.category_id = d.del_id;


-- ── PASO 3 · Eliminar las 16 categorías duplicadas / redundantes ────────────
-- (los presupuestos asociados se borran en cascada; las transacciones no
--  reasignadas quedan "Sin categoría").
delete from public.categories
where user_id = (select id from auth.users where email = 'TU-EMAIL-AQUI@ejemplo.com')
  and name in (
    'Electricidad',
    'Alquiler / Renta',
    'Internet y Comunicaciones',
    'Servicios Públicos (Luz/Agua/Gas)',
    'Alimentación',
    'Salud y Seguro Médico',
    'Restaurantes',
    'Transporte',
    'Otros Gastos',
    'Ferretería y Reparaciones',
    'Muebles y Equipamiento',
    'Educación y Estudios',
    'Cuidado Personal y Pelo',
    'Trámites y Documentos',
    'Entretenimiento y Ocio',
    'Freelance'
  );


-- ── PASO 4 · Verificar el resultado ─────────────────────────────────────────
select name, type
from public.categories
where user_id = (select id from auth.users where email = 'TU-EMAIL-AQUI@ejemplo.com')
order by type, name;
