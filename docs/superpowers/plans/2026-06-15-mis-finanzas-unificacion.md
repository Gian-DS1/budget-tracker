# Unificación "Mis finanzas" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar Ahorros, Deudas y Tarjetas en una sola pantalla "Mis finanzas" (`/mis-finanzas`) con un resumen de patrimonio arriba (neto + efectivo + ahorro + deudas) y tabs para el detalle de cada categoría, reusando las pantallas actuales como paneles sin repetir los totales.

**Architecture:** Una pantalla nueva `StitchFinances.jsx` orquesta: un `PatrimonioSummary` (resumen, reusa selectores existentes) + una barra de tabs + el panel activo. Las 3 pantallas actuales ganan un prop `embedded` que, cuando es true, omite su `<div>` raíz y oculta su total de header (el total vive en el resumen). El menú pasa de 3 entradas a 1; las rutas viejas redirigen al tab correcto.

**Tech Stack:** React 19, React Router 7 (`Navigate`, `useSearchParams`), Zustand, framer-motion, Vitest, TailwindCSS v4.

**Spec:** [docs/superpowers/specs/2026-06-15-mis-finanzas-unificacion-design.md](../specs/2026-06-15-mis-finanzas-unificacion-design.md)

---

## Notas de implementación (leer antes de empezar)

- **No hay lógica de cálculo nueva.** El resumen reusa `getLiquidCash`, `getTotalSaved`, `getTotalDebt` (ya testeados). Por eso **no se añaden tests unitarios nuevos**: la verificación es `npm run build` + `npm test` (no-regresión) + ESLint + inspección visual en demo. Esto es honesto: forzar un test "el div tiene la clase X" sería teatro.
- **Estrategia de reuso vía prop `embedded`:** cada pantalla (`StitchVaults`, `StitchDebts`, `StitchCards`) acepta `embedded = false`. Cuando es `true`: (a) el `return` envuelve en `<>...</>` en vez del `<div className="p-md...">`, y (b) se oculta la línea de total del header. Standalone (`embedded=false`) sigue funcionando idéntico, así las rutas viejas podrían incluso renderizarlas directo si hiciera falta (aunque redirigen).
- **`isDemoActive()` y stores:** no se tocan. Los paneles ya ramifican demo internamente.
- **i18n es/en:** toda cadena visible nueva necesita clave en ambos idiomas.
- **Commits:** mensajes en español, imperativo.

---

## File Structure

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `src/stitch/screens/finances/PatrimonioSummary.jsx` | Crear | Resumen: neto + efectivo/ahorro/deudas. Reusa selectores. |
| `src/stitch/screens/StitchFinances.jsx` | Crear | Shell: summary + tabs + panel activo. |
| `src/stitch/screens/StitchVaults.jsx` | Modificar | Prop `embedded`: sin `<div>` raíz ni total de header. |
| `src/stitch/screens/StitchDebts.jsx` | Modificar | Prop `embedded`: idem. |
| `src/stitch/screens/StitchCards.jsx` | Modificar | Prop `embedded`: sin `<div>` raíz (no tiene total que quitar). |
| `src/stitch/StitchApp.jsx` | Modificar | Ruta `/mis-finanzas`; redirigir `/ahorros`,`/deudas`,`/tarjetas`. |
| `src/stitch/StitchShell.jsx` | Modificar | Menú: 3 entradas → 1 "Mis finanzas". |
| `src/stitch/usePageTitle.js` | Modificar | `/mis-finanzas` → `nav.finances`. |
| `src/i18n/translations.js` | Modificar | Claves `nav.finances`, `finances.*`. |

---

## Task 1: Prop `embedded` en StitchVaults

**Files:**
- Modify: `src/stitch/screens/StitchVaults.jsx`

**Contexto:** Hoy el `return` abre con `<div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">` y el header tiene la línea de total en [StitchVaults.jsx:75](../../../src/stitch/screens/StitchVaults.jsx#L75).

- [ ] **Step 1: Añadir el prop a la firma**

En [StitchVaults.jsx:23](../../../src/stitch/screens/StitchVaults.jsx#L23):

```javascript
export default function StitchVaults({ embedded = false }) {
```

- [ ] **Step 2: Envolver el return según `embedded`**

El componente devuelve un `<div>` raíz. Para no reindentar todo, se extrae el contenido y se elige el wrapper. Cambiar la apertura del `return` (línea 66-67):

De:
```javascript
  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
```

A:
```javascript
  const Wrapper = embedded ? 'div' : 'div';
  const wrapperClass = embedded ? '' : 'p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full';
  return (
    <Wrapper className={wrapperClass}>
```

Y el cierre del `return` (la línea `</div>` que cierra ese div raíz, antes de los modales — línea ~107 según el archivo actual: el `</div>` que cierra el wrapper, justo antes de `{showForm && ...}`). Cambiar ese `</div>` de cierre por `</Wrapper>`.

> Nota: el wrapper se mantiene como `div` en ambos casos (no hace falta Fragment porque un `div` sin clases es inofensivo dentro del shell). Lo que cambia es la clase: con padding/ancho en standalone, sin nada en embedded.

- [ ] **Step 3: Ocultar la línea de total cuando `embedded`**

En [StitchVaults.jsx:75](../../../src/stitch/screens/StitchVaults.jsx#L75), la línea:

```javascript
          <p className="font-body-md text-body-md text-text-muted mt-2">{t('screens.vaults.totalAccumulated')} <span className="text-tertiary font-mono-data"><CountUp value={total} format={fmt} /></span></p>
```

Envolverla en una condición:

```javascript
          {!embedded && <p className="font-body-md text-body-md text-text-muted mt-2">{t('screens.vaults.totalAccumulated')} <span className="text-tertiary font-mono-data"><CountUp value={total} format={fmt} /></span></p>}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/StitchVaults.jsx
git commit -m "feat(finanzas): StitchVaults acepta prop embedded"
```

---

## Task 2: Prop `embedded` en StitchDebts

**Files:**
- Modify: `src/stitch/screens/StitchDebts.jsx`

**Contexto:** Mismo patrón. El `<div>` raíz abre en [StitchDebts.jsx:64](../../../src/stitch/screens/StitchDebts.jsx#L64); el total de header está en [StitchDebts.jsx:72](../../../src/stitch/screens/StitchDebts.jsx#L72).

- [ ] **Step 1: Añadir el prop a la firma**

En [StitchDebts.jsx:20](../../../src/stitch/screens/StitchDebts.jsx#L20):

```javascript
export default function StitchDebts({ embedded = false }) {
```

- [ ] **Step 2: Envolver el return según `embedded`**

Cambiar la apertura del `return` (líneas 63-64):

De:
```javascript
  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
```

A:
```javascript
  const wrapperClass = embedded ? '' : 'p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full';
  return (
    <div className={wrapperClass}>
```

(El `</div>` de cierre del wrapper no cambia — sigue siendo `</div>`.)

- [ ] **Step 3: Ocultar la línea de total cuando `embedded`**

En [StitchDebts.jsx:72](../../../src/stitch/screens/StitchDebts.jsx#L72):

```javascript
          <p className="font-body-md text-body-md text-text-muted mt-sm">{t('screens.debts.totalActiveDebt')} <span className="text-accent-error font-mono-data"><CountUp value={totalDebt} format={fmt} /></span></p>
```

Envolverla:

```javascript
          {!embedded && <p className="font-body-md text-body-md text-text-muted mt-sm">{t('screens.debts.totalActiveDebt')} <span className="text-accent-error font-mono-data"><CountUp value={totalDebt} format={fmt} /></span></p>}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/StitchDebts.jsx
git commit -m "feat(finanzas): StitchDebts acepta prop embedded"
```

---

## Task 3: Prop `embedded` en StitchCards

**Files:**
- Modify: `src/stitch/screens/StitchCards.jsx`

**Contexto:** Cards NO tiene línea de total en su header (solo subtítulo), así que solo se ajusta el wrapper. El `<div>` raíz abre en [StitchCards.jsx:46](../../../src/stitch/screens/StitchCards.jsx#L46).

- [ ] **Step 1: Añadir el prop a la firma**

En [StitchCards.jsx:17](../../../src/stitch/screens/StitchCards.jsx#L17):

```javascript
export default function StitchCards({ embedded = false }) {
```

- [ ] **Step 2: Envolver el return según `embedded`**

Cambiar la apertura del `return` (líneas 45-46):

De:
```javascript
  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
```

A:
```javascript
  const wrapperClass = embedded ? '' : 'p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full';
  return (
    <div className={wrapperClass}>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/screens/StitchCards.jsx
git commit -m "feat(finanzas): StitchCards acepta prop embedded"
```

---

## Task 4: Claves i18n nuevas

**Files:**
- Modify: `src/i18n/translations.js`

**Contexto:** El bloque `nav:` (es) está cerca de [translations.js:166](../../../src/i18n/translations.js#L166) (`savings/debts/creditCards`). Hay que añadir `nav.finances` y un bloque `finances` con los rótulos del resumen, en AMBOS idiomas.

- [ ] **Step 1: Añadir `nav.finances` en español**

Localizar el bloque `nav:` español (donde están `savings: 'Ahorros'`, `debts: 'Deudas'`, `creditCards: 'Tarjetas'`). Añadir:

```javascript
      finances: 'Mis finanzas',
```

- [ ] **Step 2: Añadir `nav.finances` en inglés**

En el bloque `nav:` inglés (el segundo, donde están las traducciones EN de savings/debts/creditCards):

```javascript
      finances: 'My finances',
```

- [ ] **Step 3: Añadir el bloque `finances` (es)**

Junto a otros bloques de pantalla del idioma español (p. ej. después del bloque `dashboard`), añadir:

```javascript
    finances: {
      title: 'Mis finanzas',
      netWorth: 'Patrimonio neto',
      cash: 'Efectivo',
      savings: 'Ahorro',
      debts: 'Deudas',
      tabSavings: 'Ahorros',
      tabDebts: 'Deudas',
      tabCards: 'Tarjetas',
    },
```

- [ ] **Step 4: Añadir el bloque `finances` (en)**

En el idioma inglés, el bloque equivalente:

```javascript
    finances: {
      title: 'My finances',
      netWorth: 'Net worth',
      cash: 'Cash',
      savings: 'Savings',
      debts: 'Debts',
      tabSavings: 'Savings',
      tabDebts: 'Debts',
      tabCards: 'Cards',
    },
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build OK (JS de translations parsea sin error de coma).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/translations.js
git commit -m "feat(i18n): claves de Mis finanzas (nav + resumen + tabs)"
```

---

## Task 5: Componente `PatrimonioSummary`

**Files:**
- Create: `src/stitch/screens/finances/PatrimonioSummary.jsx`

**Contexto:** Resumen fijo. Reusa: `getLiquidCash` (de `dashboard/selectors`), `getTotalSaved`/`getTotalDebt` (stores), `initialCashBalance` (prefs), `CountUp`, `formatCurrency`. Patrón de los stores: ver `StitchVaults.jsx` (cómo se leen `goals`, `getTotalSaved`).

- [ ] **Step 1: Crear el componente**

Crear `src/stitch/screens/finances/PatrimonioSummary.jsx`:

```javascript
// Resumen de patrimonio: neto (efectivo + ahorro − deudas) + las 3 bolsas. Reusa
// los selectores/stores existentes; cero lógica de cálculo nueva. Es el ancla de
// "Mis finanzas": los tabs de abajo muestran el DETALLE, no estos totales.
import { useMemo } from 'react';
import CountUp from '../../CountUp';
import useTransactionStore from '../../../stores/useTransactionStore';
import useCreditCardStore from '../../../stores/useCreditCardStore';
import useSavingsStore from '../../../stores/useSavingsStore';
import useDebtStore from '../../../stores/useDebtStore';
import usePrefsStore from '../../../stores/usePrefsStore';
import { getLiquidCash } from '../dashboard/selectors';
import { useI18n } from '../../../contexts/I18nContext';
import { formatCurrency } from '../../../utils/formatters';

const fmt = (n) => formatCurrency(n);

export default function PatrimonioSummary() {
  const { t } = useI18n();
  const transactions = useTransactionStore((s) => s.transactions);
  const cards = useCreditCardStore((s) => s.cards);
  const initialCashBalance = usePrefsStore((s) => s.initialCashBalance);
  const getTotalSaved = useSavingsStore((s) => s.getTotalSaved);
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);

  const cash = useMemo(() => getLiquidCash(transactions, initialCashBalance, cards), [transactions, initialCashBalance, cards]);
  const savings = getTotalSaved();
  const debts = getTotalDebt();
  const netWorth = cash + savings - debts;

  const bolsas = [
    { label: t('finances.cash'), value: cash, cls: 'text-on-surface' },
    { label: t('finances.savings'), value: savings, cls: 'text-secondary' },
    { label: t('finances.debts'), value: debts, cls: 'text-accent-error', sign: '−' },
  ];

  return (
    <div className="glass-card rounded-lg inner-glow p-lg mb-lg">
      <div className="font-mono-data text-mono-data text-text-muted uppercase mb-xs">{t('finances.netWorth')}</div>
      <div className={`font-hero-headline text-[40px] sm:text-[48px] tracking-tighter leading-none tabular-nums ${netWorth >= 0 ? 'text-on-surface' : 'text-accent-error'}`}>
        <CountUp value={netWorth} format={fmt} />
      </div>
      <div className="flex flex-wrap gap-x-xl gap-y-sm mt-md">
        {bolsas.map((b) => (
          <div key={b.label} className="flex flex-col">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{b.label}</span>
            <span className={`font-headline-md text-[18px] tracking-tight tabular-nums ${b.cls}`}>
              {b.sign || ''}<CountUp value={b.value} format={fmt} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

> Verificar antes de implementar: que `getLiquidCash` se exporta desde `dashboard/selectors` (sí), y que `usePrefsStore` expone `initialCashBalance` (sí). Si `font-hero-headline` se ve demasiado grande en la celda, ajustar el tamaño; es estético.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK (el componente compila aunque aún no se monte).

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/finances/PatrimonioSummary.jsx
git commit -m "feat(finanzas): componente PatrimonioSummary (neto + 3 bolsas)"
```

---

## Task 6: Pantalla `StitchFinances` (shell + tabs)

**Files:**
- Create: `src/stitch/screens/StitchFinances.jsx`

**Contexto:** Orquesta summary + tabs + panel. Lee el tab inicial de `?tab=` con `useSearchParams`. Monta solo el panel activo (con `embedded`).

- [ ] **Step 1: Crear la pantalla**

Crear `src/stitch/screens/StitchFinances.jsx`:

```javascript
// Mis finanzas — unifica Patrimonio (resumen) + Ahorros/Deudas/Tarjetas (tabs).
// Cada panel es la pantalla existente con prop embedded (sin su <div> raíz ni su
// total de header: el total vive en el resumen). Solo se monta el panel activo.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PatrimonioSummary from './finances/PatrimonioSummary';
import StitchVaults from './StitchVaults';
import StitchDebts from './StitchDebts';
import StitchCards from './StitchCards';
import { useI18n } from '../../contexts/I18nContext';
import { EASE_OUT } from '../motionTokens';

const TABS = ['vaults', 'debts', 'cards'];

export default function StitchFinances() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [params] = useSearchParams();
  const initial = TABS.includes(params.get('tab')) ? params.get('tab') : 'vaults';
  const [tab, setTab] = useState(initial);

  const tabLabels = {
    vaults: t('finances.tabSavings'),
    debts: t('finances.tabDebts'),
    cards: t('finances.tabCards'),
  };

  return (
    <div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">
      <h1 className="sr-only">{t('finances.title')}</h1>
      <PatrimonioSummary />

      {/* Tabs */}
      <div className="flex gap-xs border-b border-border-subtle mb-lg">
        {TABS.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-md py-sm font-label-sm text-label-sm uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </div>

      {/* Panel activo (solo se monta uno). Fade/scale suave al cambiar. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduced ? false : { opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          {tab === 'vaults' && <StitchVaults embedded />}
          {tab === 'debts' && <StitchDebts embedded />}
          {tab === 'cards' && <StitchCards embedded />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

> Verificar: `EASE_OUT` se exporta de `motionTokens.js` (sí, es `[0.23, 1, 0.32, 1]`). Confirmar el nombre del export de `useSearchParams` (react-router-dom v7 lo exporta).

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchFinances.jsx
git commit -m "feat(finanzas): pantalla StitchFinances (resumen + tabs)"
```

---

## Task 7: Ruta `/mis-finanzas` + redirecciones

**Files:**
- Modify: `src/stitch/StitchApp.jsx`

**Contexto:** `Navigate` ya está importado ([StitchApp.jsx:4](../../../src/stitch/StitchApp.jsx#L4)). Las rutas de las 3 pantallas están en [StitchApp.jsx:165-167](../../../src/stitch/StitchApp.jsx#L165-L167).

- [ ] **Step 1: Importar StitchFinances**

Junto a los imports de pantallas (cerca de [StitchApp.jsx:16-18](../../../src/stitch/StitchApp.jsx#L16-L18)):

```javascript
import StitchFinances from './screens/StitchFinances';
```

(Los imports de `StitchVaults`/`StitchDebts`/`StitchCards` se CONSERVAN: StitchFinances los usa.)

- [ ] **Step 2: Añadir la ruta nueva y redirigir las viejas**

Reemplazar las tres líneas de ruta ([StitchApp.jsx:165-167](../../../src/stitch/StitchApp.jsx#L165-L167)):

```javascript
          <Route path="tarjetas" element={<StitchCards />} />
          <Route path="deudas" element={<StitchDebts />} />
          <Route path="ahorros" element={<StitchVaults />} />
```

por:

```javascript
          <Route path="mis-finanzas" element={<StitchFinances />} />
          <Route path="ahorros" element={<Navigate to="/mis-finanzas?tab=vaults" replace />} />
          <Route path="deudas" element={<Navigate to="/mis-finanzas?tab=debts" replace />} />
          <Route path="tarjetas" element={<Navigate to="/mis-finanzas?tab=cards" replace />} />
```

- [ ] **Step 3: Verificar build + navegación**

Run: `npm run build`
Expected: build OK.

Run: `npm run dev`, navegar a `/ahorros` → debe redirigir a `/mis-finanzas?tab=vaults` y abrir el tab Ahorros. Igual `/deudas` y `/tarjetas`.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/StitchApp.jsx
git commit -m "feat(finanzas): ruta /mis-finanzas + redirigir rutas viejas"
```

---

## Task 8: Menú lateral (3 entradas → 1)

**Files:**
- Modify: `src/stitch/StitchShell.jsx`

**Contexto:** El array `NAV` está en `ShellInner` ([StitchShell.jsx](../../../src/stitch/StitchShell.jsx)). Hoy la sección "Activos" tiene Ahorros/Deudas/Tarjetas:

```javascript
    { section: t('nav.section.assets') },
    { to: '/ahorros', icon: 'account_balance_wallet', label: t('nav.savings') },
    { to: '/deudas', icon: 'trending_down', label: t('nav.debts') },
    { to: '/tarjetas', icon: 'credit_card', label: t('nav.creditCards') },
```

- [ ] **Step 1: Reemplazar las 3 entradas por una**

Cambiar ese bloque por:

```javascript
    { section: t('nav.section.assets') },
    { to: '/mis-finanzas', icon: 'account_balance_wallet', label: t('nav.finances') },
```

- [ ] **Step 2: Verificar build + visual**

Run: `npm run build`
Expected: build OK.

Inspección: el menú lateral muestra "Mis finanzas" en la sección Activos; ya no aparecen Ahorros/Deudas/Tarjetas como entradas separadas. Total de destinos: 6.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/StitchShell.jsx
git commit -m "feat(finanzas): menu lateral con una sola entrada 'Mis finanzas'"
```

---

## Task 9: Título de página

**Files:**
- Modify: `src/stitch/usePageTitle.js`

**Contexto:** El mapeo de rutas a claves de título está en [usePageTitle.js](../../../src/stitch/usePageTitle.js). Hoy tiene `/ahorros`, `/deudas`, `/tarjetas`.

- [ ] **Step 1: Añadir `/mis-finanzas` y limpiar las viejas**

En el objeto de mapeo, reemplazar las entradas de las 3 rutas viejas por:

```javascript
  '/mis-finanzas': 'nav.finances',
```

(Las rutas viejas redirigen, así que su título ya no se usa; quitarlas evita confusión. Si el archivo aún las tiene, eliminarlas.)

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/usePageTitle.js
git commit -m "feat(finanzas): titulo de pagina para /mis-finanzas"
```

---

## Task 10: Verificación final + tour

**Files:**
- Modify (si aplica): `src/stitch/tour/tourSteps.js`

- [ ] **Step 1: Verificar build + tests + lint**

Run: `npm run build`
Expected: build OK.

Run: `npm test`
Expected: verde (no se tocó lógica; payoff/projection/selectors siguen pasando).

Run: `npx eslint src/stitch/screens/StitchFinances.jsx src/stitch/screens/finances/PatrimonioSummary.jsx src/stitch/screens/StitchVaults.jsx src/stitch/screens/StitchDebts.jsx src/stitch/screens/StitchCards.jsx src/stitch/StitchApp.jsx src/stitch/StitchShell.jsx`
Expected: sin errores.

- [ ] **Step 2: Revisar el tour**

Buscar en [tourSteps.js](../../../src/stitch/tour/tourSteps.js) anclas a `vaults-new`, `debts-new`, `cards-new`, o navegación a `/ahorros`/`/deudas`/`/tarjetas`:

```bash
grep -nE "vaults-new|debts-new|cards-new|/ahorros|/deudas|/tarjetas" src/stitch/tour/tourSteps.js
```

Si hay pasos que navegan a esas rutas: como redirigen a `/mis-finanzas?tab=...`, deberían seguir funcionando (el ancla `data-tour` vive en el panel, que se monta dentro del tab). Si un paso queda roto (el ancla no está visible porque el tab no está activo), ajustar el paso para que apunte a `/mis-finanzas` con el tab correcto, o quitarlo. Documentar el ajuste en el commit.

> Si el grep no devuelve nada, no hay nada que tocar en el tour.

- [ ] **Step 3: Inspección visual en demo**

Run: `npm run dev`, Entrar como demo, ir a "Mis finanzas":
- El resumen muestra patrimonio neto + efectivo + ahorro + deudas, y cuadran con los datos.
- Los 3 tabs (Ahorros/Deudas/Tarjetas) cambian el contenido con fade suave.
- Cada panel NO repite su total (el total solo arriba en el resumen).
- Crear/editar/borrar/aportar/pagar en cada panel funciona (los modales abren y operan).
- El menú lateral tiene "Mis finanzas" (no las 3 separadas).
- `/ahorros`, `/deudas`, `/tarjetas` redirigen al tab correcto.

- [ ] **Step 4: Commit (si hubo ajuste de tour) + cierre**

```bash
git add -A
git commit -m "chore(finanzas): ajustes de tour y verificacion final"
```

(Si no hubo cambios, omitir este commit.)

---

## Verificación final (todas las tareas completas)

- [ ] `npm run build` pasa.
- [ ] `npm test` verde.
- [ ] ESLint limpio en los archivos tocados.
- [ ] "Mis finanzas" en el menú (6 destinos totales); Ahorros/Deudas/Tarjetas ya no separadas.
- [ ] Resumen de patrimonio correcto y cuadra con cada panel.
- [ ] Tabs cambian de panel con animación; cada panel conserva su CRUD/modales.
- [ ] Ningún total repetido: el detalle en su tab, los totales solo en el resumen.
- [ ] Rutas viejas redirigen al tab correcto.

---

## Self-Review (cobertura del spec)

- **Pantalla StitchFinances (shell + tabs)** → Task 6. ✅
- **PatrimonioSummary (neto + 3 bolsas, reusa selectores)** → Task 5. ✅
- **Paneles reusados vía `embedded` (sin div raíz ni total)** → Tasks 1-3. ✅
- **Cards NO pierde nada del header (no tiene total)** → Task 3 (solo wrapper). ✅
- **Ruta /mis-finanzas + redirecciones de las viejas** → Task 7. ✅
- **Menú 3→1 'Mis finanzas'** → Task 8. ✅
- **Título de página** → Task 9. ✅
- **i18n es/en (nav.finances + finances.*)** → Task 4. ✅
- **No-repetición: total solo en resumen, detalle en tabs** → Tasks 1-2 (quitar total) + Task 5 (total en resumen). ✅
- **Tarjetas por pagar NO en resumen → panel Cards conserva su total** → Task 3 (no se quita nada de Cards). ✅
- **Tour verificado** → Task 10 Step 2. ✅
- **Sin lógica nueva → sin tests unitarios nuevos; build+test+lint+visual** → Notas + Task 10. ✅

**Nota de ejecución:** varias tareas piden "verificar el export de X" (EASE_OUT, getLiquidCash, useSearchParams). Es deliberado: son contratos existentes que el implementador confirma al cablear, no placeholders de lógica.
