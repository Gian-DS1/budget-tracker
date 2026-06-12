-- ============================================================================
-- FinTrack RD — Rate limiting del lado del servidor (por usuario y acción)
-- ============================================================================
-- CÓMO USAR: corre TODO el archivo en el SQL Editor de Supabase. Idempotente.
--
-- Qué hace:
--   - Tabla `rate_limits`: contadores por (usuario, acción, ventana de tiempo).
--     SIN acceso directo de ningún cliente (RLS activado y sin políticas; los
--     grants se revocan). Solo la función SECURITY DEFINER puede tocarla.
--   - Función `check_rate_limit(action, max, window_seconds)`: incrementa el
--     contador de la ventana actual y devuelve true si el usuario sigue dentro
--     del límite. La llaman los endpoints serverless (/api/parse-pdf,
--     /api/feedback) vía RPC con el JWT del usuario, así que auth.uid() es
--     siempre el usuario real — un cliente malicioso solo puede inflar su
--     propio contador (autocastigarse), nunca el de otro.
-- ============================================================================

create table if not exists public.rate_limits (
  user_id      uuid not null,
  action       text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (user_id, action, window_start)
);

-- Nadie toca la tabla directamente: RLS sin políticas + revocar grants.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_action text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz;
  v_count integer;
begin
  -- Sin usuario autenticado no hay cuota que consumir: denegar.
  if v_user is null then
    return false;
  end if;

  -- Ventana fija alineada al reloj (p. ej. cada hora en punto para 3600s).
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as rl (user_id, action, window_start, count)
  values (v_user, p_action, v_window, 1)
  on conflict (user_id, action, window_start)
  do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Limpieza oportunista: al estrenar ventana, borra las viejas del usuario.
  if v_count = 1 then
    delete from public.rate_limits
    where user_id = v_user and action = p_action and window_start < v_window;
  end if;

  return v_count <= p_max;
end;
$$;

-- Solo usuarios autenticados pueden ejecutarla (los endpoints la llaman con el
-- JWT del usuario). anon y public no.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated, service_role;
