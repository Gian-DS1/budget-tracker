-- Añade la bandera "tutorial_seen" al perfil del usuario.
-- Controla que el tutorial guiado (product tour) solo arranque solo la 1ª vez.
-- Idempotente. Correr a mano en el SQL editor de Supabase.

alter table public.profiles
  add column if not exists tutorial_seen boolean not null default false;
