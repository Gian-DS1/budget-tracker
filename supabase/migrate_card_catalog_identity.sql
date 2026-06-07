-- ============================================================================
-- Migración GLOBAL: identidad de tarjetas del catálogo que cambiaron de nombre/id
-- ============================================================================
-- Contexto: al ampliar el catálogo de tarjetas, tres tarjetas cambiaron su
-- nombre y/o su id de catálogo. Cualquier usuario que YA las tenga guardadas las
-- conserva con la identidad vieja. Este script actualiza SOLO esas columnas de
-- identidad (nombre, catalog_id) para TODOS los usuarios que las tengan, de modo
-- que se muestren con el nombre correcto y el botón "Restaurar valores del banco"
-- las encuentre en el catálogo nuevo.
--
-- Alcance GLOBAL (todos los usuarios): NO se filtra por auth.uid() — corre con
-- privilegios de administrador en el SQL Editor de Supabase, donde auth.uid() es
-- null. Se identifica cada tarjeta por su catalog_id/nombre viejo, así que solo
-- toca exactamente las filas que correspondan.
--
-- Qué NO toca (a propósito):
--   - cashback_rules: las reglas se respetan tal cual. Si un usuario quiere las
--     tasas nuevas, pulsa "Restaurar valores del banco" en la tarjeta (la app
--     resuelve las categorías por su id y respeta personalizaciones). Pisar
--     reglas en SQL es arriesgado porque guardan UUIDs de categorías por usuario.
--   - transacciones, abonos, saldos, fechas: intactos (se referencian por id de
--     tarjeta, que NO cambia).
--
-- Idempotente: las cláusulas de nombre viejo evitan re-aplicar sobre filas ya
-- migradas. Seguro de correr más de una vez.
-- ============================================================================

-- ── Scotiabank: "Visa Bravo" (scotia-visa-bravo) → "Bravo Visa" (scotia-bravo-visa)
update public.credit_cards
set name = 'Bravo Visa',
    catalog_id = 'scotia-bravo-visa'
where catalog_id = 'scotia-visa-bravo'
   or (catalog_id is null and bank = 'Scotiabank' and name = 'Visa Bravo');

-- ── Qik Crédito Básica → "Mastercard Qik Básica" (mismo id: qik-credito-basica)
update public.credit_cards
set name = 'Mastercard Qik Básica'
where catalog_id = 'qik-credito-basica'
  and name = 'Qik Crédito Básica';

-- ── Qik Pro → "Mastercard Qik" (mismo id: qik-pro)
update public.credit_cards
set name = 'Mastercard Qik Pro'
where catalog_id = 'qik-pro'
  and name = 'Qik Pro';

-- ── Verificación (opcional) ─────────────────────────────────────────────────
-- Descomenta para ver cuántas tarjetas quedaron con cada identidad nueva y que
-- el conteo de transacciones se conserva:
-- select c.catalog_id, c.name, count(*) as num_tarjetas,
--        sum((select count(*) from public.transactions t where t.card_id = c.id)) as num_transacciones
-- from public.credit_cards c
-- where c.catalog_id in ('scotia-bravo-visa', 'qik-credito-basica', 'qik-pro')
-- group by c.catalog_id, c.name;
