// Resumen de patrimonio: neto (efectivo + ahorro − deudas) + las 3 bolsas. Reusa
// los selectores/stores existentes; cero lógica de cálculo nueva. Es el ancla de
// "Mis finanzas": los tabs de abajo muestran el DETALLE, no estos totales.
import { useMemo } from 'react';
import CountUp from '../../CountUp';
import useTransactionStore from '../../../stores/useTransactionStore';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import useSavingsStore from '../../../stores/useSavingsStore';
import useDebtStore from '../../../stores/useDebtStore';
import usePrefsStore from '../../../stores/usePrefsStore';
import { getLiquidCash } from '../dashboard/selectors';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function PatrimonioSummary() {
  const { t } = useI18n();
  const transactions = useTransactionStore((s) => s.transactions);
  const cards = useCreditCardStore((s) => s.cards);
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);

  const cash = useMemo(() => getLiquidCash(transactions, initialCashBalance, cards), [transactions, initialCashBalance, cards]);
  const savings = getTotalSaved();
  const debts = getTotalDebt();
  const netWorth = cash + savings - debts;

  const bolsas = [
    { label: t('finances.cash'), value: cash, cls: 'text-on-surface' },
    { label: t('finances.savings'), value: savings, cls: 'text-secondary' },
    { label: t('finances.debts'), value: debts, cls: 'text-accent-error', sign: '−' },
  ];

  return (
    <div className="glass-card rounded-lg inner-glow p-lg mb-lg">
      <div className="font-mono-data text-mono-data text-text-muted uppercase mb-xs">{t('finances.netWorth')}</div>
      <div className={`font-hero-headline text-[40px] sm:text-[48px] tracking-tighter leading-none tabular-nums ${netWorth >= 0 ? 'text-on-surface' : 'text-accent-error'}`}>
        <CountUp value={netWorth} format={fmt} />
      </div>
      <div className="flex flex-wrap gap-x-xl gap-y-sm mt-md">
        {bolsas.map((b) => (
          <div key={b.label} className="flex flex-col">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{b.label}</span>
            <span className={`font-headline-md text-[18px] tracking-tight tabular-nums ${b.cls}`}>
              {b.sign || ''}<CountUp value={b.value} format={fmt} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
