import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // localStorage (no sessionStorage): la SESIÓN debe sobrevivir al cierre del
    // navegador y al apagado de la PC. Mientras el refresh token siga vigente y
    // sea el mismo navegador, el usuario vuelve a entrar sin re-loguearse.
    // Los datos financieros (stores Zustand) sí se cachean en sessionStorage a
    // propósito —son solo caché y se re-cargan desde Supabase en cada sesión—,
    // así no queda información sensible en disco entre sesiones del navegador.
    // El signOut de Supabase borra su propia clave de localStorage, y el handler
    // SIGNED_OUT limpia los caches en sessionStorage: la protección multiusuario
    // se mantiene intacta.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Lectura de usuario centralizada para los stores. Antes cada acción llamaba a
// supabase.auth.getSession() por su cuenta (27 sitios): en el arranque eso son
// varias lecturas de sesión simultáneas, cada una capaz de gatillar un refresh
// de token. getSession() ya devuelve la sesión cacheada en memoria por el SDK,
// así que el ahorro real es de claridad y de un único punto de cambio; devuelve
// el user autenticado o null, sin lanzar.
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
