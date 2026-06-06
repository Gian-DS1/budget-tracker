/**
 * statementMatcher.js
 * 
 * Utilidad para cruzar transacciones obtenidas de un estado de cuenta (PDF)
 * con las transacciones ya existentes en el sistema.
 */

// Retorna la diferencia en días entre dos fechas 'YYYY-MM-DD'
function dateDiffDays(d1, d2) {
  const dt1 = new Date(`${d1}T00:00:00`);
  const dt2 = new Date(`${d2}T00:00:00`);
  return Math.abs((dt1 - dt2) / (1000 * 60 * 60 * 24));
}

// Retorna la diferencia absoluta en montos
function amountDiff(a1, a2) {
  return Math.abs(a1 - a2);
}

// Calcula un "score" de similitud para priorizar matches (1.0 = perfecto)
function calculateScore(pdfTx, existingTx) {
  let score = 1.0;
  
  const dDiff = dateDiffDays(pdfTx.txDate, existingTx.date);
  score -= (dDiff * 0.1); // Penaliza 0.1 por cada día de diferencia
  
  const aDiff = amountDiff(pdfTx.amount, existingTx.amount);
  if (aDiff > 0 && aDiff <= 0.50) {
    score -= 0.1;
  }
  
  const pdfDesc = (pdfTx.description || '').toLowerCase();
  const exDesc = (existingTx.description || '').toLowerCase();
  
  // Bonus si la descripción de FinTrack se parece a la del banco
  if (pdfDesc.includes(exDesc) || exDesc.includes(pdfDesc)) {
    score += 0.2;
  }
  
  return score;
}

/**
 * Cruza las transacciones del PDF contra las de FinTrack.
 * @param {Array} pdfTransactions - Transacciones devueltas por la API (parse-pdf)
 * @param {Array} existingTransactions - Transacciones de useTransactionStore
 * @returns {Object} { matched, ambiguous, toImport }
 */
export function matchTransactions(pdfTransactions, existingTransactions) {
  const DATE_TOLERANCE = 3; // +/- 3 días
  const AMOUNT_TOLERANCE = 0.50; // +/- RD$ 0.50
  
  // Solo consideramos gastos (type === 'expense') que NO tengan tarjeta asignada
  // Si ya tienen tarjeta asignada, no necesitamos cruzarlos (ya se pagaron/importaron)
  const candidates = existingTransactions.filter(t => t.type === 'expense' && !t.cardId);
  
  const matched = [];
  const ambiguous = [];
  const toImport = [];
  
  // Para llevar un registro de qué transacciones existentes ya se cruzaron
  const usedExistingIds = new Set();
  
  for (const pdfTx of pdfTransactions) {
    // Buscar candidatos
    const possibleMatches = [];
    
    for (const ex of candidates) {
      if (usedExistingIds.has(ex.id)) continue;
      
      const aDiff = amountDiff(pdfTx.amount, ex.amount);
      if (aDiff <= AMOUNT_TOLERANCE) {
        const dDiff = dateDiffDays(pdfTx.txDate, ex.date);
        if (dDiff <= DATE_TOLERANCE) {
          possibleMatches.push({
            existingTx: ex,
            score: calculateScore(pdfTx, ex)
          });
        }
      }
    }
    
    // Ordenar por score de mayor a menor
    possibleMatches.sort((a, b) => b.score - a.score);
    
    if (possibleMatches.length === 0) {
      toImport.push(pdfTx);
    } else if (possibleMatches.length === 1) {
      // Un match claro
      const match = possibleMatches[0].existingTx;
      matched.push({ pdfTx, existingTx: match, score: possibleMatches[0].score });
      usedExistingIds.add(match.id);
    } else {
      // Múltiples candidatos. Si el primero es MUY superior al segundo, tomamos el primero.
      // Si están muy cerca (ej. mismo día mismo monto, diferencias mínimas), es ambiguo.
      const topScore = possibleMatches[0].score;
      const secondScore = possibleMatches[1].score;
      
      if (topScore - secondScore >= 0.2) {
        // Claro ganador
        const match = possibleMatches[0].existingTx;
        matched.push({ pdfTx, existingTx: match, score: topScore });
        usedExistingIds.add(match.id);
      } else {
        ambiguous.push({ pdfTx, candidates: possibleMatches.map(m => m.existingTx) });
      }
    }
  }
  
  return { matched, ambiguous, toImport };
}
