import pdf from 'pdf-parse';

const BANK_SIGNATURES = {
  popular: ['MC CCN PLUS', 'OFICINA DOWNTOWN CENTER', 'Millas Popular'],
  qik: ['Qik Banco Digital', 'qik.com.do'],
};

function detectBank(text) {
  const lowerText = text.toLowerCase();
  for (const [bank, sigs] of Object.entries(BANK_SIGNATURES)) {
    if (sigs.some(sig => lowerText.includes(sig.toLowerCase()))) {
      return bank;
    }
  }
  return null;
}

function parsePopular(text) {
  const POPULAR_HEADER_RE = /\*{4}-\*{4}-\*{4}-(\d{4})\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+[\d,]+\.\d{2}/;
  const POPULAR_TX_RE = /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(\d{7,})\s+(.+?)\s+(-?[\d,]+\.\d{2})$/;
  const POPULAR_MCC_RE = /^\d{4}\s+\d{6}$/;

  const SKIP_PATTERNS = [
    'Puede recibir su próximo', 'Tu cuenta de Millas', 'Tasa de Interés Anual',
    'Saldo Promedio Diario', 'Interés si Opta', 'Interés por Financiamiento',
    'GIANCARLOS ESTEVEZ', 'EL OFICIAL QUE MANEJA', 'EN LA OFICINA', 'Página:',
    'giancarlos.estevez', 'Tel:',
  ];

  const headerMatch = text.match(POPULAR_HEADER_RE);
  if (!headerMatch) return [];

  const cardLast4 = headerMatch[1];
  const corteStr = headerMatch[2];
  const [cDay, cMonth, cYear] = corteStr.split('/');
  const corteDate = new Date(`${cYear}-${cMonth}-${cDay}T00:00:00`);

  const inferYear = (ddMm) => {
    const [d, m] = ddMm.split('/');
    let year = corteDate.getFullYear();
    const month = parseInt(m, 10);
    const corteMonth = corteDate.getMonth() + 1;
    if (month > corteMonth + 1) {
      year -= 1;
    }
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const transactions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SKIP_PATTERNS.some(skip => line.includes(skip))) continue;
    if (POPULAR_HEADER_RE.test(line)) continue;
    if (/^\d+\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}$/.test(line)) continue;
    if (POPULAR_MCC_RE.test(line)) continue;

    const match = line.match(POPULAR_TX_RE);
    if (!match) continue;

    const postDate = inferYear(match[1]);
    const txDate = inferYear(match[2]);
    let descCity = match[4].trim();
    const amountStr = match[5].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    const isCredit = amount < 0;

    let city = '';
    for (const cn of ['SANTO DOMINGO', 'DISTRITO NACI', 'SANTIAGO', 'VILLA ALTAGRA']) {
      if (descCity.includes(cn)) {
        const idx = descCity.indexOf(cn);
        city = descCity.substring(idx).trim();
        descCity = descCity.substring(0, idx).trim();
        break;
      }
    }

    let mcc = '';
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (POPULAR_MCC_RE.test(nextLine)) {
        mcc = nextLine.split(/\s+/)[0];
        i++; // consume mcc line
      }
    }

    transactions.push({
      bank: 'popular',
      cardLast4,
      postDate,
      txDate,
      description: descCity,
      city,
      amount: Math.abs(amount),
      isCredit,
      rawLine: line,
      mcc
    });
  }

  return transactions;
}

function parseQik(text) {
  const cardMatch = text.match(/\*{12}(\d{4})/);
  const cardLast4 = cardMatch ? cardMatch[1] : '0000';

  const QIK_TX_RE = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+RD\$\s+([\d,]+\.\d{2})$/;
  const QIK_CREDIT_PATTERNS = ['Payment Return/prepaid', 'Recompensas Qik Rebate', 'Pago A Tarjeta', 'Pago a Tarjeta'];
  const QIK_SKIP_PATTERNS = [
    'Hola,', 'Período:', 'Fecha de corte', 'Límite Aprobado', 'Este es tu estado',
    'Número de tarjeta', 'Balance al corte', 'Monto mínimo', 'Fecha Límite', 'Evita cargos',
    'Resumen de lo que', 'Compras y retiros', 'El valor del cashback', 'Fecha Entrada Descripción Monto',
    'Información Adicional', 'Balance promedio', 'Interés si opta', 'Monto de cuotas', 'Balance de capital',
    'Intereses por financiamiento', 'Tu tasa de interés', 'Si tienes inconvenientes', 'Emitido Por',
    'Qik Banco Digital', 'www.qik.com.do', 'Av. John F. Kennedy', 'Pág ', '************'
  ];

  const transactions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if (QIK_SKIP_PATTERNS.some(skip => line.includes(skip))) continue;

    const match = line.match(QIK_TX_RE);
    if (!match) continue;

    const d1 = match[1];
    const d2 = match[2];
    const description = match[3].trim();
    const amountStr = match[4].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    const isCredit = QIK_CREDIT_PATTERNS.some(p => description.toLowerCase().includes(p.toLowerCase()));

    const parseDate = (ddMmYyyy) => {
      const [d, m, y] = ddMmYyyy.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };

    let city = '';
    let descriptionClean = description;
    const suffixes = ['Santo Domingododom', 'Santodomingo Sddom', 'Distrito Nacisddom', 'Distrito Nac Dodom', 'Cupertino Causa', 'Amsterdam Nhnld', 'Los Gatos Causa', 'Modom'];
    
    for (const suffix of suffixes) {
      if (description.toLowerCase().includes(suffix.toLowerCase())) {
        const idx = description.toLowerCase().indexOf(suffix.toLowerCase());
        city = description.substring(idx).trim();
        descriptionClean = description.substring(0, idx).trim();
        break;
      }
    }

    transactions.push({
      bank: 'qik',
      cardLast4,
      postDate: parseDate(d2),
      txDate: parseDate(d1),
      description: descriptionClean,
      city,
      amount: Math.abs(amount),
      isCredit,
      rawLine: line,
      mcc: ''
    });
  }

  return transactions;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 in body' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdf(pdfBuffer);
    const fullText = data.text;

    const bank = detectBank(fullText);
    if (!bank) {
      return res.status(400).json({ error: 'No se pudo detectar el banco soportado (Popular, Qik).' });
    }

    let allTransactions = [];
    if (bank === 'popular') {
      allTransactions = parsePopular(fullText);
    } else if (bank === 'qik') {
      allTransactions = parseQik(fullText);
    }

    // Filtrar para mantener solo consumos (ignorar isCredit)
    const consumos = allTransactions.filter(t => !t.isCredit);

    res.status(200).json({
      bank,
      count: consumos.length,
      transactions: consumos,
      cardLast4: consumos.length > 0 ? consumos[0].cardLast4 : '0000'
    });

  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: 'Error interno al parsear el PDF: ' + error.message });
  }
}
