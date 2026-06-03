// Motor de análisis (reglas heurísticas locales). Recibe datos ya calculados y
// devuelve recomendaciones priorizadas en lenguaje llano. Determinista y puro.
//
// Entrada: {
//   savingsRate: number,                              // (ingreso-gasto)/ingreso, prom. del periodo
//   topRising: { name, deltaPct, deltaAbs } | null,   // categoría que más subió vs mes anterior
//   concentration: { name, pct } | null,              // categoría top del mes y su % del gasto
//   trendDirection: 'up' | 'down' | 'flat',           // tendencia del gasto en el periodo
//   dti: number,                                       // cuota mensual de deuda / ingreso promedio
//   hasData: boolean,
// }
// Salida: [{ severity:'alert'|'warn'|'good'|'info', icon, title, body }] ordenada.
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);
const ORDER = { alert: 0, warn: 1, good: 2, info: 3 };

export function getAnalysis(input) {
  if (!input || !input.hasData) {
    return [{
      severity: 'info', icon: 'analytics',
      title: 'Aún no hay suficiente información',
      body: 'Registra más movimientos para que el análisis sea preciso.',
    }];
  }

  const { savingsRate, topRising, concentration, trendDirection, dti } = input;
  const out = [];

  // 1 · Tasa de ahorro
  if (savingsRate < 0) {
    out.push({
      severity: 'alert', icon: 'trending_down',
      title: 'Gastas más de lo que ingresas',
      body: 'Este periodo tu gasto superó tus ingresos. Revisa tus gastos variables y recorta lo que puedas.',
    });
  } else if (savingsRate >= 0.2) {
    out.push({
      severity: 'good', icon: 'savings',
      title: `Ahorras ${(savingsRate * 100).toFixed(0)}%, vas muy bien`,
      body: 'Mantienes una tasa de ahorro saludable. Considera destinar el excedente a una meta o a reducir deuda.',
    });
  } else {
    out.push({
      severity: 'warn', icon: 'savings',
      title: `Tu ahorro es bajo (${(savingsRate * 100).toFixed(0)}%)`,
      body: 'Apunta a ahorrar al menos el 20% de tus ingresos. Identifica una categoría para recortar.',
    });
  }

  // 2 · Categoría que más subió (solo si la subida es relevante)
  if (topRising && topRising.deltaPct >= 15) {
    out.push({
      severity: 'warn', icon: 'arrow_upward',
      title: `Tu gasto en ${topRising.name} subió`,
      body: `Aumentó ${topRising.deltaPct.toFixed(0)}% (${fmt(topRising.deltaAbs)} más que el mes pasado). Revisa si fue puntual o una nueva tendencia.`,
    });
  }

  // 3 · Concentración de gasto
  if (concentration && concentration.pct >= 50) {
    out.push({
      severity: 'info', icon: 'pie_chart',
      title: 'Tu gasto está concentrado',
      body: `El ${concentration.pct.toFixed(0)}% de tu gasto se va en ${concentration.name}. Tener una sola categoría tan dominante te deja poco margen.`,
    });
  }

  // 4 · Carga de deuda (DTI) + tendencia
  if (dti >= 0.36) {
    out.push({
      severity: 'warn', icon: 'account_balance',
      title: 'Tu carga de deuda es alta',
      body: `Tus cuotas de deuda equivalen al ${(dti * 100).toFixed(0)}% de tu ingreso. Por encima del 36% conviene priorizar pagarla.`,
    });
  }
  if (trendDirection === 'up') {
    out.push({
      severity: 'info', icon: 'show_chart',
      title: 'Tu gasto viene subiendo',
      body: 'En los últimos meses tu gasto muestra tendencia al alza. Vigila que no supere tus ingresos.',
    });
  } else if (trendDirection === 'down') {
    out.push({
      severity: 'good', icon: 'show_chart',
      title: 'Tu gasto viene bajando',
      body: 'Buen control: tu gasto muestra tendencia a la baja en los últimos meses.',
    });
  }

  // Si por alguna razón no se generó nada accionable, un mensaje neutro.
  if (out.length === 0) {
    out.push({
      severity: 'info', icon: 'check_circle',
      title: 'Todo en orden',
      body: 'No detectamos focos de atención este periodo. Sigue así.',
    });
  }

  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
