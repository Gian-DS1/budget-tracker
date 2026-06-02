// rama rebuild/stitch-pure: monta la UI Stitch pura (sin lógica/auth).
// El App.jsx original + AuthProvider se reconectan después, cuando se cablee
// la lógica documentada en docs/logic/ sobre esta carrocería.
import React from 'react';
import ReactDOM from 'react-dom/client';
import StitchApp from './stitch/StitchApp.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StitchApp />
  </React.StrictMode>,
);
