// Presupuesto — punto de entrada delgado. Lee el nivel elegido por el usuario y
// delega el render a BudgetShell, que monta la sub-vista correspondiente
// (Seguimiento / 50-30-20 / Base cero).
import usePrefsStore from '../../stores/usePrefsStore';
import BudgetShell from './budget/BudgetShell';

export default function StitchBudget() {
  const level = usePrefsStore((s) => s.budgetLevel);
  return <BudgetShell level={level} />;
}
