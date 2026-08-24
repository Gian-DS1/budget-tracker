import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import StitchApp from './stitch/StitchApp.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import EnvNotice from './stitch/EnvNotice.jsx';

// Preconnect al proyecto Supabase: el handshake TLS corre en paralelo con el
// arranque de React, así el primer getSession()/fetch de datos no lo paga.
// Va aquí (no en index.html) porque la URL sale de la env de cada entorno.
const supabaseOrigin = import.meta.env.VITE_SUPABASE_URL;
if (supabaseOrigin) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = new URL(supabaseOrigin).origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <StitchApp />
      </AuthProvider>
    </I18nProvider>
    <EnvNotice />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
);
