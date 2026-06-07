-- ============================================================================
-- Migración: tu tarjeta CCN "Visa Plus CCN" → "Mastercard Plus CCN"
-- ============================================================================
-- Qué hace (in-place, sin perder nada):
--   1. Asegura que exista la categoría de ecosistema "Grupo CCN" (slug
--      'eco-grupo-ccn') en tu cuenta, con sus keywords. Si ya existe, no la duplica.
--   2. Actualiza TU fila de tarjeta CCN existente: nombre, banco, color, catalog_id
--      y la regla de cashback escalonada (5% / 6% / 8% por consumo mensual
--      acumulado en el Grupo CCN). Identifica la tarjeta por su catalog_id viejo
--      ('popular-visa-plus-ccn') o por su nombre ('Visa Plus CCN').
--
-- Por qué NO se pierden las transacciones: cada transacción referencia la tarjeta
-- por su id (UUID), que NO cambia. Solo actualizamos columnas de la misma fila,
-- así que todas las transacciones siguen apuntando a la misma tarjeta.
--
-- NOTA: auth.uid() retorna null en el SQL Editor (sin sesión activa).
-- Se usa el UUID hardcodeado del usuario en su lugar.
-- ============================================================================

-- UUID del usuario (Giancarlos)
do $$ begin
  -- solo para documentar; las queries usan la constante directamente
end $$;

-- ── 1 · Asegurar la categoría "Grupo CCN" ───────────────────────────────────
insert into public.categories (user_id, name, type, icon, color, slug, keywords, is_active, sort_order)
select
  '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid,
  'Grupo CCN', 'variable_expense', '🛒', '#004b87', 'eco-grupo-ccn',
  array['nacional','supermercados nacional','jumbo','jumbo express','casa cuesta','ferreteria cuesta','jugueton','cuesta libros','bebe mundo','bebemundo','la bodega','merca jumbo'],
  true,
  coalesce((select max(sort_order) + 1 from public.categories where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid), 0)
where not exists (
  select 1 from public.categories
  where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid and slug = 'eco-grupo-ccn'
);

-- ── 2 · Actualizar la tarjeta CCN in-place ──────────────────────────────────
update public.credit_cards c
set
  name           = 'Mastercard Plus CCN',
  bank           = 'Banco Popular Dominicano',
  color          = '#e30613',
  catalog_id     = 'popular-mc-plus-ccn',
  cashback_rules = jsonb_build_array(
    jsonb_build_object(
      'categoryId', (
        select id::text from public.categories
        where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid and slug = 'eco-grupo-ccn'
        limit 1
      ),
      'tiers', jsonb_build_array(
        jsonb_build_object('upTo', 7999,  'pct', 5),
        jsonb_build_object('upTo', 19999, 'pct', 6),
        -- 'Infinity' no es representable en JSON; el cliente trata un upTo muy
        -- alto como el último nivel. Usamos un tope enorme equivalente.
        jsonb_build_object('upTo', 999999999, 'pct', 8)
      )
    )
  )
where c.user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and (c.catalog_id = 'popular-visa-plus-ccn' or c.name = 'Visa Plus CCN');

-- ── 3 · Verificación (opcional) ─────────────────────────────────────────────
-- Descomenta para ver el resultado: debe mostrar la tarjeta ya como Mastercard
-- con su regla de tiers, y el conteo de transacciones que conserva.
-- select c.id, c.name, c.bank, c.catalog_id, c.cashback_rules,
--        (select count(*) from public.transactions t where t.card_id = c.id) as num_transacciones
-- from public.credit_cards c
-- where c.user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid and c.catalog_id = 'popular-mc-plus-ccn';
