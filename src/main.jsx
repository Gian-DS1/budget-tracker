import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import StitchApp from './stitch/StitchApp.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <StitchApp />
      </AuthProvider>
    </I18nProvider>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
);
