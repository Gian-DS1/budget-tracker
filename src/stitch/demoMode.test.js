// Copiar presupuesto del mes anterior: debe dejar el mes destino IGUAL al
// anterior (pisando filas existentes, p. ej. las creadas con 0 al tocar un
// sobre), no solo insertar las categorías que falten.
import { describe, it, expect, beforeEach } from 'vitest';
import useBudgetStore from '../stores/useBudgetStore';
import useCategoryStore from '../stores/useCategoryStore';
import useTransactionStore from '../stores/useTransactionStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import usePrefsStore from '../stores/usePrefsStore';
import { demoCopyBudgetFromPreviousMonth, seedFreshStores } from './demoMode';

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

describe('seedFreshStores', () => {
  it('deja todos los stores vacios y la moneda sin elegir', () => {
    // Ensuciar los stores primero para probar que se vacían.
    useCategoryStore.setState({ categories: [{ id: 'x', name: 'X' }], loading: true });
    useTransactionStore.setState({ transactions: [{ id: 't' }], loading: true });
    useSavingsStore.setState({ goals: [{ id: 'g' }], contributions: [{ id: 'c' }], loading: true });
    useDebtStore.setState({ debts: [{ id: 'd' }], payments: [{ id: 'p' }], loading: true });
    useCreditCardStore.setState({ cards: [{ id: 'cc' }], loading: true });
    usePrefsStore.setState({ currency: 'DOP', tutorialSeen: true });

    seedFreshStores();

    expect(useCategoryStore.getState().categories).toEqual([]);
    expect(useTransactionStore.getState().transactions).toEqual([]);
    expect(useSavingsStore.getState().goals).toEqual([]);
    expect(useSavingsStore.getState().contributions).toEqual([]);
    expect(useDebtStore.getState().debts).toEqual([]);
    expect(useDebtStore.getState().payments).toEqual([]);
    expect(useCreditCardStore.getState().cards).toEqual([]);
    expect(usePrefsStore.getState().currency).toBeNull();
    expect(usePrefsStore.getState().tutorialSeen).toBe(false);
    expect(useCategoryStore.getState().loading).toBe(false);
  });
});
