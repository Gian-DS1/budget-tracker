// StitchApp — router de la reconstrucción 1:1 (UI pura, sin lógica).
// Se monta desde main.jsx (rama rebuild/stitch-pure). La lógica se cablea
// después usando docs/logic/.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StitchHead from './StitchHead';
import StitchShell from './StitchShell';
import StitchDashboard from './screens/StitchDashboard';
import StitchLedger from './screens/StitchLedger';
import StitchVaults from './screens/StitchVaults';
import StitchBudget from './screens/StitchBudget';
import StitchCards from './screens/StitchCards';
import StitchStrategy from './screens/StitchStrategy';
import StitchReports from './screens/StitchReports';
import StitchCalendar from './screens/StitchCalendar';
import StitchSettings from './screens/StitchSettings';
import StitchFeedback from './screens/StitchFeedback';
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
            <Route path="budget" element={<StitchBudget />} />
            <Route path="cards" element={<StitchCards />} />
            <Route path="vaults" element={<StitchVaults />} />
            <Route path="plan" element={<StitchStrategy />} />
            <Route path="reports" element={<StitchReports />} />
            <Route path="calendar" element={<StitchCalendar />} />
            <Route path="settings" element={<StitchSettings />} />
            <Route path="feedback" element={<StitchFeedback />} />
            <Route path="*" element={<StitchPending title="404" source="—" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
