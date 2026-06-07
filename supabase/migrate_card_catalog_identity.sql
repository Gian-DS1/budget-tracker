-- ============================================================================
-- Migración: identidad de tarjetas del catálogo que cambiaron de nombre/id
-- ============================================================================
-- Contexto: al ampliar el catálogo de tarjetas, tres tarjetas cambiaron su
-- nombre y/o su id de catálogo. Las tarjetas que los usuarios YA tienen guardadas
-- siguen con la identidad vieja. Este script actualiza SOLO esas columnas de
-- identidad (nombre, banco, catalog_id, color), para que:
--   - se muestren con el nombre correcto, y
--   - el botón "Restaurar valores del banco" de la app las encuentre en el
--     catálogo nuevo (busca por catalog_id).
--
-- Qué NO toca (a propósito):
--   - cashback_rules: las reglas se respetan tal cual. Si el usuario quiere las
--     tasas nuevas, pulsa "Restaurar valores del banco" en la tarjeta (la app
--     resuelve las categorías por su id correctamente y respeta lo que el usuario
--     haya personalizado). Pisar reglas en SQL es arriesgado porque guardan UUIDs
--     de categorías por usuario, no claves del catálogo.
--   - transacciones, abonos, saldos, fechas: intactos (se referencian por id de
--     tarjeta, que NO cambia).
--
-- Seguro e idempotente: solo toca filas del usuario actual (auth.uid()).
-- Ejecútalo en el SQL Editor de Supabase con tu sesión activa.
-- ============================================================================

-- ── Scotiabank: "Visa Bravo" (scotia-visa-bravo) → "Bravo Visa" (scotia-bravo-visa)
update public.credit_cards
set name = 'Bravo Visa',
    catalog_id = 'scotia-bravo-visa'
where user_id = auth.uid()
  and (catalog_id = 'scotia-visa-bravo'
       or (catalog_id is null and bank = 'Scotiabank' and name = 'Visa Bravo'));

-- ── Qik Crédito Básica → "Mastercard Qik Básica" (mismo id: qik-credito-basica)
update public.credit_cards
set name = 'Mastercard Qik Básica'
where user_id = auth.uid()
  and catalog_id = 'qik-credito-basica'
  and name = 'Qik Crédito Básica';

-- ── Qik Pro → "Mastercard Qik" (mismo id: qik-pro)
update public.credit_cards
set name = 'Mastercard Qik'
where user_id = auth.uid()
  and catalog_id = 'qik-pro'
  and name = 'Qik Pro';

-- ── Verificación (opcional) ─────────────────────────────────────────────────
-- Descomenta para ver tus tarjetas del catálogo y su conteo de transacciones
-- (debe conservarse intacto):
-- select c.id, c.name, c.bank, c.catalog_id,
--        (select count(*) from public.transactions t where t.card_id = c.id) as num_transacciones
-- from public.credit_cards c
-- where c.user_id = auth.uid() and c.catalog_id is not null
-- order by c.bank, c.name;
