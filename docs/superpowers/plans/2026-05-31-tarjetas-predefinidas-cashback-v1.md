# Tarjetas predefinidas con cashback automático — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear tarjetas de crédito desde un catálogo predefinido (banco y nombre fijos, solo corte/pago editables) con reglas de cashback cargadas automáticamente, conservando el flujo personalizado y permitiendo personalizar las predefinidas.

**Architecture:** Catálogo estático (`creditCardCatalog.js`) con reglas expresadas como `categoryKey → %`. Un resolvedor puro traduce esas llaves a `[{categoryId, percentage}]` contra las categorías del usuario, creando las 4 categorías de ecosistema (Bravo, Sirena, Plaza Lama, Grupo CCN) **bajo demanda**. `computeCashback` y el esquema de `cashback_rules` no cambian; solo se agrega la columna `catalog_id`.

**Tech Stack:** React 19 + Vite, Zustand (+persist), Supabase, Vitest, lucide-react.

---

## Notas para quien implementa

- **TDD donde aplica:** las piezas puras (catálogo + resolvedor + categorías) se hacen con
  Vitest primero. Este repo **no tiene tests de stores ni de UI** (solo `src/utils/*` y
  `src/data/*`). Para stores y página, la verificación es `npm run lint` + `npm run build` +
  prueba manual en `npm run dev`. No inventes un framework de tests de UI.
- **No toques** `computeCashback` ni el cálculo de cashback en `useTransactionStore`.
- Ejecuta los tests de un archivo con: `npx vitest run <ruta>`. Toda la suite: `npm test`.
- Rama de trabajo actual: `feat/tarjetas-predefinidas-cashback`.

---

## Task 1: Catálogo estático de tarjetas

**Files:**
- Create: `src/data/creditCardCatalog.js`
- Test: `src/data/creditCardCatalog.test.js`

- [ ] **Step 1: Escribir el test de integridad del catálogo**

Crear `src/data/creditCardCatalog.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  CREDIT_CARD_CATALOG,
  CATALOG_CATEGORIES,
  DEFAULT_CATEGORY_KEYS,
  getCatalogBanks,
  getCatalogCardsByBank,
  getCatalogCard,
} from './creditCardCatalog';

describe('CREDIT_CARD_CATALOG — integridad', () => {
  it('tiene ids únicos', () => {
    const ids = CREDIT_CARD_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada tarjeta tiene bank, name y al menos una regla', () => {
    for (const card of CREDIT_CARD_CATALOG) {
      expect(card.bank, card.id).toBeTruthy();
      expect(card.name, card.id).toBeTruthy();
      expect(Array.isArray(card.cashback), card.id).toBe(true);
      expect(card.cashback.length, card.id).toBeGreaterThan(0);
    }
  });

  it('cada regla usa una categoryKey válida y un % numérico', () => {
    const valid = new Set([
      'all',
      ...Object.keys(CATALOG_CATEGORIES),
      ...Object.keys(DEFAULT_CATEGORY_KEYS),
    ]);
    for (const card of CREDIT_CARD_CATALOG) {
      for (const r of card.cashback) {
        expect(valid.has(r.categoryKey), `${card.id}:${r.categoryKey}`).toBe(true);
        expect(typeof r.percentage, `${card.id}:${r.categoryKey}`).toBe('number');
      }
    }
  });

  it('helpers de navegación', () => {
    const banks = getCatalogBanks();
    expect(banks).toContain('Banco Popular Dominicano');
    expect(getCatalogCardsByBank('Banco Popular Dominicano').length).toBeGreaterThan(0);
    expect(getCatalogCard('popular-visa-isi')?.name).toBe('Visa ISI');
    expect(getCatalogCard('no-existe')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/data/creditCardCatalog.test.js`
Expected: FAIL — "Failed to resolve import './creditCardCatalog'".

- [ ] **Step 3: Crear el catálogo**

Crear `src/data/creditCardCatalog.js`:

```js
// FinTrack RD — Catálogo de tarjetas de crédito predefinidas (RD)
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
  'plaza-lama': {
    slug: 'eco-plaza-lama', name: 'Plaza Lama', type: 'variable_expense', icon: '🛒', color: '#c8102e',
    keywords: ['plaza lama', 'lama'],
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
  { id: 'popular-visa-plus-ccn', bank: 'Banco Popular Dominicano', name: 'Visa Plus CCN', color: '#e30613',
    note: 'Devolución escalonada (5/6/8%) según el consumo mensual en el Grupo CCN.',
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

  // ── Banco Promerica ──────────────────────────────────────────
  { id: 'promerica-visa-lama', bank: 'Banco Promerica', name: 'Visa Lama Plazos', color: '#ed1c24',
    cashback: [
      { categoryKey: 'plaza-lama', percentage: 9 },
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
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/data/creditCardCatalog.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/creditCardCatalog.js src/data/creditCardCatalog.test.js
git commit -m "feat(tarjetas): catálogo estático de tarjetas predefinidas RD"
```

---

## Task 2: Resolvedor de cashback (catálogo → reglas del usuario)

**Files:**
- Modify: `src/data/creditCardCatalog.js` (agregar `resolveCardCashback`)
- Test: `src/data/creditCardCatalog.test.js` (agregar bloque)

- [ ] **Step 1: Agregar los tests del resolvedor**

Añadir al final de `src/data/creditCardCatalog.test.js` (e importar `resolveCardCashback` en la línea de import existente):

```js
import { resolveCardCashback } from './creditCardCatalog';

describe('resolveCardCashback', () => {
  const userCats = [
    { id: 'u-super', name: 'Supermercado', type: 'variable_expense' },
    { id: 'u-amazon', name: 'Amazon', type: 'variable_expense' },
    { id: 'u-combu', name: 'Combustible', type: 'variable_expense' },
  ];

  it("mantiene 'all' literal", async () => {
    const tpl = { cashback: [{ categoryKey: 'all', percentage: 1 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'all', percentage: 1 }]);
  });

  it('resuelve categoría por defecto por nombre+tipo (usuario sin slugs)', async () => {
    const tpl = { cashback: [{ categoryKey: 'supermercado', percentage: 5 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'u-super', percentage: 5 }]);
  });

  it('resuelve por slug cuando la categoría lo tiene (aunque el nombre difiera)', async () => {
    const cats = [{ id: 'u-1', name: 'Mi Súper', type: 'variable_expense', slug: 'supermercado' }];
    const tpl = { cashback: [{ categoryKey: 'supermercado', percentage: 5 }] };
    const rules = await resolveCardCashback(tpl, cats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'u-1', percentage: 5 }]);
  });

  it('crea la categoría de ecosistema bajo demanda si no existe', async () => {
    const created = [];
    const ensure = async (def) => { created.push(def.name); return 'u-bravo'; };
    const tpl = { cashback: [{ categoryKey: 'bravo', percentage: 7 }] };
    const rules = await resolveCardCashback(tpl, userCats, ensure);
    expect(created).toEqual(['Bravo']);
    expect(rules).toEqual([{ categoryId: 'u-bravo', percentage: 7 }]);
  });

  it('reutiliza la categoría de ecosistema existente (no la recrea)', async () => {
    const cats = [{ id: 'u-bravo', name: 'Bravo', type: 'variable_expense' }];
    let calls = 0;
    const ensure = async () => { calls++; return 'NUEVA'; };
    const tpl = { cashback: [{ categoryKey: 'bravo', percentage: 7 }] };
    const rules = await resolveCardCashback(tpl, cats, ensure);
    expect(calls).toBe(0);
    expect(rules).toEqual([{ categoryId: 'u-bravo', percentage: 7 }]);
  });

  it('omite la regla si la categoría por defecto fue borrada por el usuario', async () => {
    const tpl = { cashback: [{ categoryKey: 'mascotas', percentage: 5 }, { categoryKey: 'all', percentage: 1 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'all', percentage: 1 }]);
  });

  it('Premia: telecom genera dos reglas (internet + teléfono) con el mismo %', async () => {
    const cats = [
      { id: 'u-net', name: 'Internet', type: 'fixed_expense' },
      { id: 'u-tel', name: 'Teléfono', type: 'fixed_expense' },
    ];
    const tpl = getCatalogCard('bhd-visa-premia');
    const rules = await resolveCardCashback(tpl, cats, async () => 'x');
    expect(rules).toContainEqual({ categoryId: 'u-net', percentage: 5 });
    expect(rules).toContainEqual({ categoryId: 'u-tel', percentage: 5 });
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx vitest run src/data/creditCardCatalog.test.js`
Expected: FAIL — `resolveCardCashback is not a function` / import sin export.

- [ ] **Step 3: Implementar `resolveCardCashback`**

Agregar al final de `src/data/creditCardCatalog.js`:

```js
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
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npx vitest run src/data/creditCardCatalog.test.js`
Expected: PASS (todos, incluido el bloque nuevo).

- [ ] **Step 5: Commit**

```bash
git add src/data/creditCardCatalog.js src/data/creditCardCatalog.test.js
git commit -m "feat(tarjetas): resolvedor catálogo→reglas con categorías bajo demanda"
```

---

## Task 3: Slugs estables y limpieza de keywords en categorías por defecto

**Files:**
- Modify: `src/data/defaultCategories.js`
- Test: `src/data/creditCardCatalog.test.js` (test de consistencia catálogo↔defaults)

- [ ] **Step 1: Test de consistencia (catálogo ↔ defaults)**

Agregar a `src/data/creditCardCatalog.test.js` (importar `defaultCategories` arriba):

```js
import { defaultCategories } from './defaultCategories';

describe('DEFAULT_CATEGORY_KEYS ↔ defaultCategories', () => {
  it('cada slug del catálogo existe en defaultCategories con el mismo nombre y tipo', () => {
    for (const [key, def] of Object.entries(DEFAULT_CATEGORY_KEYS)) {
      const match = defaultCategories.find((c) => c.slug === def.slug);
      expect(match, `slug faltante: ${key}/${def.slug}`).toBeTruthy();
      expect(match.name, key).toBe(def.name);
      expect(match.type, key).toBe(def.type);
    }
  });

  it('Supermercado por defecto no conserva keywords de ecosistemas dedicados', () => {
    const sup = defaultCategories.find((c) => c.slug === 'supermercado');
    const banned = ['bravo', 'sirena', 'la sirena', 'plaza lama', 'nacional', 'jumbo'];
    for (const k of banned) expect(sup.keywords, k).not.toContain(k);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx vitest run src/data/creditCardCatalog.test.js`
Expected: FAIL — slugs aún no existen / Supermercado todavía tiene `bravo`, `jumbo`, etc.

- [ ] **Step 3: Agregar slugs y limpiar keywords en `defaultCategories.js`**

En `src/data/defaultCategories.js`, agregar el campo `slug` a estas categorías (junto a su `name`). Valores exactos:

| name | slug |
|---|---|
| Internet | `internet` |
| Teléfono | `telefono` |
| Suscripciones Digitales | `suscripciones` |
| Supermercado | `supermercado` |
| Restaurantes y Delivery | `restaurantes` |
| Combustible | `combustible` |
| Taxi y Transporte | `transporte` |
| Amazon | `amazon` |
| Farmacia y Medicamentos | `farmacia` |
| Mascotas | `mascotas` |
| Educación | `educacion` |
| Entretenimiento | `entretenimiento` |
| Hogar | `hogar` |

Ejemplo (Supermercado) — agregar `slug` **y** reemplazar `keywords` quitando las marcas con categoría dedicada:

```js
  {
    id: generateId(),
    name: 'Supermercado',
    slug: 'supermercado',
    type: 'variable_expense',
    icon: '🛒',
    color: '#ef4444',
    keywords: ['supermercado', 'pricesmart', 'colmado', 'almacen', 'aprovisiones', 'super', 'pola'],
    isActive: true,
  },
```

(Se quitaron de Supermercado: `nacional`, `jumbo`, `bravo`, `sirena`, `la sirena`, `plaza lama`.)

Para las otras 12 categorías solo agregar la línea `slug: '<valor>',` debajo de `name:` (sin tocar sus keywords). Ejemplo:

```js
  {
    id: generateId(),
    name: 'Teléfono',
    slug: 'telefono',
    type: 'fixed_expense',
    ...
  },
```

- [ ] **Step 4: Correr los tests de datos y ver pasar**

Run: `npx vitest run src/data/creditCardCatalog.test.js src/data/defaultCategories.test.js`
Expected: PASS (incluye el bloque de consistencia).

- [ ] **Step 5: Commit**

```bash
git add src/data/defaultCategories.js src/data/creditCardCatalog.test.js
git commit -m "feat(categorias): slugs estables y limpieza de keywords de Supermercado"
```

---

## Task 4: `ensureCategory` en el store de categorías

**Files:**
- Modify: `src/stores/useCategoryStore.js`

> Sin test unitario (el repo no testea stores). Verificación: `npm run lint` + uso manual en Task 7.

- [ ] **Step 1: Agregar la acción `ensureCategory`**

En `src/stores/useCategoryStore.js`, dentro del objeto de acciones (p. ej. justo después de `addCategory`), agregar:

```js
  // Crea (si no existe) una categoría a partir de una definición
  // {slug, name, type, icon, color, keywords} y devuelve su id. Si ya existe (por
  // slug o nombre+tipo) devuelve el id existente sin duplicar. Al crear una
  // categoría de ecosistema, quita sus keywords del Supermercado del usuario para
  // que el auto-categorizador rutee la compra a la categoría dedicada.
  ensureCategory: async (def) => {
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    const found = get().categories.find(
      (c) => (def.slug && c.slug === def.slug) || (norm(c.name) === norm(def.name) && c.type === def.type)
    );
    if (found) return found.id;

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const payload = {
      user_id: user.id,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      slug: def.slug || null,
      keywords: def.keywords || [],
      is_active: true,
      sort_order: get().categories.length,
    };

    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error || !data) {
      console.error('ensureCategory error:', error);
      return null;
    }

    const newCat = { ...data, isActive: data.is_active, sortOrder: data.sort_order };
    set((state) => ({
      categories: [...state.categories, newCat].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })),
    }));

    // Quitar del Supermercado del usuario las keywords que ahora pertenecen a esta
    // categoría dedicada (solo afecta a usuarios cuyo Supermercado aún las tenga).
    const ecoKeys = new Set((def.keywords || []).map(norm));
    const sup = get().categories.find(
      (c) => c.slug === 'supermercado' || (norm(c.name) === 'supermercado' && c.type === 'variable_expense')
    );
    if (sup && Array.isArray(sup.keywords)) {
      const filtered = sup.keywords.filter((k) => !ecoKeys.has(norm(k)));
      if (filtered.length !== sup.keywords.length) {
        await get().updateCategory(sup.id, { keywords: filtered });
      }
    }

    return data.id;
  },
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/stores/useCategoryStore.js
git commit -m "feat(categorias): acción ensureCategory (creación idempotente bajo demanda)"
```

---

## Task 5: Columna `catalog_id` en el store de tarjetas

**Files:**
- Modify: `src/stores/useCreditCardStore.js`

- [ ] **Step 1: Mapear y persistir `catalog_id`**

En `src/stores/useCreditCardStore.js`:

(a) En `mapFromDb`, agregar el campo (después de `cashbackRules`):

```js
  catalogId: c.catalog_id || null,
```

(b) En `addCard`, agregar al objeto `payload` (después de `cashback_rules`):

```js
      catalog_id: card.catalogId || null,
```

(c) En `updateCard`, agregar junto a los demás `if (updates.x !== undefined)`:

```js
        if (updates.catalogId !== undefined) dbUpdates.catalog_id = updates.catalogId || null;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/stores/useCreditCardStore.js
git commit -m "feat(tarjetas): persistir catalog_id (predefinida vs personalizada)"
```

---

## Task 6: Extraer `CashbackRulesEditor`

**Files:**
- Create: `src/components/creditcards/CashbackRulesEditor.jsx`

> Reutilizable en el flujo predefinido y personalizado. Sin test unitario (UI).

- [ ] **Step 1: Crear el componente**

Crear `src/components/creditcards/CashbackRulesEditor.jsx`:

```jsx
import { useState } from 'react';
import { Plus, X } from 'lucide-react';

// Editor de reglas de cashback [{categoryId, percentage}]. `categoryId` puede ser
// 'all' (resto de consumos) o el id de una categoría existente del usuario.
export default function CashbackRulesEditor({ rules, categories, onChange }) {
  const [cat, setCat] = useState('all');
  const [pct, setPct] = useState('');

  const expenseCats = categories.filter(
    (c) => c.type !== 'income' && c.type !== 'savings' && c.isActive
  );

  const addRule = () => {
    if (!pct || isNaN(Number(pct))) return;
    const next = [...(rules || [])];
    const idx = next.findIndex((r) => r.categoryId === cat);
    if (idx >= 0) next[idx] = { ...next[idx], percentage: Number(pct) };
    else next.push({ categoryId: cat, percentage: Number(pct) });
    onChange(next);
    setCat('all');
    setPct('');
  };

  const removeRule = (i) => {
    const next = [...(rules || [])];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <select
          className="flex-1"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
        >
          <option value="all">Todas las categorías de gasto</option>
          <optgroup label="Gastos">
            {expenseCats.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </optgroup>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0" max="100" step="0.1"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="5"
            className="no-spinners text-center"
            style={{ width: '60px', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)' }}
          />
          <span className="text-muted font-medium">%</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={addRule}>
          <Plus size={16} />
        </button>
      </div>

      {rules && rules.length > 0 ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule, idx) => {
            const c = categories.find((x) => x.id === rule.categoryId);
            const label = rule.categoryId === 'all'
              ? 'Todas las categorías'
              : (c ? `${c.icon} ${c.name}` : 'Categoría desconocida');
            return (
              <div key={idx} className="flex items-center justify-between p-2 rounded-md" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-primary)' }}>
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-income)' }}>{rule.percentage}%</span>
                  <button type="button" className="text-danger" onClick={() => removeRule(idx)}><X size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted">Añade beneficios de cashback para que el sistema los calcule automáticamente en tus gastos.</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/creditcards/CashbackRulesEditor.jsx
git commit -m "refactor(tarjetas): extraer CashbackRulesEditor reutilizable"
```

---

## Task 7: Flujo Predefinida / Personalizada en `CreditCardsPage`

**Files:**
- Modify: `src/pages/CreditCardsPage.jsx`

> Verificación: `npm run lint` + `npm run build` + prueba manual (`npm run dev`).

- [ ] **Step 1: Actualizar imports y estado/handlers**

(a) Reemplazar el bloque de imports de la cabecera por:

```jsx
import { useState, useMemo } from 'react';
import { Plus, CreditCard, Edit3, Trash2, CheckCircle2, Calendar, History, RotateCcw } from 'lucide-react';
import useCreditCardStore from '../stores/useCreditCardStore';
import useTransactionStore from '../stores/useTransactionStore';
import useCategoryStore from '../stores/useCategoryStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import CashbackRulesEditor from '../components/creditcards/CashbackRulesEditor';
import { formatCurrency, formatDate, todayISO } from '../utils/formatters';
import { getCardCycles, getStatementAmount, isStatementPaid, getStatementHistory, getLifetimeCashback } from '../utils/creditCards';
import { CREDIT_CARD_CATALOG, getCatalogBanks, getCatalogCardsByBank, getCatalogCard, resolveCardCashback } from '../data/creditCardCatalog';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

const emptyForm = { name: '', bank: '', cutoffDay: '', dueDay: '', color: '#6366f1', cashbackRules: [], catalogId: null, note: '' };
```

(b) Reemplazar `const { categories } = useCategoryStore();` por:

```jsx
  const { categories, ensureCategory } = useCategoryStore();
```

(c) Reemplazar el bloque de estado + handlers `openCreate/openEdit/handleAddRule/handleRemoveRule/handleSubmit` por:

```jsx
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [historyCard, setHistoryCard] = useState(null);

  // Flujo de creación: 'predefinida' | 'personalizada' (solo aplica al crear).
  const [cardType, setCardType] = useState('predefinida');
  const [selectedBank, setSelectedBank] = useState('');
  const [showCashback, setShowCashback] = useState(false);

  const banks = getCatalogBanks();

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCardType('predefinida');
    setSelectedBank('');
    setShowCashback(false);
    setShowForm(true);
  };

  const openEdit = (card) => {
    setForm({
      name: card.name,
      bank: card.bank,
      cutoffDay: String(card.cutoffDay),
      dueDay: String(card.dueDay),
      color: card.color,
      cashbackRules: card.cashbackRules || [],
      catalogId: card.catalogId || null,
      note: card.catalogId ? (getCatalogCard(card.catalogId)?.note || '') : '',
    });
    setEditingId(card.id);
    setShowCashback(false);
    setShowForm(true);
  };

  // El usuario elige una tarjeta del catálogo: pre-llena nombre/banco/color/reglas.
  // Resuelve las reglas (crea categorías de ecosistema si faltan) en este momento.
  const handleSelectTemplate = async (catalogId) => {
    const template = getCatalogCard(catalogId);
    if (!template) {
      setForm((f) => ({ ...emptyForm, cutoffDay: f.cutoffDay, dueDay: f.dueDay }));
      return;
    }
    const resolved = await resolveCardCashback(template, categories, ensureCategory);
    setForm((f) => ({
      ...emptyForm,
      cutoffDay: f.cutoffDay,
      dueDay: f.dueDay,
      name: template.name,
      bank: template.bank,
      color: template.color,
      catalogId: template.id,
      cashbackRules: resolved,
      note: template.note || '',
    }));
  };

  const handleRestoreTemplate = async () => {
    const template = getCatalogCard(form.catalogId);
    if (!template) return;
    const resolved = await resolveCardCashback(template, categories, ensureCategory);
    setForm((f) => ({ ...f, cashbackRules: resolved, note: template.note || '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    setSelectedBank('');
    setShowCashback(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cutoffDay = parseInt(form.cutoffDay, 10);
    const dueDay = parseInt(form.dueDay, 10);
    if (!form.name || !(cutoffDay >= 1 && cutoffDay <= 31) || !(dueDay >= 1 && dueDay <= 31)) return;
    const payload = {
      name: form.name,
      bank: form.bank,
      cutoffDay,
      dueDay,
      color: form.color,
      cashbackRules: form.cashbackRules || [],
      catalogId: form.catalogId || null,
    };
    if (editingId) updateCard(editingId, payload);
    else addCard(payload);
    closeForm();
  };

  const isPredefined = editingId ? !!form.catalogId : cardType === 'predefinida';
```

- [ ] **Step 2: Reemplazar el `<Modal>` de crear/editar**

Reemplazar todo el bloque `<Modal isOpen={showForm} ...> ... </Modal>` (el formulario) por:

```jsx
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
      >
        <form onSubmit={handleSubmit}>
          {/* Selector de tipo (solo al crear) */}
          {!editingId && (
            <div className="form-group">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`btn ${cardType === 'predefinida' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setCardType('predefinida'); setForm({ ...emptyForm, cutoffDay: form.cutoffDay, dueDay: form.dueDay }); setSelectedBank(''); }}
                >
                  Predefinida
                </button>
                <button
                  type="button"
                  className={`btn ${cardType === 'personalizada' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setCardType('personalizada'); setForm({ ...emptyForm, cutoffDay: form.cutoffDay, dueDay: form.dueDay }); }}
                >
                  Personalizada
                </button>
              </div>
            </div>
          )}

          {/* Predefinida (crear): selección de banco + tarjeta */}
          {!editingId && cardType === 'predefinida' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Banco *</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => { setSelectedBank(e.target.value); handleSelectTemplate(''); }}
                    style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', width: '100%' }}
                  >
                    <option value="">Selecciona un banco</option>
                    {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tarjeta *</label>
                  <select
                    value={form.catalogId || ''}
                    disabled={!selectedBank}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', width: '100%' }}
                  >
                    <option value="">Selecciona una tarjeta</option>
                    {getCatalogCardsByBank(selectedBank).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Nombre/Banco: solo-lectura para predefinida, editable para personalizada */}
          {isPredefined ? (
            form.catalogId && (
              <div className="form-group">
                <label className="form-label">Tarjeta</label>
                <div className="flex items-center gap-2" style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <CreditCard size={16} style={{ color: form.color }} />
                  <span className="font-semibold">{form.name}</span>
                  <span className="text-xs text-muted">· {form.bank}</span>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Visa Clásica" required />
              </div>
              <div className="form-group">
                <label className="form-label">Banco</label>
                <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej: Banco Popular" />
              </div>
            </>
          )}

          {/* Corte / Pago: siempre editables. Visible solo si ya hay tarjeta elegida (predefinida) o siempre (personalizada). */}
          {(!isPredefined || form.catalogId) && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Día de corte *</label>
                <input type="number" min="1" max="31" value={form.cutoffDay} onChange={(e) => setForm({ ...form, cutoffDay: e.target.value })} placeholder="20" required />
              </div>
              <div className="form-group">
                <label className="form-label">Día de pago *</label>
                <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="5" required />
              </div>
            </div>
          )}

          {/* Color: editable siempre (cosmético) */}
          {(!isPredefined || form.catalogId) && (
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: form.color === c ? '3px solid var(--text-primary)' : '2px solid var(--border-secondary)',
                      cursor: 'pointer',
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cashback */}
          {(!isPredefined || form.catalogId) && (
            <div className="form-group" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {isPredefined ? (
                <>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowCashback((v) => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span className="form-label font-semibold" style={{ margin: 0 }}>Personalizar cashback</span>
                    <span className="text-xs text-muted">{showCashback ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                  {form.note && <div className="text-xs text-muted mt-2">{form.note}</div>}
                  {showCashback && (
                    <div className="mt-3">
                      <CashbackRulesEditor
                        rules={form.cashbackRules}
                        categories={categories}
                        onChange={(r) => setForm({ ...form, cashbackRules: r })}
                      />
                      <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={handleRestoreTemplate}>
                        <RotateCcw size={14} /> Restaurar valores del banco
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="form-label font-semibold">Reglas de Cashback</label>
                  <CashbackRulesEditor
                    rules={form.cashbackRules}
                    categories={categories}
                    onChange={(r) => setForm({ ...form, cashbackRules: r })}
                  />
                </>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isPredefined && !form.catalogId}>
              {editingId ? 'Guardar Cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>
```

- [ ] **Step 3: Lint y build**

Run: `npm run lint`
Expected: sin errores (sin variables sin usar; `CREDIT_CARD_CATALOG` se importa pero si no se usa directamente, quítalo del import).

Run: `npm run build`
Expected: build exitoso.

> Nota: si `CREDIT_CARD_CATALOG` no se referencia directamente en el JSX, elimínalo del import para evitar el warning de ESLint (los helpers `getCatalogBanks/getCatalogCardsByBank/getCatalogCard` sí se usan).

- [ ] **Step 4: Prueba manual**

Run: `npm run dev`
Verificar:
1. "Nueva Tarjeta" → "Predefinida" → Banco "Scotiabank" → "Visa Bravo". Se crea la categoría **Bravo** (verla en Categorías). Banco/nombre en solo-lectura.
2. Ingresar corte 20 / pago 5 y guardar. La tarjeta aparece con su color y el cashback funciona en un gasto de categoría Bravo (7%).
3. Editar esa tarjeta → "Personalizar cashback" → cambiar un %, guardar; "Restaurar valores del banco" vuelve a los valores del catálogo.
4. "Nueva Tarjeta" → "Personalizada" → crear como antes (nombre/banco libres). Funciona igual que antes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreditCardsPage.jsx
git commit -m "feat(tarjetas): flujo predefinida/personalizada con cashback automático"
```

---

## Task 8: Migración SQL y verificación final

**Files:**
- Modify: `supabase/schema.sql` (documentar la columna)

- [ ] **Step 1: Documentar la columna en el esquema**

En `supabase/schema.sql`, en la definición de `create table ... credit_cards`, agregar la columna después de `cashback_rules`:

```sql
  catalog_id     text,                                 -- id del template del catálogo (NULL = personalizada)
```

- [ ] **Step 2: Entregar el SQL de migración al usuario**

El usuario debe ejecutar en Supabase (idempotente):

```sql
alter table public.credit_cards add column if not exists catalog_id text;
```

- [ ] **Step 3: Suite completa**

Run: `npm test`
Expected: PASS (todos los archivos, incluidos los nuevos del catálogo).

Run: `npm run lint && npm run build`
Expected: sin errores; build exitoso.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "chore(supabase): documentar columna catalog_id en credit_cards"
```

---

## Self-review (cobertura del spec)

- §5.1 columna `catalog_id` → Task 5 + Task 8.
- §6 catálogo (`CATALOG_CATEGORIES`, `CREDIT_CARD_CATALOG`, helpers) → Task 1.
- §6.2 reglas por tarjeta → Task 1 (datos).
- §7 `resolveCardCashback` (all / slug / nombre+tipo / ecosistema bajo demanda / telecom) → Task 2.
- §7.1 slugs + limpieza de keywords de Supermercado + strip al crear ecosistema → Task 3 + Task 4.
- §8 UI predefinida/personalizada, bloqueo banco/nombre, panel cashback, restaurar → Task 7 (+ Task 6 editor).
- §9 no se toca `computeCashback` ni presupuesto → respetado (ningún task lo modifica).
- §10 pruebas de resolvedor/catálogo/telecom → Task 1, 2, 3.
- §12 archivos afectados → cubiertos por Tasks 1–8.
```
