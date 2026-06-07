-- ============================================================================
-- DIAGNÓSTICO (solo lectura): consumos del CICLO ABIERTO que faltan
-- ============================================================================
-- El pendiente al corte ya cuadra. Falta cuadrar el ciclo abierto (consumos
-- DESPUÉS del último corte). Lo que falta:
--   CCN (corte 25 may): faltan ~RD$ 4,510.42  → ciclo debe llegar a 6,443.88
--   Qik (corte 15 may): faltan ~RD$   352.14  → ciclo debe llegar a 34,606.94
--
-- Esta consulta lista TODAS las transacciones (con o sin tarjeta) en el rango del
-- ciclo abierto de cada tarjeta, para identificar cuáles deberían ser de la
-- tarjeta y no lo están. No modifica nada.
-- ============================================================================

with me as (select '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid as uid),
ranges as (
  select * from (values
    ('Mastercard Plus CCN',   'popular-mc-plus-ccn', date '2026-05-26', date '2026-06-25'),
    ('Mastercard Qik Básica', 'qik-credito-basica',  date '2026-05-16', date '2026-06-15')
  ) as r(nombre, catalog_id, ini, fin)
),
ids as (
  select r.*, c.id as card_id
  from ranges r join public.credit_cards c on c.catalog_id = r.catalog_id and c.user_id = (select uid from me)
)
-- (A) Resumen: cuánto suma el ciclo hoy y cuánto hay sin tarjeta / en otra tarjeta en el rango
select
  ids.nombre as ciclo_de,
  ids.ini, ids.fin,
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id = ids.card_id and t.date >= ids.ini and t.date <= ids.fin),0),2) as en_esta_tarjeta,
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id is null and t.user_id=(select uid from me) and t.date >= ids.ini and t.date <= ids.fin),0),2) as sin_tarjeta_en_rango,
  round(coalesce((select sum(t.amount - coalesce(t.cashback_earned,0)) from public.transactions t
    where t.card_id is not null and t.card_id <> ids.card_id and t.user_id=(select uid from me) and t.date >= ids.ini and t.date <= ids.fin),0),2) as en_otra_tarjeta_en_rango
from ids order by ciclo_de;

-- (B) DETALLE: todas las transacciones del rango más amplio (16 may–25 jun), con su
-- tarjeta actual, para que identifiques cuáles reasignar. NULL = sin tarjeta.
select t.id, t.date as fecha, t.description as descripcion, round(t.amount,2) as monto,
       coalesce((select name from public.credit_cards c where c.id = t.card_id), '— SIN TARJETA —') as tarjeta_actual
from public.transactions t, me
where t.user_id = me.uid
  and t.date >= date '2026-05-16' and t.date <= date '2026-06-25'
order by t.date desc, t.amount desc;
