// Copiar presupuesto del mes anterior: debe dejar el mes destino IGUAL al
// anterior (pisando filas existentes, p. ej. las creadas con 0 al tocar un
// sobre), no solo insertar las categorías que falten.
import { describe, it, expect, beforeEach } from 'vitest';
import useBudgetStore from '../stores/useBudgetStore';
import { demoCopyBudgetFromPreviousMonth } from './demoMode';

const row = (id, categoryId, year, month, estimatedAmount) => ({
  id, categoryId, year, month, estimatedAmount, currency: 'DOP', createdAt: '2026-01-01T00:00:00Z',
});

describe('demoCopyBudgetFromPreviousMonth', () => {
  beforeEach(() => {
    useBudgetStore.setState({ budgets: [] });
  });

  it('pisa los montos existentes del mes destino con los del mes anterior', () => {
    useBudgetStore.setState({
      budgets: [
        row('p1', 'cat-a', 2026, 4, 5000),
        row('p2', 'cat-b', 2026, 4, 1200),
        // Fila ya existente en el mes destino (quedó en 0 al tocar el sobre).
        row('c1', 'cat-a', 2026, 5, 0),
      ],
    });

    expect(demoCopyBudgetFromPreviousMonth(2026, 5)).toBe(true);

    const dest = useBudgetStore.getState().budgets.filter((b) => b.year === 2026 && b.month === 5);
    expect(dest.find((b) => b.categoryId === 'cat-a').estimatedAmount).toBe(5000);
    expect(dest.find((b) => b.categoryId === 'cat-b').estimatedAmount).toBe(1200);
    expect(dest).toHaveLength(2);
  });

  it('no toca categorías del mes destino que no existían el mes anterior', () => {
    useBudgetStore.setState({
      budgets: [
        row('p1', 'cat-a', 2026, 4, 5000),
        row('c1', 'cat-z', 2026, 5, 800),
      ],
    });

    expect(demoCopyBudgetFromPreviousMonth(2026, 5)).toBe(true);

    const dest = useBudgetStore.getState().budgets.filter((b) => b.year === 2026 && b.month === 5);
    expect(dest.find((b) => b.categoryId === 'cat-z').estimatedAmount).toBe(800);
    expect(dest.find((b) => b.categoryId === 'cat-a').estimatedAmount).toBe(5000);
  });

  it('cruza el año: enero copia de diciembre del año anterior', () => {
    useBudgetStore.setState({ budgets: [row('p1', 'cat-a', 2025, 11, 3000)] });

    expect(demoCopyBudgetFromPreviousMonth(2026, 0)).toBe(true);

    const dest = useBudgetStore.getState().budgets.filter((b) => b.year === 2026 && b.month === 0);
    expect(dest.find((b) => b.categoryId === 'cat-a').estimatedAmount).toBe(3000);
  });

  it('devuelve false si el mes anterior no tiene presupuesto', () => {
    expect(demoCopyBudgetFromPreviousMonth(2026, 5)).toBe(false);
  });
});
