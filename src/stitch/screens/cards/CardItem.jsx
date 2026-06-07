// Tarjeta individual — 3 líneas jerárquicas (spec de abonos parciales):
//   1. Ciclo abierto (consumo, informativo)
//   2. POR PAGAR (protagonista) + Abonar / Pagar todo
//   3. Saldo total de la tarjeta
import toast from 'react-hot-toast';
import MS from '../../MS';
import { Stagger } from '../../StitchMotion';
import { isDemoActive, demoAddCardPayment } from '../../demoMode';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import { getCardBalances, getLifetimeCashback, getDerivedCashback, hasTieredRule } from '../../../utils/creditCards';
import { formatCurrency, formatDate, todayISO } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);
const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CardItem({ card, transactions, onPay, onHistory, onEdit, onDelete }) {
  const addCardPayment = useCreditCardStore((s) => s.addCardPayment);
  const bal = getCardBalances(card, transactions, new Date());
  // Cashback congelado (reglas % plano) + derivado del mes (reglas escalonadas
  // tipo CCN, que dependen del consumo mensual acumulado y no se congelan).
  const tiered = hasTieredRule(card);
  const cashback = getLifetimeCashback(card, transactions)
    + (tiered ? getDerivedCashback(card, transactions, monthKeyOf(new Date())) : 0);

  const payAll = async () => {
    const amt = Math.round(bal.pendingBilled * 100) / 100;
    if (amt <= 0) return;
    const payload = { amount: amt, date: todayISO(), note: 'Pago total' };
    if (isDemoActive()) { demoAddCardPayment(card.id, payload); toast.success('Estado de cuenta saldado 🎉', { duration: 4000 }); }
    else await addCardPayment(card.id, payload);
  };

  return (
    <Stagger.Item className="bg-surface-card rounded-xl border border-border-subtle inner-glow relative overflow-hidden group flex flex-col">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `linear-gradient(135deg, ${card.color}11, transparent)` }} />

      {/* Encabezado */}
      <div className="flex justify-between items-start p-lg pb-md relative z-10">
        <div className="flex items-center gap-sm min-w-0">
          <span className="w-2 h-2 rounded-full glow-dot shrink-0" style={{ background: card.color, color: card.color }} />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm uppercase text-on-surface truncate">{card.name}</span>
            {card.bank && <span className="font-mono-data text-mono-data text-text-muted truncate">{card.bank}</span>}
          </div>
        </div>
        <div className="flex gap-xs shrink-0">
          <button onClick={() => onHistory(card)} className="text-text-muted hover:text-primary p-xs" aria-label="Historial de abonos"><MS name="history" className="!text-[16px]" /></button>
          <button onClick={() => onEdit(card)} className="text-text-muted hover:text-primary p-xs" aria-label="Editar"><MS name="edit" className="!text-[16px]" /></button>
          <button onClick={() => onDelete(card)} className="text-text-muted hover:text-accent-error p-xs" aria-label="Eliminar"><MS name="delete" className="!text-[16px]" /></button>
        </div>
      </div>

      {/* Línea 1 — ciclo abierto (informativo) */}
      <div className="px-lg py-sm flex justify-between items-center relative z-10 border-t border-border-subtle">
        <div className="flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted">CICLO ABIERTO (CONSUMO)</span>
          <span className="font-mono-data text-mono-data text-text-muted mt-0.5">Corte al {formatDate(bal.cycles.nextCutoffISO)}</span>
        </div>
        <span className="font-mono-data text-[15px] text-on-surface-variant">{fmt(bal.openCycle)}</span>
      </div>

      {/* Línea 2 — POR PAGAR (protagonista) */}
      <div className="px-lg py-md relative z-10 border-t border-border-subtle bg-surface-container-lowest/40">
        {bal.isPaid ? (
          <div className="flex items-center justify-between gap-sm">
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-xs"><MS name="check_circle" className="!text-[16px]" /> Al día</span>
            {/* Aun sin saldo, se puede adelantar un abono (prepago). */}
            <button onClick={() => onPay(card)} className="border border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase px-sm py-xs rounded hover:bg-surface-container-high transition-colors">Adelantar abono</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="font-mono-data text-mono-data text-accent-warning">POR PAGAR ANTES DEL {formatDate(bal.cycles.dueDateISO)}</span>
                <span className="font-headline-md text-[28px] text-on-surface tracking-tighter mt-0.5">{fmt(bal.pendingBilled)}</span>
              </div>
            </div>
            {bal.spansMultipleCycles && (
              <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal block mt-xs">Incluye saldo de meses anteriores.</span>
            )}
            <div className="flex items-center justify-between mt-md gap-sm">
              <span className="font-mono-data text-mono-data text-text-muted">Abonado: {fmt(bal.paid)}</span>
              <div className="flex gap-sm">
                <button onClick={() => onPay(card)} className="border border-border-subtle text-primary font-mono-data text-mono-data uppercase px-sm py-xs rounded hover:bg-primary/10 transition-colors">Abonar</button>
                <button onClick={payAll} className="bg-primary text-on-primary font-mono-data text-mono-data uppercase px-sm py-xs rounded hover:bg-primary-container transition-colors">Pagar todo</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Línea 3 — saldo total + cashback */}
      <div className="px-lg py-md relative z-10 border-t border-border-subtle flex justify-between items-center">
        <div className="flex flex-col">
          <span className="font-mono-data text-mono-data text-text-muted flex items-center gap-xs">
            SALDO TOTAL
            <span title="Incluye el consumo nuevo aún sin cortar."><MS name="info" className="!text-[12px] text-text-muted/60" /></span>
          </span>
          {bal.overpay > 0 && <span className="font-mono-data text-mono-data text-tertiary mt-0.5">Prepago {fmt(bal.overpay)}</span>}
        </div>
        <div className="flex flex-col text-right">
          <span className="font-mono-data text-[15px] text-on-surface-variant">{fmt(bal.totalBalance)}</span>
          <span className="font-mono-data text-mono-data text-tertiary mt-0.5">
            cashback +{fmt(cashback)}{tiered && <span className="text-text-muted"> · estimado del mes</span>}
          </span>
        </div>
      </div>
    </Stagger.Item>
  );
}
