import { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { isDemoActive } from './demoMode';

// Aviso de configuración faltante. Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// la app monta pero no puede autenticar ni guardar nada, así que en vez de dejar
// que el usuario descubra el problema a base de errores en consola, se lo decimos.
//
// No aparece en modo demo: el demo siembra los stores en memoria y no toca el
// backend, así que ahí no falta nada por configurar.
export default function EnvNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (isSupabaseConfigured || dismissed || isDemoActive()) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 inset-x-0 z-[9999] px-4 py-3 text-sm bg-[#3a2a06] text-[#ffe8b0] border-t border-[#7a5a10] flex flex-wrap items-center justify-center gap-2"
    >
      <span>
        Faltan las variables de Supabase: copia <code className="font-mono">.env.example</code> a{' '}
        <code className="font-mono">.env</code> y rellena{' '}
        <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
        <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="underline underline-offset-2 opacity-80 hover:opacity-100"
      >
        Ocultar
      </button>
    </div>
  );
}
