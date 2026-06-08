-- ============================================================================
-- DIAGNÓSTICO (solo lectura): transacciones del ciclo abierto y candidatas
-- ============================================================================
-- El "ciclo abierto" del sistema es menor que tu realidad: faltan consumos que
-- existen pero sin tarjeta (o con la tarjeta equivocada), por eso no suman.
-- Esta consulta muestra, en el rango del ciclo abierto de cada tarjeta:
--   (A) lo que YA está asignado a la tarjeta (suma actual del ciclo)
--   (B) transacciones SIN tarjeta en ese rango → candidatas a reasignar
--   (C) transacciones en OTRA tarjeta en ese rango → posibles mal asignadas
--
-- Ciclos abiertos (después del último corte):
--   CCN (corte 25): 2026-05-26 → 2026-06-25  (faltan ~RD$4,510)
--   Qik (corte 15): 2026-05-16 → 2026-06-15  (faltan ~RD$22,396)
--
-- No modifica nada. Ejecútalo en el SQL Editor de Supabase.
-- ============================================================================

-- Resumen: suma actual del ciclo abierto por tarjeta + total sin tarjeta en rango.
with me as (
  select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid
),
ranges as (
  select * from (values
    ('popular-mc-plus-ccn', 'Mastercard Plus CCN', date '2026-05-26', date '2026-06-25'),
    ('qik-credito-basica',  'Mastercard Qik Básica', date '2026-05-16', date '2026-06-15')
  ) as r(catalog_id, nombre, ini, fin)
),
card_ids as (
  select r.*, c.id as card_id
  from ranges r
  join public.credit_cards c on c.catalog_id = r.catalog_id and c.user_id = (select uid from me)
)
select
  ci.nombre as tarjeta_ciclo,
  ci.ini as ciclo_desde,
  ci.fin as ciclo_hasta,
  -- (A) ya asignado a ESTA tarjeta en el rango
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id = ci.card_id and t.date >= ci.ini and t.date <= ci.fin), 0), 2) as ya_en_ciclo,
  -- (B) SIN tarjeta en el mismo rango (candidatas a reasignar a esta tarjeta)
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id is null and t.user_id = (select uid from me)
      and t.date >= ci.ini and t.date <= ci.fin), 0), 2) as sin_tarjeta_en_rango,
  (select count(*) from public.transactions t
    where t.card_id is null and t.user_id = (select uid from me)
      and t.date >= ci.ini and t.date <= ci.fin) as num_sin_tarjeta
from card_ids ci
order by tarjeta_ciclo;

-- ── DETALLE: transacciones SIN tarjeta en el rango (para identificarlas) ─────
-- Estas son las candidatas a reasignar. Mira la descripción/monto/fecha para
-- saber a qué tarjeta pertenece cada una.
select t.id, t.date as fecha, t.description as descripcion,
       round(t.amount, 2) as monto, t.category_id
from public.transactions t, me
where t.user_id = me.uid
  and t.card_id is null
  and t.date >= date '2026-05-16'   -- el rango más amplio (Qik) cubre ambas
  and t.date <= date '2026-06-25'
order by t.date desc, t.amount desc;
