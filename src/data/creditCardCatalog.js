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
    keywords: ['nacional', 'supermercados nacional', 'jumbo', 'jumbo express', 'casa cuesta', 'jugueton', 'ferreteria cuesta', 'cuesta libros', 'bebemundo', 'la bodega', 'merca jumbo'],
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

export const CREDIT_CARD_CATALOG = [
  // ── Banco Popular Dominicano ─────────────────────────────────
  { id: 'popular-visa-isi', bank: 'Banco Popular Dominicano', name: 'Visa ISI', color: '#e30613',
    cashback: [
      { categoryKey: 'supermercado', percentage: 5 },
      { categoryKey: 'combustible', percentage: 5 },
      { categoryKey: 'amazon', percentage: 2 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-infinia', bank: 'Banco Popular Dominicano', name: 'Mastercard Infinia', color: '#e30613',
    note: 'La categoría del 10% es rotativa cada trimestre — ajústala al trimestre vigente.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 10 },
      { categoryKey: 'internet', percentage: 2 },
      { categoryKey: 'telefono', percentage: 2 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-gnial', bank: 'Banco Popular Dominicano', name: 'Mastercard Gnial', color: '#e30613',
    cashback: [
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'entretenimiento', percentage: 5 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'popular-mc-plus-ccn', bank: 'Banco Popular Dominicano', name: 'Mastercard Plus CCN', color: '#e30613',
    note: 'Devolución escalonada por monto del consumo en el Grupo CCN: 5% hasta RD$7,999, 6% de RD$8,000 a RD$19,999, 8% desde RD$20,000. Sin tope mensual.',
    cashback: [
      { categoryKey: 'grupo-ccn', percentage: 5 },
    ] },

  // ── Banco BHD ────────────────────────────────────────────────
  { id: 'bhd-visa-premia', bank: 'Banco BHD', name: 'Visa Premia', color: '#003f87',
    cashback: [
      { categoryKey: 'supermercado', percentage: 5 },
      { categoryKey: 'internet', percentage: 5 },
      { categoryKey: 'telefono', percentage: 5 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'mascotas', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'bhd-visa-mipais', bank: 'Banco BHD', name: 'Visa Mi País', color: '#003f87',
    note: '6% en Tiendas Corripio (mapeado a Hogar).',
    cashback: [
      { categoryKey: 'farmacia', percentage: 5 },
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'hogar', percentage: 6 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Scotiabank ───────────────────────────────────────────────
  { id: 'scotia-visa-bravo', bank: 'Scotiabank', name: 'Visa Bravo', color: '#e2231a',
    cashback: [
      { categoryKey: 'bravo', percentage: 7 },
      { categoryKey: 'streaming', percentage: 5 },
      { categoryKey: 'transporte', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banco Santa Cruz ─────────────────────────────────────────
  { id: 'santacruz-visa-bravo', bank: 'Banco Santa Cruz', name: 'Visa Bravo', color: '#f58220',
    cashback: [
      { categoryKey: 'bravo', percentage: 7 },
      { categoryKey: 'amazon', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Qik Banco Digital ────────────────────────────────────────
  { id: 'qik-credito-basica', bank: 'Qik Banco Digital', name: 'Qik Crédito Básica', color: '#7b2ff7',
    cashback: [
      { categoryKey: 'all', percentage: 1 },
    ] },
  { id: 'qik-pro', bank: 'Qik Banco Digital', name: 'Qik Pro', color: '#7b2ff7',
    note: '5% en una categoría personalizable (excluye súper y combustible) — elige la tuya.',
    cashback: [
      { categoryKey: 'restaurantes', percentage: 5 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── APAP ─────────────────────────────────────────────────────
  { id: 'apap-visa-familiar', bank: 'APAP', name: 'Visa Familiar', color: '#00833e',
    cashback: [
      { categoryKey: 'supermercado', percentage: 10 },
      { categoryKey: 'combustible', percentage: 5 },
      { categoryKey: 'farmacia', percentage: 5 },
      { categoryKey: 'educacion', percentage: 4 },
    ] },
  { id: 'apap-visa-sirena', bank: 'APAP', name: 'Visa Sirena', color: '#00833e',
    note: 'Incluye un plan complementario personalizable (Digital, Estilo u Hogar).',
    cashback: [
      { categoryKey: 'sirena', percentage: 8 },
      { categoryKey: 'all', percentage: 1 },
    ] },

  // ── Banreservas ──────────────────────────────────────────────
  { id: 'banreservas-visa-ser', bank: 'Banreservas', name: 'Visa SER', color: '#0067b1',
    note: 'Tasas variables no publicadas por el banco — ajústalas según tu tarifario.',
    cashback: [
      { categoryKey: 'supermercado', percentage: 1 },
      { categoryKey: 'farmacia', percentage: 1 },
      { categoryKey: 'combustible', percentage: 1 },
      { categoryKey: 'educacion', percentage: 1 },
      { categoryKey: 'transporte', percentage: 1 },
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

    if (key === 'all') {
      rules.push({ categoryId: 'all', percentage: pct });
      continue;
    }

    const ecoDef = CATALOG_CATEGORIES[key];
    if (ecoDef) {
      const existing = findCat(ecoDef);
      const id = existing ? existing.id : await ensureCategory(ecoDef);
      if (id) rules.push({ categoryId: id, percentage: pct });
      continue;
    }

    const def = DEFAULT_CATEGORY_KEYS[key];
    if (def) {
      const match = findCat(def);
      if (match) rules.push({ categoryId: match.id, percentage: pct });
      // sin match (categoría borrada) → se omite la regla.
      continue;
    }
    // key inválida → ignorada (el test de integridad evita que ocurra).
  }
  return rules;
}
