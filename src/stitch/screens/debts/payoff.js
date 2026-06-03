// Proyección de liquidación de una deuda (payoff), derivada del saldo, interés y
// cuota. Envuelve calculateAmortization. Función pura, testeable.
//
// Devuelve { coversInterest, months, totalInterest, payoffDate, currency }.
//   - coversInterest=false cuando la cuota no cubre el interés (no liquida nunca):
//     months/totalInterest/payoffDate quedan en null (sin NaN).
//   - interés 0 → liquida en ceil(saldo/cuota) meses, intereses 0.

import { calculateAmortization } from '../../../utils/calculations';

export function getPayoff(debt) {
  const balance = Number(debt.currentBalance) || 0;
  const rate = Number(debt.interestRate) || 0;
  const monthly = Number(debt.monthlyPayment) || 0;
  const currency = debt.currency || 'DOP';

  const monthlyInterest = balance * (rate / 100 / 12);
  // La cuota debe cubrir al menos el interés del mes para amortizar capital.
  if (monthly <= 0 || (rate > 0 && monthly <= monthlyInterest)) {
    return { coversInterest: false, months: null, totalInterest: null, payoffDate: null, currency };
  }

  const schedule = calculateAmortization(balance, rate, monthly);
  if (schedule.length === 0) {
    return { coversInterest: false, months: null, totalInterest: null, payoffDate: null, currency };
  }
  const months = schedule.length;
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return { coversInterest: true, months, totalInterest, payoffDate, currency };
}
