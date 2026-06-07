import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
