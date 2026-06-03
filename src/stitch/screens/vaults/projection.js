// Proyección de una meta de ahorro, derivada del saldo, la meta y el aporte
// mensual. Envuelve monthsToGoal/projectedCompletionDate. Función pura, testeable.
//
// Devuelve { reachable, done, months, remaining, projectedDate, pct }.
//   - reachable=false cuando monthlyContribution<=0 (sin proyección de fecha).
//   - done=true cuando currentAmount>=targetAmount (con targetAmount>0).
//   - months=0 cuando ya está completada.

import { monthsToGoal, projectedCompletionDate } from '../../../utils/calculations';

export function getProjection(goal) {
  const current = Number(goal.currentAmount) || 0;
  const target = Number(goal.targetAmount) || 0;
  const monthly = Number(goal.monthlyContribution) || 0;

  const remaining = Math.max(0, target - current);
  const done = target > 0 && current >= target;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  if (done) {
    return { reachable: true, done: true, months: 0, remaining: 0, projectedDate: null, pct };
  }
  if (monthly <= 0) {
    return { reachable: false, done: false, months: null, remaining, projectedDate: null, pct };
  }

  const months = monthsToGoal(current, target, monthly);
  const projectedDate = projectedCompletionDate(current, target, monthly);
  return { reachable: true, done: false, months, remaining, projectedDate, pct };
}
