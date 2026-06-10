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
import { tr } from '../../../i18n/runtime';

const fmt = (n) => formatCurrency(n);
const ORDER = { alert: 0, warn: 1, good: 2, info: 3 };

export function getAnalysis(input) {
  if (!input || !input.hasData) {
    return [{
      severity: 'info', icon: 'analytics',
      title: tr('screens.analysis.notEnoughTitle'),
      body: tr('screens.analysis.notEnoughBody'),
    }];
  }

  const { savingsRate, topRising, concentration, trendDirection, dti } = input;
  const out = [];

  // 1 · Tasa de ahorro
  if (savingsRate < 0) {
    out.push({
      severity: 'alert', icon: 'trending_down',
      title: tr('screens.analysis.overspendTitle'),
      body: tr('screens.analysis.overspendBody'),
    });
  } else if (savingsRate >= 0.2) {
    out.push({
      severity: 'good', icon: 'savings',
      title: tr('screens.analysis.goodSavingsTitle').replace('{pct}', (savingsRate * 100).toFixed(0)),
      body: tr('screens.analysis.goodSavingsBody'),
    });
  } else {
    out.push({
      severity: 'warn', icon: 'savings',
      title: tr('screens.analysis.lowSavingsTitle').replace('{pct}', (savingsRate * 100).toFixed(0)),
      body: tr('screens.analysis.lowSavingsBody'),
    });
  }

  // 2 · Categoría que más subió (solo si la subida es relevante)
  if (topRising && topRising.deltaPct >= 15) {
    out.push({
      severity: 'warn', icon: 'arrow_upward',
      title: tr('screens.analysis.risingTitle').replace('{name}', topRising.name),
      body: tr('screens.analysis.risingBody').replace('{pct}', topRising.deltaPct.toFixed(0)).replace('{amt}', fmt(topRising.deltaAbs)),
    });
  }

  // 3 · Concentración de gasto
  if (concentration && concentration.pct >= 50) {
    out.push({
      severity: 'info', icon: 'pie_chart',
      title: tr('screens.analysis.concentrationTitle'),
      body: tr('screens.analysis.concentrationBody').replace('{pct}', concentration.pct.toFixed(0)).replace('{name}', concentration.name),
    });
  }

  // 4 · Carga de deuda (DTI) + tendencia
  if (dti >= 0.36) {
    out.push({
      severity: 'warn', icon: 'account_balance',
      title: tr('screens.analysis.dtiTitle'),
      body: tr('screens.analysis.dtiBody').replace('{pct}', (dti * 100).toFixed(0)),
    });
  }
  if (trendDirection === 'up') {
    out.push({
      severity: 'info', icon: 'show_chart',
      title: tr('screens.analysis.trendUpTitle'),
      body: tr('screens.analysis.trendUpBody'),
    });
  } else if (trendDirection === 'down') {
    out.push({
      severity: 'good', icon: 'show_chart',
      title: tr('screens.analysis.trendDownTitle'),
      body: tr('screens.analysis.trendDownBody'),
    });
  }

  // Si por alguna razón no se generó nada accionable, un mensaje neutro.
  if (out.length === 0) {
    out.push({
      severity: 'info', icon: 'check_circle',
      title: tr('screens.analysis.allGoodTitle'),
      body: tr('screens.analysis.allGoodBody'),
    });
  }

  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
