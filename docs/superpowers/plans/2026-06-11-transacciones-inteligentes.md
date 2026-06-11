# Transacciones Inteligentes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autollenar categoría, tarjeta y moneda en el formulario del Ledger (y categoría en el importador) a partir del historial de transacciones del usuario, sin confirmaciones ni escrituras nuevas.

**Architecture:** Un módulo puro nuevo `src/data/transactionMemory.js` (`suggestFromHistory`) deduce los tres campos del historial por matching exacto/contención con decisión por campo (frecuencia, recencia desempata). `StitchLedger` lo consulta al teclear la descripción (fallback: keywords actuales); `StatementImportModal` lo consulta por fila. Se retira el toast de aprendizaje de keywords (trabajo sin commitear de hoy) porque el historial lo reemplaza.

**Tech Stack:** React + Zustand (lectura del store de transacciones ya cargado), Vitest para unitarias, sin cambios en Supabase.

**Spec:** `docs/superpowers/specs/2026-06-11-transacciones-inteligentes-design.md`

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/data/transactionMemory.js` | Crear | Lógica pura de memoria por historial |
| `src/data/transactionMemory.test.js` | Crear | Unitarias del módulo |
| `src/data/defaultCategories.js` | Modificar | Exportar `normalize` (línea 366); el resto vuelve a HEAD |
| `src/data/defaultCategories.test.js` | Restaurar | Vuelve a HEAD (se retiran tests del toast) |
| `src/stores/useCategoryStore.js` | Restaurar | Vuelve a HEAD (se retira `learnKeyword`) |
| `src/i18n/translations.js` | Restaurar | Vuelve a HEAD (se retiran claves del toast) |
| `src/stitch/screens/StitchLedger.jsx` | Restaurar + Modificar | Autollenado por historial + chips AUTO |
| `src/stitch/screens/StatementImportModal.jsx` | Modificar | Historial antes de keywords por fila |

---

### Task 1: Retirar el toast de keywords (trabajo sin commitear)

Todo el diff actual del working tree (5 archivos) ES la feature del toast que el
historial reemplaza. Se restaura a HEAD, no hay nada que commitear.

**Files:**
- Restore: `src/data/defaultCategories.js`, `src/data/defaultCategories.test.js`, `src/stores/useCategoryStore.js`, `src/i18n/translations.js`, `src/stitch/screens/StitchLedger.jsx`

- [ ] **Step 1: Confirmar que el diff pendiente es solo el toast**

Run: `git status --short`
Expected: exactamente esos 5 archivos como ` M`, más `tmp-verify-shots/` sin trackear. Si aparece otro archivo modificado, DETENTE y pregunta.

- [ ] **Step 2: Restaurar y limpiar**

```powershell
git restore src/data/defaultCategories.js src/data/defaultCategories.test.js src/stores/useCategoryStore.js src/i18n/translations.js src/stitch/screens/StitchLedger.jsx
Remove-Item tmp-verify-shots -Recurse -Force
```

- [ ] **Step 3: Verificar suite verde sobre HEAD**

Run: `npx vitest run`
Expected: 14 archivos / ~169 tests PASS (los 11 del toast ya no existen).

---

### Task 2: Módulo puro `transactionMemory` (TDD)

**Files:**
- Modify: `src/data/defaultCategories.js:366` (exportar `normalize`)
- Create: `src/data/transactionMemory.js`
- Test: `src/data/transactionMemory.test.js`

- [ ] **Step 1: Exportar `normalize`**

En `src/data/defaultCategories.js` línea 366, cambiar:

```js
function normalize(str) {
```

por:

```js
export function normalize(str) {
```

- [ ] **Step 2: Escribir los tests (fallarán)**

Crear `src/data/transactionMemory.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { suggestFromHistory } from './transactionMemory';

// Transacción mínima del historial. cardId null = sin tarjeta.
const tx = (description, categoryId, cardId, currency, date) =>
  ({ description, categoryId, cardId, currency, date });

describe('suggestFromHistory', () => {
  it('match exacto devuelve categoría, tarjeta y moneda del historial', () => {
    const hist = [tx('Jumbo', 'super', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Jumbo', hist)).toEqual(
      { categoryId: 'super', cardId: 'cc1', currency: 'DOP', source: 'exact' });
  });

  it('normaliza acentos y mayúsculas', () => {
    const hist = [tx('Café Atelier', 'resto', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('cafe atelier', hist)?.categoryId).toBe('resto');
  });

  it('exacto gana sobre contención', () => {
    const hist = [
      tx('Uber', 'taxi', null, 'DOP', '2026-05-01'),
      tx('Uber Eats', 'resto', 'cc1', 'DOP', '2026-05-02'),
    ];
    const s = suggestFromHistory('Uber', hist);
    expect(s).toEqual({ categoryId: 'taxi', cardId: '', currency: 'DOP', source: 'exact' });
  });

  it('contención: lo tecleado contiene a lo guardado', () => {
    const hist = [tx('Supermercado Nacional', 'super', 'cc1', 'DOP', '2026-05-01')];
    const s = suggestFromHistory('Supermercado Nacional Av. Lope', hist);
    expect(s).toEqual({ categoryId: 'super', cardId: 'cc1', currency: 'DOP', source: 'partial' });
  });

  it('contención: lo guardado contiene a lo tecleado', () => {
    const hist = [tx('Jumbo Agora Mall', 'super', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Jumbo', hist)?.categoryId).toBe('super');
  });

  it('frecuencia gana; recencia desempata', () => {
    const hist = [
      tx('Jumbo', 'super', 'cc1', 'DOP', '2026-03-01'),
      tx('Jumbo', 'super', 'cc1', 'DOP', '2026-04-01'),
      tx('Jumbo', 'hogar', 'cc2', 'DOP', '2026-05-01'), // minoría, aunque reciente
    ];
    const s = suggestFromHistory('Jumbo', hist);
    expect(s.categoryId).toBe('super');
    expect(s.cardId).toBe('cc1');
    // Recencia desempata 1-1:
    const empate = [
      tx('Sirena', 'super', null, 'DOP', '2026-03-01'),
      tx('Sirena', 'hogar', null, 'DOP', '2026-05-01'),
    ];
    expect(suggestFromHistory('Sirena', empate).categoryId).toBe('hogar');
  });

  it('cada campo se decide por separado', () => {
    const hist = [
      tx('Amazon', 'ropa', 'cc1', 'USD', '2026-05-01'),
      tx('Amazon', 'ropa', 'cc2', 'USD', '2026-05-02'),
      tx('Amazon', 'hogar', 'cc2', 'USD', '2026-05-03'),
    ];
    const s = suggestFromHistory('Amazon', hist);
    expect(s.categoryId).toBe('ropa');   // 2 vs 1
    expect(s.cardId).toBe('cc2');        // 2 vs 1
    expect(s.currency).toBe('USD');
  });

  it('"sin tarjeta" es un patrón: no rellena tarjeta', () => {
    const hist = [
      tx('Colmado Wilson', 'super', null, 'DOP', '2026-05-01'),
      tx('Colmado Wilson', 'super', null, 'DOP', '2026-05-02'),
      tx('Colmado Wilson', 'super', 'cc1', 'DOP', '2026-04-01'),
    ];
    expect(suggestFromHistory('Colmado Wilson', hist).cardId).toBe('');
  });

  it('transacciones sin categoría no enseñan categoría', () => {
    const hist = [tx('Pago Raro', '', 'cc1', 'DOP', '2026-05-01')];
    const s = suggestFromHistory('Pago Raro', hist);
    expect(s.categoryId).toBe('');
    expect(s.cardId).toBe('cc1');
  });

  it('descripción corta (<4 chars normalizados) → null', () => {
    const hist = [tx('Uber', 'taxi', null, 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Ub', hist)).toBeNull();
    expect(suggestFromHistory('   ', hist)).toBeNull();
  });

  it('historial vacío o sin match → null', () => {
    expect(suggestFromHistory('Jumbo', [])).toBeNull();
    expect(suggestFromHistory('Jumbo', [tx('Netflix', 'subs', null, 'DOP', '2026-05-01')])).toBeNull();
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `npx vitest run src/data/transactionMemory.test.js`
Expected: FAIL — `Cannot find module './transactionMemory'` (o equivalente).

- [ ] **Step 4: Implementar el módulo**

Crear `src/data/transactionMemory.js`:

```js
// Memoria de transacciones — la app "aprende" del usuario sin guardar nada
// nuevo: su historial YA es la memoria. Dada la descripción que teclea, busca
// transacciones pasadas iguales (o similares, por contención) y deduce
// categoría, tarjeta y moneda según lo que eligió las veces anteriores.
// Funciones puras, sin React ni stores (misma convención que autoCategorize).
import { normalize } from './defaultCategories';

// Por debajo de esto el matcheo es ruido ("el", "la", iniciales).
const MIN_LEN = 4;

// Valor más frecuente de `field` entre las candidatas; a igual frecuencia gana
// el de la transacción más reciente. `allowEmpty`: si ''/null compite como
// valor (tarjeta sí — "sin tarjeta" es un patrón; categoría/moneda no).
function pickField(candidates, field, allowEmpty = false) {
  const stats = new Map(); // valor → { count, lastDate }
  for (const t of candidates) {
    const value = t[field] == null ? '' : t[field];
    if (!allowEmpty && value === '') continue;
    const s = stats.get(value) || { count: 0, lastDate: '' };
    s.count += 1;
    if ((t.date || '') > s.lastDate) s.lastDate = t.date || '';
    stats.set(value, s);
  }
  let best = null;
  let bestStats = null;
  for (const [value, s] of stats) {
    if (!bestStats || s.count > bestStats.count ||
        (s.count === bestStats.count && s.lastDate > bestStats.lastDate)) {
      best = value;
      bestStats = s;
    }
  }
  return best; // null si ninguna candidata aportó valor
}

// → { categoryId, cardId, currency, source: 'exact'|'partial' } | null
export function suggestFromHistory(description, transactions) {
  const q = normalize(description);
  if (q.length < MIN_LEN) return null;

  const withDesc = (transactions || []).filter((t) => t.description);
  let candidates = withDesc.filter((t) => normalize(t.description) === q);
  let source = 'exact';
  if (candidates.length === 0) {
    source = 'partial';
    candidates = withDesc.filter((t) => {
      const d = normalize(t.description);
      return d.length >= MIN_LEN && (d.includes(q) || q.includes(d));
    });
  }
  if (candidates.length === 0) return null;

  return {
    categoryId: pickField(candidates, 'categoryId') ?? '',
    cardId: pickField(candidates, 'cardId', true) ?? '',
    currency: pickField(candidates, 'currency') ?? '',
    source,
  };
}
```

- [ ] **Step 5: Verificar que pasan**

Run: `npx vitest run src/data/transactionMemory.test.js`
Expected: 11 tests PASS.

- [ ] **Step 6: Suite completa y commit**

Run: `npx vitest run`
Expected: todo verde.

```powershell
git add src/data/transactionMemory.js src/data/transactionMemory.test.js src/data/defaultCategories.js
git commit -m @'
feat(smart): suggestFromHistory — memoria de transacciones por historial

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Autollenado en el formulario del Ledger

**Files:**
- Modify: `src/stitch/screens/StitchLedger.jsx` (versión HEAD, ya restaurada en Task 1)

Referencias en la versión HEAD: import de `autoCategorize` (línea 27), estado
`autoCat` (línea 65), `onDescription` (líneas 127-151), `onCategoryManual`
(156-166), `openCreate`/`openEdit` (168-169), `submit` (líneas 173-203, usa
`setAutoCat` en 202), Fields del modal (477-491), chip de categoría (línea 477).

- [ ] **Step 1: Importar el módulo nuevo**

Tras la línea 27 (`import { autoCategorize } ...`), añadir:

```js
import { suggestFromHistory } from '../../data/transactionMemory';
```

- [ ] **Step 2: Reemplazar el estado `autoCat` por flags por campo**

Reemplazar la línea 65 (`const [autoCat, setAutoCat] = useState(false);`) por:

```js
// Autollenado inteligente: `autoSet` = campos llenados por la memoria/keywords
// (muestran chip AUTO); `touched` = campos que el usuario tocó a mano en este
// form (quedan excluidos del autollenado hasta cerrarlo).
const blankSmart = { category: false, card: false, currency: false };
const [autoSet, setAutoSet] = useState(blankSmart);
const [touched, setTouched] = useState(blankSmart);
const resetSmart = () => { setAutoSet(blankSmart); setTouched(blankSmart); };
```

- [ ] **Step 3: Reescribir `onDescription`**

Reemplazar la función completa (líneas 127-151 de HEAD) por:

```js
const onDescription = (raw) => {
  // Auto-capitaliza la primera letra mientras se escribe; al guardar,
  // titleCase completa el resto de las palabras.
  const description = raw.charAt(0).toLocaleUpperCase() + raw.slice(1);
  if (editing) { setForm((prev) => ({ ...prev, description })); return; }

  // Memoria por historial primero (lo que el usuario hizo otras veces con esta
  // descripción); keywords de fábrica como fallback. Nunca pisa campos tocados.
  const sug = suggestFromHistory(description, transactions);
  const next = { ...form, description };
  const applied = { ...autoSet };

  if (!touched.category) {
    const categoryId = sug?.categoryId || autoCategorize(description, categories)?.id || '';
    if (categoryId) {
      next.categoryId = categoryId;
      next.type = typeOfCategory(categoryId); // el tipo lo manda la categoría
      applied.category = true;
    }
  }
  if (!touched.card) {
    if (sug) {
      // '' también es respuesta: si el patrón es "sin tarjeta", no se rellena.
      next.cardId = sug.cardId;
      applied.card = !!sug.cardId;
    } else if (!form.cardId && next.categoryId) {
      // Sin historial: sugiere la tarjeta de cashback de la categoría (como hoy).
      const suggested = cardForCategory(next.categoryId);
      if (suggested) { next.cardId = suggested; applied.card = true; }
    }
  }
  if (!touched.currency && sug?.currency) {
    next.currency = sug.currency;
    applied.currency = true;
  }

  setForm(next);
  setAutoSet(applied);
};
```

- [ ] **Step 4: Marcar "tocado" en los cambios manuales**

Reemplazar `onCategoryManual` (líneas 156-166 de HEAD) por:

```js
// Cambio manual de categoría: ese campo deja de autollenarse y pierde el chip.
// Si la categoría tiene tarjeta de cashback asociada y aún no hay tarjeta, la
// sugiere sin pisar una manual (comportamiento de siempre).
const onCategoryManual = (id) => {
  setTouched((tt) => ({ ...tt, category: true }));
  setAutoSet((a) => ({ ...a, category: false }));
  setForm((f) => {
    const next = { ...f, categoryId: id, type: id ? typeOfCategory(id) : f.type };
    if (id && !f.cardId) {
      const suggested = cardForCategory(id);
      if (suggested) next.cardId = suggested;
    }
    return next;
  });
};
```

En el JSX del modal, el select de **tarjeta** (HEAD línea 501-507) cambia su `onChange`:

```jsx
<StitchSelect
  value={form.cardId}
  onChange={(v) => { setTouched((tt) => ({ ...tt, card: true })); setAutoSet((a) => ({ ...a, card: false })); setForm({ ...form, cardId: v }); }}
  options={[{ value: '', label: t('screens.ledger.noCard') }, ...cards.map((c) => ({ value: c.id, label: c.name }))]}
  placeholder={t('screens.ledger.noCard')}
/>
```

Y el select de **moneda** (HEAD líneas 486-491):

```jsx
<StitchSelect
  value={form.currency}
  onChange={(v) => { setTouched((tt) => ({ ...tt, currency: true })); setAutoSet((a) => ({ ...a, currency: false })); setForm({ ...form, currency: v }); }}
  options={[{ value: 'DOP', label: 'RD$ (DOP)' }, { value: 'USD', label: 'US$ (USD)' }]}
/>
```

- [ ] **Step 5: Resets y chips**

1. En `openCreate` y `openEdit` (líneas 168-169) y al final de `submit` (línea 202), reemplazar cada `setAutoCat(false)` por `resetSmart()`.
2. Chip de categoría (línea 477): `extra={<AutoCatChip show={autoSet.category && !touched.category && !!form.categoryId} />}`.
3. Field de moneda (línea 485): `<Field label={t('common.currency')} extra={<AutoCatChip show={autoSet.currency && !touched.currency} />}>`.
4. Field de tarjeta (línea 500): `<Field label={t('screens.ledger.cardOptional')} extra={<AutoCatChip show={autoSet.card && !touched.card && !!form.cardId} />}>`.

- [ ] **Step 6: Verificar que no quedan referencias rotas**

Run: `npx eslint src/stitch/screens/StitchLedger.jsx`
Expected: 0 errores (en particular, ninguna referencia restante a `autoCat`/`setAutoCat`).

- [ ] **Step 7: Commit**

```powershell
git add src/stitch/screens/StitchLedger.jsx
git commit -m @'
feat(smart): autollenado de categoría/tarjeta/moneda por historial en Ledger

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: Historial en el importador de estados

**Files:**
- Modify: `src/stitch/screens/StatementImportModal.jsx:8,42,79`

- [ ] **Step 1: Importar y usar el historial antes de keywords**

Tras la línea 8 (`import { autoCategorize } ...`), añadir:

```js
import { suggestFromHistory } from '../../data/transactionMemory';
```

Reemplazar las líneas 41-44 (dentro del `useMemo` de `matchResult`):

```js
    result.toImport = result.toImport.map((tx) => {
      // Historial del usuario primero (comercios ya corregidos a mano llegan
      // bien clasificados); keywords de fábrica como fallback.
      const fromHistory = suggestFromHistory(tx.description, existingTxs)?.categoryId;
      const categoryId = fromHistory || autoCategorize(tx.description, categories)?.id || null;
      return { ...tx, suggestedCategoryId: categoryId };
    });
```

Reemplazar la línea 79 (categoría de las ambiguas):

```js
        const categoryId = suggestFromHistory(item.pdfTx.description, existingTxs)?.categoryId
          || autoCategorize(item.pdfTx.description, categories)?.id || '';
```

- [ ] **Step 2: Lint y commit**

Run: `npx eslint src/stitch/screens/StatementImportModal.jsx`
Expected: 0 errores.

```powershell
git add src/stitch/screens/StatementImportModal.jsx
git commit -m @'
feat(smart): el importador clasifica con el historial antes que con keywords

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: Verificación integral

- [ ] **Step 1: Suite + build**

Run: `npx vitest run` → todo verde (180+ tests).
Run: `npm run build` → `✓ built`.
(`npm run lint` global tiene 7 errores preexistentes ajenos a esta feature — verificar solo que los archivos tocados estén limpios, ya cubierto en Tasks 3-4.)

- [ ] **Step 2: Verificación visual en demo (skill `verify`)**

Flujo a observar con la app corriendo (`npm run preview -- --port 4173`):

1. Ledger → Nueva transacción → teclear "Carrefour" (existe en demo con tarjeta cc1) → categoría, tarjeta Y moneda autollenadas con chips AUTO.
2. Crear una transacción nueva "Hotel Catalonia" en USD sin tarjeta y categoría "Viajes y Turismo"; reabrir el form y teclear "Hotel Catalonia" → moneda USD y sin tarjeta, con chips.
3. Elegir una tarjeta a mano y luego seguir tecleando la descripción → la tarjeta elegida NO se pisa.
4. Probar contención: teclear "Carrefour Bella Vista" → debe reconocer "Carrefour".

- [ ] **Step 3: Reporte final al usuario**

Verdict + evidencia (capturas) + recordatorio: el push a `main` despliega a Vercel; no hay migraciones.
