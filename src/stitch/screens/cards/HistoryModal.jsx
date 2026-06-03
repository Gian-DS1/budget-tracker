// Modal de historial de abonos de una tarjeta. Lista los abonos (fecha, monto,
// nota) de más reciente a más antiguo, con cashback de por vida arriba y borrar
// con deshacer.
import toast from 'react-hot-toast';
import MS from '../../MS';
import { isDemoActive, demoDeleteCardPayment, demoAddCardPayment } from '../../demoMode';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import { getLifetimeCashback } from '../../../utils/creditCards';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Modal } from './cardsUi';

const fmt = (n) => formatCurrency(n);

export default function HistoryModal({ card, transactions, onClose }) {
  const { addCardPayment, deleteCardPayment } = useCreditCardStore();
  const demo = isDemoActive();
  const payments = [...(card.payments || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const cashback = getLifetimeCashback(card, transactions);

  const onDelete = (p) => {
    if (demo) demoDeleteCardPayment(card.id, p.id); else deleteCardPayment(card.id, p.id);
    toast((t) => (
      <span className="flex items-center gap-sm">Abono eliminado
        <button
          onClick={() => {
            if (demo) demoAddCardPayment(card.id, p); else addCardPayment(card.id, p);
            toast.dismiss(t.id);
          }}
          className="text-primary font-bold underline"
        >Deshacer</button>
      </span>
    ), { duration: 6000 });
  };

  return (
    <Modal title={`Abonos · ${card.name}`} onClose={onClose}>
      <div className="bg-surface-container-lowest border border-border-subtle rounded p-md inner-glow flex justify-between items-center mb-md">
        <span className="font-mono-data text-mono-data text-text-muted uppercase">Cashback de por vida</span>
        <span className="font-mono-data text-[15px] text-tertiary">+{fmt(cashback)}</span>
      </div>

      {payments.length === 0 ? (
        <div className="py-[40px] flex flex-col items-center text-center gap-sm">
          <MS name="payments" className="text-[32px] text-text-muted" />
          <p className="font-body-md text-body-md text-on-surface-variant">Aún no has registrado abonos.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-sm group">
              <div className="flex flex-col min-w-0">
                <span className="font-mono-data text-[14px] text-on-surface">{fmt(p.amount)}</span>
                <span className="font-mono-data text-mono-data text-text-muted">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
              </div>
              <button onClick={() => onDelete(p)} className="text-text-muted hover:text-accent-error p-xs opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar abono">
                <MS name="delete" className="!text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
