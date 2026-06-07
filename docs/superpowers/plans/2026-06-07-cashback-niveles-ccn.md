# Cashback por niveles CCN (derivado) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular el cashback escalonado del Grupo CCN (5/6/8% según el consumo mensual acumulado, sin tope) de forma derivada (en vivo), y auto-clasificar las compras CCN por keywords.

**Architecture:** Se añade un segundo camino de cashback que convive con el actual. El camino congelado (`computeCashback` → `cashbackEarned` guardado) no se toca. Para tarjetas con una regla escalonada (`tiers`), el cashback NO se congela: una función pura `getDerivedCashback(card, transactions, monthKey)` recorre las transacciones CCN del mes, acumula el gasto y aplica el nivel correspondiente al total acumulado. La UI de Tarjetas muestra ese valor como "estimado del mes".

**Tech Stack:** JS puro + Vitest. UI: React 19 (pantalla Tarjetas existente).

---

## File Structure

- Modify: `src/utils/creditCards.js` — añadir `tierPercentage`, `getDerivedCashback`, `hasTieredRule`.
- Test: `src/utils/creditCards.test.js` — tests de las funciones puras nuevas.
- Modify: `src/data/creditCardCatalog.js` — ampliar keywords `grupo-ccn`; marcar la regla CCN como escalonada.
- Test: `src/data/creditCardCatalog.test.js` — el test de integridad debe aceptar reglas con `tiers`.
- Modify: `src/stitch/screens/StitchCards.jsx` (o el componente de tarjeta que muestra cashback) — sumar el cashback derivado al mostrado.

---

## Task 1: Función pura del nivel escalonado

**Files:**
- Modify: `src/utils/creditCards.js`
- Test: `src/utils/creditCards.test.js`

- [ ] **Step 1: Write the failing test**

Añadir a `src/utils/creditCards.test.js`:

```js
import { tierPercentage } from './creditCards';

describe('tierPercentage — nivel escalonado por monto acumulado', () => {
  const tiers = [
    { upTo: 7999, pct: 5 },
    { upTo: 19999, pct: 6 },
    { upTo: Infinity, pct: 8 },
  ];

  it('aplica 5% por debajo del primer umbral', () => {
    expect(tierPercentage(tiers, 5000)).toBe(5);
    expect(tierPercentage(tiers, 7999)).toBe(5);
  });
  it('aplica 6% en el tramo medio', () => {
    expect(tierPercentage(tiers, 8000)).toBe(6);
    expect(tierPercentage(tiers, 19999)).toBe(6);
  });
  it('aplica 8% desde el umbral superior', () => {
    expect(tierPercentage(tiers, 20000)).toBe(8);
    expect(tierPercentage(tiers, 100000)).toBe(8);
  });
  it('monto 0 o negativo → 0%', () => {
    expect(tierPercentage(tiers, 0)).toBe(0);
    expect(tierPercentage(tiers, -10)).toBe(0);
  });
  it('sin tiers → 0%', () => {
    expect(tierPercentage([], 5000)).toBe(0);
    expect(tierPercentage(null, 5000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: FAIL ("tierPercentage is not a function").

- [ ] **Step 3: Implement tierPercentage**

Añadir a `src/utils/creditCards.js`:

```js
/**
 * Devuelve el % del nivel correspondiente a un monto ACUMULADO, dada una lista
 * de tiers ordenados ascendentemente por `upTo` (inclusivo). El último tier suele
 * tener upTo: Infinity. Monto ≤ 0 o sin tiers → 0.
 * @param {Array<{upTo:number, pct:number}>} tiers
 * @param {number} accumulated
 */
export function tierPercentage(tiers, accumulated) {
  const amt = Number(accumulated);
  if (!Array.isArray(tiers) || tiers.length === 0 || !amt || amt <= 0) return 0;
  for (const t of tiers) {
    if (amt <= Number(t.upTo)) return Number(t.pct) || 0;
  }
  return Number(tiers[tiers.length - 1].pct) || 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "feat(cashback): tierPercentage para niveles escalonados por monto"
```

---

## Task 2: Cashback derivado por mes (acumulado CCN)

**Files:**
- Modify: `src/utils/creditCards.js`
- Test: `src/utils/creditCards.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { getDerivedCashback, hasTieredRule } from './creditCards';

describe('getDerivedCashback — cashback CCN derivado por mes', () => {
  // Tarjeta con una regla escalonada para la categoría 'ccn'.
  const card = {
    id: 'card1',
    cashbackRules: [
      { categoryId: 'ccn', tiers: [
        { upTo: 7999, pct: 5 },
        { upTo: 19999, pct: 6 },
        { upTo: Infinity, pct: 8 },
      ] },
    ],
  };
  // 3 compras CCN en 2026-06: 5000 + 6000 + 12000 = 23000 acumulado → nivel 8%.
  const txs = [
    { cardId: 'card1', categoryId: 'ccn', amount: 5000, date: '2026-06-03' },
    { cardId: 'card1', categoryId: 'ccn', amount: 6000, date: '2026-06-10' },
    { cardId: 'card1', categoryId: 'ccn', amount: 12000, date: '2026-06-20' },
    // Otra tarjeta / otra categoría / otro mes: no cuentan.
    { cardId: 'otra', categoryId: 'ccn', amount: 9999, date: '2026-06-05' },
    { cardId: 'card1', categoryId: 'super', amount: 9999, date: '2026-06-05' },
    { cardId: 'card1', categoryId: 'ccn', amount: 9999, date: '2026-05-30' },
  ];

  it('hasTieredRule detecta la regla escalonada', () => {
    expect(hasTieredRule(card)).toBe(true);
    expect(hasTieredRule({ cashbackRules: [{ categoryId: 'x', percentage: 1 }] })).toBe(false);
  });

  it('aplica el nivel del acumulado mensual a todo el gasto CCN del mes', () => {
    // Acumulado 23000 → 8%. Cashback = 23000 * 8% = 1840.
    expect(getDerivedCashback(card, txs, '2026-06')).toBe(1840);
  });

  it('mes sin consumo CCN → 0', () => {
    expect(getDerivedCashback(card, txs, '2026-07')).toBe(0);
  });

  it('tarjeta sin regla escalonada → 0', () => {
    const flat = { id: 'card1', cashbackRules: [{ categoryId: 'ccn', percentage: 5 }] };
    expect(getDerivedCashback(flat, txs, '2026-06')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: FAIL ("getDerivedCashback is not a function").

- [ ] **Step 3: Implement the functions**

Añadir a `src/utils/creditCards.js`:

```js
/** ¿La tarjeta tiene al menos una regla escalonada (con `tiers`)? */
export function hasTieredRule(card) {
  return Array.isArray(card?.cashbackRules)
    && card.cashbackRules.some((r) => Array.isArray(r.tiers) && r.tiers.length > 0);
}

/**
 * Cashback DERIVADO (en vivo) del mes `monthKey` ('YYYY-MM') para las reglas
 * escalonadas de una tarjeta. Para cada regla con `tiers`, suma el gasto de esa
 * categoría en ese mes, determina el nivel por el ACUMULADO y aplica ese % a todo
 * el acumulado. Devuelve el total en DOP, redondeado a 2 decimales.
 * Las reglas planas (sin tiers) NO entran aquí: su cashback va congelado por
 * transacción (computeCashback), como siempre.
 */
export function getDerivedCashback(card, transactions = [], monthKey) {
  if (!hasTieredRule(card) || !monthKey) return 0;
  let total = 0;
  for (const rule of card.cashbackRules) {
    if (!Array.isArray(rule.tiers) || rule.tiers.length === 0) continue;
    const accumulated = transactions.reduce((sum, t) => {
      if (t.cardId !== card.id) return sum;
      if (t.categoryId !== rule.categoryId) return sum;
      if (!t.date || !String(t.date).startsWith(monthKey)) return sum;
      return sum + (Number(t.amount) || 0);
    }, 0);
    const pct = tierPercentage(rule.tiers, accumulated);
    total += (accumulated * pct) / 100;
  }
  return Math.round(total * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "feat(cashback): getDerivedCashback (acumulado mensual CCN)"
```

---

## Task 3: computeCashback ignora reglas escalonadas

**Files:**
- Modify: `src/utils/creditCards.js` (función `computeCashback`)
- Test: `src/utils/creditCards.test.js`

`computeCashback` (camino congelado) NO debe intentar calcular un % sobre una regla
escalonada (no tiene `percentage`), porque devolvería NaN o 0 silencioso. Debe
saltar las reglas con `tiers` para que el cashback CCN venga solo del camino derivado.

- [ ] **Step 1: Write the failing test**

```js
import { computeCashback } from './creditCards';

describe('computeCashback ignora reglas escalonadas', () => {
  const card = {
    cashbackRules: [
      { categoryId: 'ccn', tiers: [{ upTo: 7999, pct: 5 }, { upTo: Infinity, pct: 8 }] },
      { categoryId: 'all', percentage: 1 },
    ],
  };
  it('una compra CCN no congela cashback (lo maneja el camino derivado) → cae a all 1%', () => {
    // Sin el fix, encontraría la regla 'ccn' (tiers, sin percentage) y devolvería 0/NaN.
    // Con el fix, salta la regla escalonada y usa 'all' (1%): 1000 * 1% = 10.
    expect(computeCashback(card, 'ccn', 1000)).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: FAIL (devuelve 0 o NaN en vez de 10).

- [ ] **Step 3: Patch computeCashback**

En `src/utils/creditCards.js`, en `computeCashback`, cambiar la búsqueda de regla
para que ignore las que tienen `tiers`:

```js
export function computeCashback(card, categoryId, amount) {
  const amt = Number(amount);
  if (!card || !Array.isArray(card.cashbackRules) || !amt || isNaN(amt)) return 0;
  // Las reglas escalonadas (tiers) NO congelan cashback: las maneja
  // getDerivedCashback (en vivo, por acumulado mensual). Aquí solo % plano.
  const flatRules = card.cashbackRules.filter((r) => typeof r.percentage === 'number');
  const rule =
    flatRules.find((r) => r.categoryId === categoryId) ||
    flatRules.find((r) => r.categoryId === 'all');
  if (!rule) return 0;
  return Math.round((amt * Number(rule.percentage)) / 100 * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/creditCards.test.js`
Expected: PASS. Verificar que los tests previos de computeCashback (% plano) siguen verdes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/creditCards.js src/utils/creditCards.test.js
git commit -m "fix(cashback): computeCashback ignora reglas escalonadas"
```

---

## Task 4: Keywords CCN + regla escalonada en el catálogo

**Files:**
- Modify: `src/data/creditCardCatalog.js`
- Test: `src/data/creditCardCatalog.test.js`

- [ ] **Step 1: Update the test to accept tiered rules**

El test de integridad valida `typeof r.percentage === 'number'` para CADA regla.
Una regla escalonada no tiene `percentage`. Ajustar ese test:

En `src/data/creditCardCatalog.test.js`, dentro de "cada regla usa una categoryKey
válida y un % numérico", cambiar la aserción del percentage para permitir tiers:

```js
  it('cada regla usa una categoryKey válida y un % numérico o tiers', () => {
    const valid = new Set([
      'all',
      ...Object.keys(CATALOG_CATEGORIES),
      ...Object.keys(DEFAULT_CATEGORY_KEYS),
    ]);
    for (const card of CREDIT_CARD_CATALOG) {
      for (const r of card.cashback) {
        expect(valid.has(r.categoryKey), `${card.id}:${r.categoryKey}`).toBe(true);
        const hasFlat = typeof r.percentage === 'number';
        const hasTiers = Array.isArray(r.tiers) && r.tiers.length > 0;
        expect(hasFlat || hasTiers, `${card.id}:${r.categoryKey}`).toBe(true);
      }
    }
  });
```

- [ ] **Step 2: Add CCN keywords and the tiered rule**

En `src/data/creditCardCatalog.js`:

Ampliar los keywords de `grupo-ccn` (con la lista del usuario; sin acentos para
matchear con `normalize`):
```js
  'grupo-ccn': {
    slug: 'eco-grupo-ccn', name: 'Grupo CCN', type: 'variable_expense', icon: '🛒', color: '#004b87',
    keywords: ['nacional', 'supermercados nacional', 'jumbo', 'jumbo express', 'casa cuesta', 'ferreteria cuesta', 'jugueton', 'cuesta libros', 'bebe mundo', 'bebemundo', 'la bodega', 'merca jumbo'],
  },
```

Cambiar la regla de la tarjeta CCN de % plano a escalonada:
```js
  { id: 'popular-mc-plus-ccn', bank: 'Banco Popular Dominicano', name: 'Mastercard Plus CCN', color: '#e30613',
    note: 'Devolución escalonada por consumo mensual acumulado en el Grupo CCN: 5% hasta RD$7,999, 6% de RD$8,000 a RD$19,999, 8% desde RD$20,000. Sin tope mensual.',
    cashback: [
      { categoryKey: 'grupo-ccn', tiers: [
        { upTo: 7999, pct: 5 },
        { upTo: 19999, pct: 6 },
        { upTo: Infinity, pct: 8 },
      ] },
    ] },
```

- [ ] **Step 3: Update resolveCardCashback to carry tiers**

`resolveCardCashback` hoy solo arma `{ categoryId, percentage }`. Debe propagar
`tiers` cuando la regla los tenga. En `src/data/creditCardCatalog.js`, dentro del
loop de `resolveCardCashback`, al hacer push de la regla resuelta, conservar tiers:

Localizar las líneas que hacen `rules.push({ categoryId: id, percentage: pct })` y
`rules.push({ categoryId: match.id, percentage: pct })`. Antes del loop, extraer:
```js
  for (const rule of template?.cashback || []) {
    const key = rule.categoryKey;
    const pct = Number(rule.percentage);
    const tiers = Array.isArray(rule.tiers) ? rule.tiers : null;
    // helper para construir la regla resuelta preservando tiers o percentage
    const build = (categoryId) => tiers ? { categoryId, tiers } : { categoryId, percentage: pct };
```
y sustituir cada `rules.push({ categoryId: X, percentage: pct })` por `rules.push(build(X))`.
Para la rama `key === 'all'`, mantener `rules.push({ categoryId: 'all', percentage: pct })`
(la regla 'all' nunca es escalonada).

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (todos, incluido el de integridad ajustado y los de resolveCardCashback).
Si "Supermercado por defecto no conserva keywords de ecosistemas" falla por 'jumbo'
o 'nacional', es preexistente al diseño — verificar que esos keywords NO estén en la
categoría supermercado de `defaultCategories.js` (ya deberían estar fuera).

- [ ] **Step 5: Commit**

```bash
git add src/data/creditCardCatalog.js src/data/creditCardCatalog.test.js
git commit -m "feat(cashback): CCN escalonado + keywords del Grupo CCN"
```

---

## Task 5: Mostrar el cashback derivado en la UI de Tarjetas

**Files:**
- Modify: `src/stitch/screens/StitchCards.jsx` (y/o el subcomponente que muestra el cashback de una tarjeta — identificar con grep antes de editar).

- [ ] **Step 1: Locate where lifetime/statement cashback is shown**

Run: `grep -rn "getLifetimeCashback\|getStatementCashback\|cashback" src/stitch/screens/StitchCards.jsx src/stitch/screens/cards/`
Identificar el punto donde se muestra el cashback de la tarjeta al usuario.

- [ ] **Step 2: Add derived cashback to the displayed value**

Donde se calcula el cashback mostrado de una tarjeta, sumar el derivado del mes
actual. Importar `getDerivedCashback` y `hasTieredRule` desde `utils/creditCards`,
y el mes actual como 'YYYY-MM'. Para una tarjeta con regla escalonada, el cashback
del mes mostrado debe incluir `getDerivedCashback(card, transactions, monthKey)`.

Patrón (ajustar a la estructura real del componente):
```jsx
import { getDerivedCashback, hasTieredRule } from '../../utils/creditCards';

// monthKey del mes en curso
const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// Para tarjetas escalonadas, el cashback del mes es derivado (estimado).
const derived = hasTieredRule(card) ? getDerivedCashback(card, transactions, monthKey) : 0;
// Sumar `derived` al cashback mostrado de la tarjeta, etiquetándolo como
// "estimado del mes" cuando hasTieredRule(card).
```

Mostrar una etiqueta "estimado del mes" cuando `hasTieredRule(card)` es true, para
que el usuario entienda que ese valor varía con el consumo del mes.

- [ ] **Step 3: Verify lint, tests, build**

Run: `npx eslint src/stitch/screens/StitchCards.jsx && npm test && npm run build`
Expected: lint 0; tests verdes; build ✓.

- [ ] **Step 4: Manual/visual verification**

Lanzar la app en demo (la tarjeta demo `cc1` no es CCN; para probar, crear una
tarjeta del catálogo "Mastercard Plus CCN" y registrar consumos con descripción
"Jumbo"/"Casa Cuesta"). Confirmar que el cashback se muestra como estimado y cambia
de nivel al cruzar RD$8,000 y RD$20,000 acumulados en el mes.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/StitchCards.jsx
git commit -m "feat(cashback): mostrar cashback CCN derivado (estimado del mes)"
```

---

## Self-Review

- **Spec coverage (Sección C):** nivel escalonado (Task 1), derivado por acumulado
  mensual (Task 2), coexistencia con el congelado sin romperlo (Task 3), keywords
  CCN + regla escalonada en catálogo + propagación de tiers (Task 4), UI con
  etiqueta "estimado del mes" (Task 5). ✓
- **Placeholders:** Task 5 depende de la estructura real de StitchCards (no la tengo
  memorizada al 100%), por eso incluye un paso de `grep` para localizar el punto
  exacto antes de editar, con el patrón de integración explícito. El resto del
  código está completo.
- **Type consistency:** `tierPercentage(tiers, amount)` (Task 1) usado por
  `getDerivedCashback` (Task 2). Forma de regla escalonada `{ categoryId, tiers:
  [{ upTo, pct }] }` consistente en Tasks 1, 2, 4. `hasTieredRule`/`getDerivedCashback`
  (Task 2) usados en Task 5. `computeCashback` filtra `tiers` (Task 3) coherente con
  la forma de regla de Task 4.
- **Fuera de alcance (confirmado):** topes mensuales, mínimos, días de la semana,
  topes en USD. Demás tarjetas siguen como % plano.
```
