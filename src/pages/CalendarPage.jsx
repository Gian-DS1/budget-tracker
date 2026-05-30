// FinTrack RD — Calendar Page

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import { formatCurrency, MONTHS_ES, DAYS_SHORT_ES, todayISO } from '../utils/formatters';
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

  const goToToday = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const calendarData = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.date === dateStr);
      
      let income = 0;
      let expense = 0;
      dayTxs.forEach(t => {
        if (t.type === 'income') income += Number(t.amount);
        else if (t.type === 'expense' || t.type === 'fixed_expense' || t.type === 'variable_expense') {
          expense += Number(t.amount);
        }
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

  // Monthly summary
  const monthlySummary = useMemo(() => {
    let income = 0, expense = 0, txCount = 0;
    calendarData.forEach(cell => {
      if (!cell.empty) {
        income += cell.income;
        expense += cell.expense;
        txCount += cell.transactions.length;
      }
    });
    return { income, expense, balance: income - expense, txCount };
  }, [calendarData]);

  // Day with highest expense
  const peakExpenseDay = useMemo(() => {
    let max = { expense: 0, day: null };
    calendarData.forEach(cell => {
      if (!cell.empty && cell.expense > max.expense) {
        max = { expense: cell.expense, day: cell.day };
      }
    });
    return max;
  }, [calendarData]);

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => t.date === selectedDate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedDate, transactions]);

  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || '💸';
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'Sin categoría';

  const todayStr = todayISO();

  return (
    <div className="page-container">
      <div className="page-header" id="tour-calendar-header">
        <h1 className="page-title">Calendario de Movimientos</h1>
        <p className="page-subtitle">Visualiza tus ingresos y gastos en el tiempo</p>
      </div>

      {/* Monthly Summary Strip */}
      <div className="calendar-summary-strip">
        <div className="calendar-summary-item">
          <TrendingUp size={16} style={{ color: 'var(--color-income)' }} />
          <div>
            <div className="calendar-summary-label">Ingresos</div>
            <div className="calendar-summary-value amount-positive">{formatCurrency(monthlySummary.income)}</div>
          </div>
        </div>
        <div className="calendar-summary-item">
          <TrendingDown size={16} style={{ color: 'var(--color-expense)' }} />
          <div>
            <div className="calendar-summary-label">Gastos</div>
            <div className="calendar-summary-value amount-negative">{formatCurrency(monthlySummary.expense)}</div>
          </div>
        </div>
        <div className="calendar-summary-item">
          <ArrowRightLeft size={16} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div className="calendar-summary-label">Balance</div>
            <div className={`calendar-summary-value ${monthlySummary.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
              {monthlySummary.balance >= 0 ? '+' : ''}{formatCurrency(monthlySummary.balance)}
            </div>
          </div>
        </div>
        <div className="calendar-summary-item">
          <CalendarIcon size={16} style={{ color: 'var(--text-secondary)' }} />
          <div>
            <div className="calendar-summary-label">Transacciones</div>
            <div className="calendar-summary-value">{monthlySummary.txCount}</div>
          </div>
        </div>
      </div>

      <div className="card calendar-card">
        {/* Month Navigation */}
        <div className="calendar-nav">
          <button className="btn-icon calendar-nav-btn" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="calendar-nav-center">
            <h2 className="calendar-month-title">
              <CalendarIcon size={18} /> {MONTHS_ES[month]} {year}
            </h2>
            <button className="calendar-today-btn" onClick={goToToday}>
              Hoy
            </button>
          </div>
          <button className="btn-icon calendar-nav-btn" onClick={() => navigateMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Grid Header */}
        <div className="calendar-grid calendar-weekdays">
          {DAYS_SHORT_ES.map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="calendar-grid">
          {calendarData.map((cell) => {
            if (cell.empty) {
              return <div key={cell.key} className="calendar-cell calendar-cell-empty" />;
            }

            const isToday = cell.date === todayStr;
            const hasActivity = cell.transactions.length > 0;
            const isSelected = cell.date === selectedDate;

            return (
              <div 
                key={cell.key}
                onClick={() => hasActivity && setSelectedDate(cell.date)}
                className={`calendar-cell ${isToday ? 'calendar-cell-today' : ''} ${hasActivity ? 'calendar-cell-active' : ''} ${isSelected ? 'calendar-cell-selected' : ''}`}
              >
                <div className={`calendar-day-number ${isToday ? 'calendar-day-today' : ''}`}>
                  {cell.day}
                </div>
                
                {hasActivity && (
                  <div className="calendar-cell-amounts">
                    {cell.income > 0 && (
                      <div className="calendar-amount-badge calendar-amount-income">
                        +{formatCurrency(cell.income)}
                      </div>
                    )}
                    {cell.expense > 0 && (
                      <div className="calendar-amount-badge calendar-amount-expense">
                        -{formatCurrency(cell.expense)}
                      </div>
                    )}
                  </div>
                )}
                
                {hasActivity && (
                  <div className="calendar-cell-dots">
                    {cell.transactions.slice(0, 5).map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`calendar-dot ${t.type === 'income' ? 'calendar-dot-income' : 'calendar-dot-expense'}`} 
                      />
                    ))}
                    {cell.transactions.length > 5 && (
                      <span className="calendar-dot-extra">+{cell.transactions.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Peak expense hint */}
        {peakExpenseDay.day && (
          <div className="calendar-footer-hint">
            📌 Día con mayor gasto: <strong>{peakExpenseDay.day} de {MONTHS_ES[month]}</strong> — {formatCurrency(peakExpenseDay.expense)}
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      <Modal isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} title={`Transacciones del ${selectedDate?.split('-').reverse().join('/')}`}>
        {selectedTransactions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {selectedTransactions.map(t => (
              <div key={t.id} className="calendar-modal-row">
                <div className="flex items-center gap-3">
                  <div className="calendar-modal-icon">
                    {getCategoryIcon(t.categoryId)}
                  </div>
                  <div>
                    <div className="font-semibold">{t.description || 'Sin descripción'}</div>
                    <div className="text-xs text-muted">{getCategoryName(t.categoryId)}</div>
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
