// Ahorros (Vaults) — shell: header (ahorro total) + grid de metas + modales. La
// lógica de aportes (con transacción enlazada) vive en useSavingsStore; la
// proyección en vaults/projection.js. Patrón espejo de Deudas.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import { Stagger } from '../StitchMotion';
import useSavingsStore from '../../stores/useSavingsStore';
import { isDemoActive, demoDeleteGoal, demoRestoreGoal } from '../demoMode';
import { formatCurrency } from '../../utils/formatters';
import VaultItem from './vaults/VaultItem';
import VaultForm from './vaults/VaultForm';
import ContributionModal from './vaults/ContributionModal';
import HistoryModal from './vaults/HistoryModal';

const fmt = (n) => formatCurrency(n);

export default function StitchVaults() {
  const { goals, contributions, addGoal, deleteGoal, restoreContribution, getTotalSaved } = useSavingsStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contribGoal, setContribGoal] = useState(null);
  const [historyGoal, setHistoryGoal] = useState(null);

  const total = getTotalSaved();

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (g) => { setEditing(g); setShowForm(true); };

  const onDelete = async (goal) => {
    // Captura los aportes antes de borrar para restaurarlos en el Deshacer.
    const goalContribs = contributions.filter((c) => c.goalId === goal.id);
    if (isDemoActive()) demoDeleteGoal(goal.id); else await deleteGoal(goal.id);
    toast((t) => (
      <span className="flex items-center gap-sm">Meta eliminada
        <button
          onClick={async () => {
            if (isDemoActive()) {
              demoRestoreGoal(goal, goalContribs);
            } else {
              await addGoal(goal);
              // Re-aplica los aportes (recrea sus transacciones enlazadas).
              for (const c of goalContribs) await restoreContribution(c);
            }
            toast.dismiss(t.id);
          }}
          className="text-primary font-bold underline"
        >Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
        <div>
          <div className="flex items-center gap-2 mb-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary live-dot" />
            <span className="font-mono-data text-mono-data text-tertiary uppercase tracking-wider">Sistema activo</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Metas de ahorro</h1>
          <p className="font-body-md text-body-md text-text-muted mt-2">Ahorro total acumulado: <span className="text-tertiary font-mono-data">{fmt(total)}</span></p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold px-md py-sm rounded hover:bg-primary-container transition-colors inner-glow flex items-center gap-xs self-start">
          <MS name="add" className="text-[16px]" /> Nueva meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-lg inner-glow py-[60px] flex flex-col items-center gap-sm text-center">
          <MS name="savings" className="text-[36px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Sin metas de ahorro todavía.</p>
          <button onClick={openCreate} className="mt-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest px-md py-sm rounded">Crear primera meta</button>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {goals.map((g) => (
            <VaultItem key={g.id} goal={g} onContribute={setContribGoal} onHistory={setHistoryGoal} onEdit={openEdit} onDelete={onDelete} />
          ))}
        </Stagger>
      )}

      {showForm && <VaultForm editing={editing} onClose={() => setShowForm(false)} />}
      {contribGoal && <ContributionModal goal={contribGoal} onClose={() => setContribGoal(null)} />}
      {historyGoal && <HistoryModal goal={historyGoal} onClose={() => setHistoryGoal(null)} />}
    </div>
  );
}
