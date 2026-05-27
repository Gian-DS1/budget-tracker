// FinTrack RD — Calendar Page

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeftRight, Calendar as CalendarIcon } from 'lucide-react';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import { formatCurrency, MONTHS_ES, DAYS_SHORT_ES } from '../utils/formatters';
import Modal from '../components/ui/Modal';

export default function CalendarPage() {
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    // Adjust to make Monday the first day of the week (optional, currently using Sunday=0)
    return day;
  };

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.date === dateStr);
      
      let income = 0;
      let expense = 0;
      dayTxs.forEach(t => {
        if (t.type === 'income') income += Number(t.amount);
        else expense += Number(t.amount);
      });

      days.push({
        empty: false,
        key: dateStr,
        date: dateStr,
        day: i,
        transactions: dayTxs,
        income,
        expense,
        balance: income - expense
      });
    }

    return days;
  }, [transactions, year, month]);

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => t.date === selectedDate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedDate, transactions]);

  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || '💸';

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendario de Movimientos</h1>
          <p className="page-subtitle">Visualiza tus ingresos y gastos en el tiempo</p>
        </div>
      </div>

      <div className="card">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button className="btn-icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-bold text-xl flex items-center gap-2">
            <CalendarIcon size={20} /> {MONTHS_ES[month]} {year}
          </h2>
          <button className="btn-icon" onClick={() => navigateMonth(1)}>
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Grid Header */}
        <div className="mb-2 text-center text-sm font-bold text-muted" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)' }}>
          {DAYS_SHORT_ES.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-7 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarData.map((cell) => {
            if (cell.empty) {
              return <div key={cell.key} style={{ minHeight: 100, background: 'transparent' }} />;
            }

            const isToday = cell.date === new Date().toISOString().split('T')[0];
            const hasActivity = cell.transactions.length > 0;

            return (
              <div 
                key={cell.key}
                onClick={() => hasActivity && setSelectedDate(cell.date)}
                style={{
                  minHeight: 100,
                  border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2)',
                  background: 'var(--bg-card)',
                  cursor: hasActivity ? 'pointer' : 'default',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
                className={hasActivity ? 'hover:shadow-md hover:-translate-y-1' : ''}
                onMouseEnter={(e) => hasActivity && (e.currentTarget.style.boxShadow = 'var(--shadow-md)', e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.borderColor = 'var(--accent-primary-subtle)')}
                onMouseLeave={(e) => hasActivity && (e.currentTarget.style.boxShadow = 'none', e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.borderColor = isToday ? 'var(--accent-primary)' : 'var(--border-primary)')}
              >
                <div className={`text-right text-sm mb-1 ${isToday ? 'font-bold text-accent' : 'text-muted'}`}>
                  {cell.day}
                </div>
                
                {hasActivity && (
                  <div className="flex flex-col gap-1 mt-2 text-xs font-semibold">
                    {cell.income > 0 && (
                      <div className="amount-positive truncate">+{formatCurrency(cell.income)}</div>
                    )}
                    {cell.expense > 0 && (
                      <div className="amount-negative truncate">-{formatCurrency(cell.expense)}</div>
                    )}
                  </div>
                )}
                
                {hasActivity && (
                  <div className="absolute bottom-1 left-1 right-1 flex gap-1 flex-wrap">
                    {cell.transactions.slice(0, 4).map((t, idx) => (
                      <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)' }} />
                    ))}
                    {cell.transactions.length > 4 && <span style={{fontSize: 8}} className="text-muted">+{cell.transactions.length-4}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal */}
      <Modal isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} title={`Transacciones del ${selectedDate?.split('-').reverse().join('/')}`}>
        {selectedTransactions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {selectedTransactions.map(t => (
              <div key={t.id} className="flex justify-between items-center p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ fontSize: '1.2rem', padding: 'var(--space-2)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                    {getCategoryIcon(t.categoryId)}
                  </div>
                  <div>
                    <div className="font-semibold">{t.description || 'Sin descripción'}</div>
                    <div className="text-xs text-muted">{t.type === 'income' ? 'Ingreso' : 'Gasto'}</div>
                  </div>
                </div>
                <div className={`font-bold ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted p-8">No hay transacciones registradas este día.</div>
        )}
      </Modal>

    </div>
  );
}
