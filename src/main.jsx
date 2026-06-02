import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import StitchApp from './stitch/StitchApp.jsx';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <StitchApp />
    </AuthProvider>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
);
