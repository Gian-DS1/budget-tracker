// FinTrack — Catálogo de tarjetas de crédito predefinidas (RD)
// Reglas de cashback como % plano por categoría (sin topes, por decisión de producto).

// Categorías de ecosistema: se crean BAJO DEMANDA al agregar una tarjeta que las
// usa. Cada definición es suficiente para sembrar la categoría del usuario.
export const CATALOG_CATEGORIES = {
  'bravo': {
    slug: 'eco-bravo', name: 'Bravo', type: 'variable_expense', icon: '🛒', color: '#e3000f',
    keywords: ['bravo', 'supermercados bravo', 'bravova', 'smartfit', 'smart fit', 'sweet frog', 'arca petshop', 'dr noe'],
  },
  'sirena': {
    slug: 'eco-sirena', name: 'Sirena', type: 'variable_expense', icon: '🛒', color: '#0aa3a3',
    keywords: ['sirena', 'la sirena', 'sirena market'],
  },
  'grupo-ccn': {
    slug: 'eco-grupo-ccn', name: 'Grupo CCN', type: 'variable_expense', icon: '🛒', color: '#004b87',
    keywords: ['nacional', 'supermercados nacional', 'jumbo', 'jumbo express', 'casa cuesta', 'ferreteria cuesta', 'jugueton', 'cuesta libros', 'bebe mundo', 'bebemundo', 'la bodega', 'merca jumbo'],
  },
};

// categoryKey de catálogo -> categoría POR DEFECTO del usuario (slug + nombre/tipo
// para resolver). Los slugs deben coincidir con los de src/data/defaultCategories.js.
export const DEFAULT_CATEGORY_KEYS = {
  'supermercado':    { slug: 'supermercado',    name: 'Supermercado',            type: 'variable_expense' },
  'combustible':     { slug: 'combustible',     name: 'Combustible',             type: 'variable_expense' },
  'restaurantes':    { slug: 'restaurantes',    name: 'Restaurantes y Delivery', type: 'variable_expense' },
  'farmacia':        { slug: 'farmacia',        name: 'Farmacia y Medicamentos', type: 'variable_expense' },
  'streaming':       { slug: 'suscripciones',   name: 'Suscripciones Digitales', type: 'fixed_expense' },
  'internet':        { slug: 'internet',        name: 'Internet',                type: 'fixed_expense' },
  'telefono':        { slug: 'telefono',        name: 'Teléfono',                type: 'fixed_expense' },
  'mascotas':        { slug: 'mascotas',        name: 'Mascotas',                type: 'variable_expense' },
  'transporte':      { slug: 'transporte',      name: 'Taxi y Transporte',       type: 'variable_expense' },
  'educacion':       { slug: 'educacion',       name: 'Educación',               type: 'variable_expense' },
  'amazon':          { slug: 'amazon',          name: 'Amazon',                  type: 'variable_expense' },
  'entretenimiento': { slug: 'entretenimiento', name: 'Entretenimiento',         type: 'variable_expense' },
  'hogar':           { slug: 'hogar',           name: 'Hogar',                   type: 'variable_expense' },
};

// NOTA SOBRE LAS TASAS: muchas tarjetas reales tienen topes mensuales, mínimos de
// consumo, reglas por día de semana o topes en USD que el motor de cashback NO
// modela (solo % plano por categoría y niveles tipo CCN). Aquí cada tarjeta usa
// su MEJOR tasa por categoría como aproximación, y esos topes/mínimos/días se
// documentan en `note` para que el usuario los conozca. El cashback mostrado es
// una estimación optimista (sin tope), no el valor exacto que pagará el banco.
export const CREDIT_CARD_CATALOG = [
  // ── Banco Popular Dominicano ─────────────────────────────────
  { id: 'popular-visa-isi', bank: 'Banco Popular Dominicano', name: 'Visa ISI', color: '#e30613',
    note: '5% en súper (mín. RD$2,500/mes) y combustible (mín. RD$1,500/mes), tope RD$2,000/mes c/u. 2% online internacional (→ Amazon). 1% en el resto.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 5 },
      { categoryKey: 'combustible', percentage: 5 },
      { categoryKey: 'amazon', percentage: 2 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-infinia', bank: 'Banco Popular Dominicano', name: 'Mastercard Infinia', color: '#e30613',
    note: '10% en categorías rotativas comunicadas cada trimestre (ajústala al trimestre vigente; aquí mapeada a Supermercado). 2% en telecomunicaciones (→ Internet/Teléfono). 1% en el resto.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 10 },
      { categoryKey: 'internet', percentage: 2 },
      { categoryKey: 'telefono', percentage: 2 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-gnial', bank: 'Banco Popular Dominicano', name: 'Mastercard Gnial', color: '#e30613',
    note: '5% en comida rápida (→ Restaurantes), juegos/streaming/cines (→ Entretenimiento y Suscripciones) y veterinarias (→ Mascotas). Tope RD$1,000/mes por categoría. Solo aplica a streamings listados (Netflix, Spotify, etc.). Devolución extra RD$300/mes por pago puntual con facturación ≥ RD$25,000.',
    cashback: [
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'entretenimiento', percentage: 5 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'mascotas', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-plus-ccn', bank: 'Banco Popular Dominicano', name: 'Mastercard Plus CCN', color: '#e30613',
    note: 'Devolución escalonada por consumo mensual acumulado en el Grupo CCN: 5% hasta RD$7,999, 6% de RD$8,000 a RD$19,999, 8% desde RD$20,000. Sin tope mensual.',
    cashback: [
      { categoryKey: 'grupo-ccn', tiers: [
        { upTo: 7999, pct: 5 },
        { upTo: 19999, pct: 6 },
        { upTo: Infinity, pct: 8 },
      ] },
    ] },

  // ── Banco BHD ────────────────────────────────────────────────
  { id: 'bhd-visa-premia', bank: 'Banco BHD', name: 'Visa Premia', color: '#003f87',
    note: '5% en súper (mín. RD$2,500, tope RD$3,000/mes), telecom (mín. RD$2,000, tope RD$2,500/mes), streaming (mín. US$10, tope US$35/mes) y veterinarias (mín. RD$1,500, tope RD$2,500/mes).',
    cashback: [
      { categoryKey: 'supermercado', percentage: 5 },
      { categoryKey: 'internet', percentage: 5 },
      { categoryKey: 'telefono', percentage: 5 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'mascotas', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'bhd-visa-mipais', bank: 'Banco BHD', name: 'Visa Mi País', color: '#003f87',
    note: '5% en consumos diarios: farmacias, restaurantes y fast food (tope RD$1,000/mes, mín. RD$1,000). 6% en Tiendas Corripio y 8% en Listo Ferretería (ambos → Hogar; incluyen descuento en caja + devolución al corte, tope RD$1,000/mes c/u).',
    cashback: [
      { categoryKey: 'farmacia', percentage: 5 },
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'hogar', percentage: 8 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Scotiabank ───────────────────────────────────────────────
  { id: 'scotia-bravo-visa', bank: 'Scotiabank', name: 'Bravo Visa', color: '#e2231a',
    note: '8% de ahorro en el ecosistema Bravo (7% devolución + 1% en puntos Club Bravísimo), tope RD$11,000/mes. 5% en streaming y transporte (Uber, Netflix, Spotify, Disney+, Google, iTunes, App Store), tope RD$1,000/mes.',
    cashback: [
      { categoryKey: 'bravo', percentage: 8 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'transporte', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banco Santa Cruz ─────────────────────────────────────────
  { id: 'santacruz-visa-bravo', bank: 'Banco Santa Cruz', name: 'Visa Bravo', color: '#f58220',
    note: '7% en el ecosistema Bravo (tope RD$10,500/mes). 5% en streaming y taxi (Uber, Netflix, Spotify, etc.; tope combinado RD$1,500/mes) y 5% en Amazon (tope US$50/mes). 1% en el resto (tope RD$1,500/mes).',
    cashback: [
      { categoryKey: 'bravo', percentage: 7 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'transporte', percentage: 5 },
      { categoryKey: 'amazon', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Qik Banco Digital ────────────────────────────────────────
  { id: 'qik-credito-basica', bank: 'Qik Banco Digital', name: 'Mastercard Qik Básica', color: '#7b2ff7',
    note: '1% de cashback en todas las categorías.',
    cashback: [
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'qik-pro', bank: 'Qik Banco Digital', name: 'Mastercard Qik', color: '#7b2ff7',
    note: 'Hasta 5% en categorías personalizables (ej. 3% restaurantes + 2% súper). Aquí precargado 5% en Restaurantes — edítalo a tu mezcla. 1% en el resto.',
    cashback: [
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── APAP ─────────────────────────────────────────────────────
  { id: 'apap-visa-familiar', bank: 'APAP', name: 'Visa Familiar', color: '#00833e',
    note: '5% en súper (mín. RD$2,500; tope RD$2,000/día, RD$3,000/mes). 3% en combustible (solo viernes), farmacias, lavanderías y educación (mín. RD$5,000; → Hogar/Educación). Topes diarios y mensuales por categoría.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 5 },
      { categoryKey: 'combustible', percentage: 3 },
      { categoryKey: 'farmacia', percentage: 3 },
      { categoryKey: 'educacion', percentage: 3 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'apap-visa-sirena', bank: 'APAP', name: 'Visa Sirena', color: '#00833e',
    note: '8% de ahorro en Sirena (7% cashback + 1% puntos Club Siremás; tope RD$10,000/mes). 7% en Lavanderías Pressto. Plan complementario hasta 5% (Digital/Estilo/Hogar): 2% en streaming/belleza/telecom + 1% en delivery/combustible/online. Tope plan RD$3,000/mes.',
    cashback: [
      { categoryKey: 'sirena', percentage: 8 },
      { categoryKey: 'streaming', percentage: 2 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banreservas ──────────────────────────────────────────────
  { id: 'banreservas-visa-ser', bank: 'Banreservas', name: 'Visa SER', color: '#0067b1',
    note: '3% en farmacias (lun/mié), súper (mar/jue), gasolineras (vie) y salud — topes RD$1,000–1,500/mes. 4% en educación, 5% en transporte/servicios/entretenimiento (tope RD$1,000/mes c/u). Aquí se usa la mejor tasa de cada categoría (sin restricción de día).',
    cashback: [
      { categoryKey: 'transporte', percentage: 5 },
      { categoryKey: 'entretenimiento', percentage: 5 },
      { categoryKey: 'educacion', percentage: 4 },
      { categoryKey: 'farmacia', percentage: 3 },
      { categoryKey: 'supermercado', percentage: 3 },
      { categoryKey: 'combustible', percentage: 3 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banco BDI ────────────────────────────────────────────────
  { id: 'bdi-visa-clasica', bank: 'Banco BDI', name: 'Visa Clásica', color: '#1a3c70',
    note: '15-20% en comercios y días específicos: lun Zara/Anthony\'s/Services Travel; mar salones/barberías; mié couriers/El Catador; jue-dom City Market, Vitasalud (15%) y Ruta Gastronómica (20%). Aquí se aproxima 15% en súper (City Market) y restaurantes (Ruta Gastronómica); el resto requiere comercio/día específico.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 15 },
      { categoryKey: 'restaurantes', percentage: 20 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banesco ──────────────────────────────────────────────────
  { id: 'banesco-supercashback', bank: 'Banesco', name: 'SuperCashback', color: '#1aa64b',
    note: '7% fijo en categorías seleccionadas: súper y liquor stores (tope RD$5,000/mes), salones/barberías (RD$1,000/mes), servicios de agua y luz (RD$2,000/mes → Hogar) y comida rápida (RD$500/mes → Restaurantes). Acreditado al corte; la tarjeta debe estar al día.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 7 },
      { categoryKey: 'restaurantes', percentage: 7 },
      { categoryKey: 'entretenimiento', percentage: 7 },
      { categoryKey: 'hogar', percentage: 7 },
      { categoryKey: 'all', percentage: 1 },
    ] },
];

// ── Helpers de navegación ──────────────────────────────────────
export function getCatalogBanks() {
  const seen = [];
  for (const c of CREDIT_CARD_CATALOG) if (!seen.includes(c.bank)) seen.push(c.bank);
  return seen;
}

export function getCatalogCardsByBank(bank) {
  return CREDIT_CARD_CATALOG.filter((c) => c.bank === bank);
}

export function getCatalogCard(catalogId) {
  return CREDIT_CARD_CATALOG.find((c) => c.id === catalogId) || null;
}

// Quita acentos y normaliza a minúsculas (mismo criterio que defaultCategories).
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * Traduce las reglas de cashback de un template del catálogo a reglas guardables
 * [{categoryId, percentage}] usando los UUIDs de las categorías del usuario.
 *
 * @param {object} template        Entrada de CREDIT_CARD_CATALOG.
 * @param {Array}  userCategories  Categorías del usuario [{id, name, type, slug?}].
 * @param {(def) => Promise<string|null>} ensureCategory  Crea (si falta) una categoría
 *        de ecosistema a partir de su definición (CATALOG_CATEGORIES[key]) y devuelve su id.
 * @returns {Promise<Array<{categoryId:string, percentage:number}>>}
 */
export async function resolveCardCashback(template, userCategories, ensureCategory) {
  const cats = Array.isArray(userCategories) ? userCategories : [];
  const findCat = (def) =>
    (def.slug && cats.find((c) => c.slug === def.slug)) ||
    cats.find((c) => normalize(c.name) === normalize(def.name) && c.type === def.type) ||
    null;

  const rules = [];
  for (const rule of template?.cashback || []) {
    const key = rule.categoryKey;
    const pct = Number(rule.percentage);
    const tiers = Array.isArray(rule.tiers) ? rule.tiers : null;
    // Construye la regla resuelta preservando los tiers (escalonada) o el % plano.
    const build = (categoryId) => (tiers ? { categoryId, tiers } : { categoryId, percentage: pct });

    if (key === 'all') {
      rules.push({ categoryId: 'all', percentage: pct }); // 'all' nunca es escalonada
      continue;
    }

    const ecoDef = CATALOG_CATEGORIES[key];
    if (ecoDef) {
      const existing = findCat(ecoDef);
      const id = existing ? existing.id : await ensureCategory(ecoDef);
      if (id) rules.push(build(id));
      continue;
    }

    const def = DEFAULT_CATEGORY_KEYS[key];
    if (def) {
      const match = findCat(def);
      if (match) rules.push(build(match.id));
      // sin match (categoría borrada) → se omite la regla.
      continue;
    }
    // key inválida → ignorada (el test de integridad evita que ocurra).
  }
  return rules;
}
