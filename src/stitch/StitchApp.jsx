// StitchApp — router de la reconstrucción 1:1 (UI pura, sin lógica).
// Se monta desde main.jsx (rama rebuild/stitch-pure). La lógica se cablea
// después usando docs/logic/.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StitchHead from './StitchHead';
import StitchShell from './StitchShell';
import StitchDashboard from './screens/StitchDashboard';
import StitchLedger from './screens/StitchLedger';
import StitchVaults from './screens/StitchVaults';
import StitchPending from './screens/StitchPending';
import './stitch.css';

export default function StitchApp() {
  return (
    <>
      <StitchHead />
      <BrowserRouter>
        <Routes>
          <Route element={<StitchShell />}>
            <Route index element={<StitchDashboard />} />
            <Route path="ledger" element={<StitchLedger />} />
            <Route path="vaults" element={<StitchVaults />} />
            <Route path="budget" element={<StitchPending title="Budget Control" source="Romer Budget Control" />} />
            <Route path="cards" element={<StitchPending title="Cards & Debt" source="Romer Card & Debt Manager" />} />
            <Route path="plan" element={<StitchPending title="Strategy & Planning" source="Romer Strategy & Planning" />} />
            <Route path="reports" element={<StitchPending title="Intelligence Reports" source="Romer Intelligence Reports" />} />
            <Route path="calendar" element={<StitchPending title="Calendar" source="FinTrack RD - Calendario" />} />
            <Route path="settings" element={<StitchPending title="Settings" source="FinTrack RD - Ajustes" />} />
            <Route path="*" element={<StitchPending title="404" source="—" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
