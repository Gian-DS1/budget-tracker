// FinTrack — Header Component

import { useMemo, useState, useRef, useEffect } from 'react';
import { Moon, Sun, Menu, Bell } from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';
import useCreditCardStore from '../../stores/useCreditCardStore';
import useTransactionStore from '../../stores/useTransactionStore';
import useDebtStore from '../../stores/useDebtStore';
import useRecurringStore from '../../stores/useRecurringStore';
import { getCardBalances } from '../../utils/creditCards';
import { formatCurrency, formatDate } from '../../utils/formatters';

const REMINDER_WINDOW_DAYS = 7;

function daysUntil(dueISO, todayMid) {
  const due = new Date(String(dueISO).slice(0, 10) + 'T00:00:00');
  if (isNaN(due.getTime())) return null;
  return Math.round((due - todayMid) / 86400000);
}

function dueLabel(days) {
  if (days === 0) return 'vence hoy';
  if (days === 1) return 'vence mañana';
  return `vence en ${days} días`;
}

export default function Header() {
  const { theme, toggleTheme, sidebarCollapsed, toggleMobileMenu } = useThemeStore();

  const cards = useCreditCardStore((s) => s.cards);
  const transactions = useTransactionStore((s) => s.transactions);
  const debts = useDebtStore((s) => s.debts);
  const recurring = useRecurringStore((s) => s.recurring);

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Recordatorios: pagos/vencimientos próximos (≤7 días), calculados de datos
  // existentes — tarjetas (estado de cuenta por pagar), deudas con fecha de pago
  // y transacciones recurrentes próximas.
  const reminders = useMemo(() => {
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items = [];

    cards.forEach((card) => {
      const bal = getCardBalances(card, transactions, now);
      if (bal.pendingBilled <= 0 || bal.isPaid) return;
      const days = daysUntil(bal.cycles.dueDateISO, todayMid);
      if (days != null && days >= 0 && days <= REMINDER_WINDOW_DAYS) {
        items.push({
          id: `card-${card.id}`,
          icon: '💳',
          title: card.name,
          detail: formatCurrency(bal.pendingBilled),
          days,
          dueISO: bal.cycles.dueDateISO,
        });
      }
    });

    debts
      .filter((d) => d.status === 'active' && d.due_date)
      .forEach((d) => {
        const days = daysUntil(d.due_date, todayMid);
        if (days != null && days >= 0 && days <= REMINDER_WINDOW_DAYS) {
          items.push({
            id: `debt-${d.id}`,
            icon: '🏛️',
            title: d.creditorName,
            detail: formatCurrency(d.monthlyPayment, d.currency),
            days,
            dueISO: String(d.due_date).slice(0, 10),
          });
        }
      });

    recurring
      .filter((r) => r.active)
      .forEach((r) => {
        const days = daysUntil(r.nextDate, todayMid);
        if (days != null && days >= 0 && days <= REMINDER_WINDOW_DAYS) {
          items.push({
            id: `rec-${r.id}`,
            icon: '🔁',
            title: r.description || 'Recurrente',
            detail: formatCurrency(r.amount, r.currency),
            days,
            dueISO: r.nextDate,
          });
        }
      });

    return items.sort((a, b) => a.days - b.days);
  }, [cards, transactions, debts, recurring]);

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="flex items-center gap-4">
        <button className="btn-icon mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Abrir menú" aria-expanded="false">
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="header-actions">
        <div className="relative" ref={panelRef} id="tour-reminders">
          <button
            className="btn-icon"
            onClick={() => setOpen((v) => !v)}
            title="Recordatorios"
            aria-label={`Recordatorios${reminders.length > 0 ? ` (${reminders.length})` : ''}`}
            aria-expanded={open}
            style={{ position: 'relative' }}
          >
            <Bell size={20} aria-hidden="true" />
            {reminders.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: '9999px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {reminders.length}
              </span>
            )}
          </button>

          {open && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 320,
                maxWidth: '90vw',
                maxHeight: 400,
                overflowY: 'auto',
                padding: 'var(--space-4)',
                zIndex: 'var(--z-tooltip)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="font-bold mb-4">Próximos pagos</div>
              {reminders.length === 0 ? (
                <div className="text-sm text-muted text-center py-4">
                  No tienes pagos próximos. 🎉
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reminders.map((r) => (
                    <div key={r.id} className="flex items-center gap-3" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{r.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="font-semibold text-sm truncate" title={r.title}>{r.title}</div>
                        <div className="text-xs" style={{ color: r.days <= 1 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>
                          {dueLabel(r.days)} · {formatDate(r.dueISO)}
                        </div>
                      </div>
                      <span className="font-bold text-sm amount-neutral" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
