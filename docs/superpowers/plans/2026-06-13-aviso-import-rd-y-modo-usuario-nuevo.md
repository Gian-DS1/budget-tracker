# Aviso import solo-RD + Modo "usuario nuevo" local — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avisar que la importación de estados de cuenta solo soporta República Dominicana, y añadir un modo local de "usuario nuevo" (cuenta vacía, interactivo) que recorra el onboarding y el tour igual que en producción.

**Architecture:** Pieza 1 es solo i18n + un banner en el modal de importación (sin lógica). Pieza 2 añade un flag hermano `fintrack-fresh-mode` en `demoMode.js`; `isDemoActive()` pasa a cubrir ambos flags (es el guardián universal de "no toques Supabase"), y un helper `isFreshActive()` distingue los dos únicos puntos que importan: el seeding (vacío) y el gate de onboarding (que en fresh SÍ se muestra).

**Tech Stack:** React 19, Zustand, react-router, framer-motion, Vitest, Tailwind (tokens Stitch). Tests con `npm test` (vitest run).

**Spec:** `docs/specs/2026-06-13-aviso-import-rd-y-modo-usuario-nuevo-design.md`

---

## File Structure

- `src/i18n/translations.js` — Modificar: reescribir `banksSupported`, añadir `importRdNotice` (sección `screens.settings`) y `enterFresh`/`freshNote` (sección `auth`), en bloques `es` y `en`.
- `src/stitch/demoMode.js` — Modificar: constantes de flags, `isDemoActive` (cubre ambos), nuevo `isFreshActive`, `seedFreshStores`, `enterFresh`, `exitDemo` (limpia ambos).
- `src/stitch/demoMode.test.js` — Modificar: añadir tests para `seedFreshStores` e `isFreshActive`/`isDemoActive`.
- `src/stitch/StitchApp.jsx` — Modificar: seeding condicional fresh/demo y gate de onboarding.
- `src/stitch/screens/StitchAuth.jsx` — Modificar: segundo botón "Entrar como usuario nuevo".
- `src/stitch/screens/StatementImportModal.jsx` — Modificar: banner informativo + import de `MS`.

---

## Pieza 1 — Aviso "importar solo soporta RD"

### Task 1: i18n del aviso RD

**Files:**
- Modify: `src/i18n/translations.js` (claves `banksSupported`, nueva `importRdNotice`; bloques `es` ~línea 800-816 y `en` ~línea 1709-1725)

- [ ] **Step 1: Reescribir `banksSupported` en el bloque `es`**

Buscar en el bloque `es` (sección `screens.settings`):
```js
        banksSupported: 'B. Popular y Qik soportados',
```
Reemplazar por:
```js
        banksSupported: 'Solo bancos de Rep. Dominicana (B. Popular, Qik)',
```

- [ ] **Step 2: Añadir `importRdNotice` en el bloque `es`**

Justo después de la línea `banksSupported` del bloque `es`, añadir:
```js
        importRdNotice: 'Esta función está calibrada para estados de cuenta de Rep. Dominicana. Otros formatos pueden no leerse correctamente.',
```

- [ ] **Step 3: Reescribir `banksSupported` en el bloque `en`**

Buscar en el bloque `en`:
```js
        banksSupported: 'B. Popular and Qik supported',
```
Reemplazar por:
```js
        banksSupported: 'Dominican Republic banks only (B. Popular, Qik)',
```

- [ ] **Step 4: Añadir `importRdNotice` en el bloque `en`**

Justo después de la línea `banksSupported` del bloque `en`, añadir:
```js
        importRdNotice: 'This feature is calibrated for Dominican Republic bank statements. Other formats may not parse correctly.',
```

- [ ] **Step 5: Verificar que el proyecto compila / lint pasa**

Run: `npm run lint`
Expected: sin errores nuevos en `translations.js`.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/translations.js
git commit -m "i18n: aviso de importacion solo-RD (banksSupported + importRdNotice)"
```

---

### Task 2: Banner RD dentro del modal de importación

**Files:**
- Modify: `src/stitch/screens/StatementImportModal.jsx` (import de `MS`; banner en el header)

- [ ] **Step 1: Importar `MS` en el modal**

En `src/stitch/screens/StatementImportModal.jsx`, tras la línea:
```js
import ModalShell from '../ModalShell';
```
añadir:
```js
import MS from '../MS';
```

- [ ] **Step 2: Añadir el banner en el header del modal**

Localizar el bloque del header (el `<div className="p-md sm:p-lg border-b border-border-subtle shrink-0">`) que contiene el `<h2>` y el `<p>` con "Banco detectado". Justo **después** del `</p>` de "Banco detectado" y **antes** del `</div>` que cierra ese header, insertar:
```jsx
            <div className="flex items-start gap-sm mt-sm px-md py-sm rounded bg-secondary/10 border border-secondary/30">
              <MS name="info" className="!text-[16px] text-secondary shrink-0 mt-[1px]" />
              <span className="font-mono-data text-mono-data text-secondary normal-case tracking-normal">
                {t('screens.settings.importRdNotice')}
              </span>
            </div>
```

- [ ] **Step 3: Verificar lint**

Run: `npm run lint`
Expected: sin errores nuevos en `StatementImportModal.jsx` (en particular, `MS` usado, no import sin usar).

- [ ] **Step 4: Commit**

```bash
git add src/stitch/screens/StatementImportModal.jsx
git commit -m "feat(import): banner aviso RD dentro del modal de importacion"
```

---

## Pieza 2 — Modo "usuario nuevo" (cuenta vacía local)

### Task 3: Flags y helpers en demoMode (con tests)

**Files:**
- Modify: `src/stitch/demoMode.js`
- Test: `src/stitch/demoMode.test.js`

- [ ] **Step 1: Escribir tests que fallan para `seedFreshStores` e `isFreshActive`**

En `src/stitch/demoMode.test.js`, añadir al final del archivo (tras el último `describe`) un nuevo import al inicio y un bloque de tests. Primero, ampliar el import existente de `./demoMode`:

Cambiar:
```js
import { demoCopyBudgetFromPreviousMonth } from './demoMode';
```
por:
```js
import { demoCopyBudgetFromPreviousMonth, seedFreshStores } from './demoMode';
```

Añadir imports de los stores que aún no están importados, justo debajo del import de `useBudgetStore`:
```js
import useCategoryStore from '../stores/useCategoryStore';
import useTransactionStore from '../stores/useTransactionStore';
import useSavingsStore from '../stores/useSavingsStore';
import useDebtStore from '../stores/useDebtStore';
import useCreditCardStore from '../stores/useCreditCardStore';
import usePrefsStore from '../stores/usePrefsStore';
```

Y al final del archivo añadir:
```js
describe('seedFreshStores', () => {
  it('deja todos los stores vacios y la moneda sin elegir', () => {
    // Ensuciar los stores primero para probar que se vacían.
    useCategoryStore.setState({ categories: [{ id: 'x', name: 'X' }], loading: true });
    useTransactionStore.setState({ transactions: [{ id: 't' }], loading: true });
    useSavingsStore.setState({ goals: [{ id: 'g' }], contributions: [{ id: 'c' }], loading: true });
    useDebtStore.setState({ debts: [{ id: 'd' }], payments: [{ id: 'p' }], loading: true });
    useCreditCardStore.setState({ cards: [{ id: 'cc' }], loading: true });
    usePrefsStore.setState({ currency: 'DOP', tutorialSeen: true });

    seedFreshStores();

    expect(useCategoryStore.getState().categories).toEqual([]);
    expect(useTransactionStore.getState().transactions).toEqual([]);
    expect(useSavingsStore.getState().goals).toEqual([]);
    expect(useSavingsStore.getState().contributions).toEqual([]);
    expect(useDebtStore.getState().debts).toEqual([]);
    expect(useDebtStore.getState().payments).toEqual([]);
    expect(useCreditCardStore.getState().cards).toEqual([]);
    expect(usePrefsStore.getState().currency).toBeNull();
    expect(usePrefsStore.getState().tutorialSeen).toBe(false);
    expect(useCategoryStore.getState().loading).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npm test -- demoMode`
Expected: FAIL — `seedFreshStores is not a function` (aún no existe).

- [ ] **Step 3: Implementar flags, helpers y `seedFreshStores` en demoMode.js**

En `src/stitch/demoMode.js`, localizar:
```js
const FLAG = 'fintrack-demo-mode';
```
Reemplazar por:
```js
const DEMO_FLAG = 'fintrack-demo-mode';
const FRESH_FLAG = 'fintrack-fresh-mode';
```

Reemplazar la función `isDemoActive`:
```js
export function isDemoActive() {
  return isLocalhost() && sessionStorage.getItem(FLAG) === '1';
}
```
por (cubre ambos flags — es el guardián de "no toques Supabase / aplica en memoria"):
```js
export function isDemoActive() {
  return isLocalhost() && (
    sessionStorage.getItem(DEMO_FLAG) === '1' ||
    sessionStorage.getItem(FRESH_FLAG) === '1'
  );
}

// Distingue el sub-modo "usuario nuevo" (cuenta vacia) del demo establecido.
// Solo lo usan el seeding y el gate de onboarding; el resto del código trata
// ambos modos igual vía isDemoActive().
export function isFreshActive() {
  return isLocalhost() && sessionStorage.getItem(FRESH_FLAG) === '1';
}
```

Reemplazar `exitDemo`:
```js
export function exitDemo() {
  sessionStorage.removeItem(FLAG);
}
```
por (limpia ambos):
```js
export function exitDemo() {
  sessionStorage.removeItem(DEMO_FLAG);
  sessionStorage.removeItem(FRESH_FLAG);
}
```

En `enterDemo`, reemplazar `sessionStorage.setItem(FLAG, '1');` por `sessionStorage.setItem(DEMO_FLAG, '1');`.

Justo después de `enterDemo` (tras su `}` de cierre), añadir `seedFreshStores` y `enterFresh`:
```js
// Siembra TODOS los stores vacíos y resetea las prefs, simulando una cuenta
// recién creada. currency=null dispara el onboarding; tutorialSeen=false hace
// que el tour arranque solo tras elegir moneda. prefsLoaded=false porque el
// effect de StitchApp llama fetchPrefs() que lo marca true.
export function seedFreshStores() {
  useCategoryStore.setState({ categories: [], loading: false });
  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false });
  useSavingsStore.setState({ goals: [], contributions: [], loading: false });
  useDebtStore.setState({ debts: [], payments: [], loading: false });
  useCreditCardStore.setState({ cards: [], loading: false });
  usePrefsStore.setState({ currency: null, tutorialSeen: false, budgetLevel: 'tracking', prefsLoaded: false });
  setRuntimeCurrency(null);
}

// Activa el modo "usuario nuevo": marca el flag y siembra los stores vacíos.
export function enterFresh() {
  if (!isLocalhost()) return false;
  sessionStorage.setItem(FRESH_FLAG, '1');
  seedFreshStores();
  return true;
}
```

(Nota: `useCategoryStore`, `useTransactionStore`, `useBudgetStore`, `useSavingsStore`, `useDebtStore`, `useCreditCardStore`, `usePrefsStore` y `setRuntimeCurrency` ya están importados al inicio de `demoMode.js`.)

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npm test -- demoMode`
Expected: PASS (incluidos los tests previos de `demoCopyBudgetFromPreviousMonth`).

- [ ] **Step 5: Verificar lint**

Run: `npm run lint`
Expected: sin errores nuevos (sin `FLAG` huérfano sin usar).

- [ ] **Step 6: Commit**

```bash
git add src/stitch/demoMode.js src/stitch/demoMode.test.js
git commit -m "feat(demo): modo usuario-nuevo (seedFreshStores, isFreshActive, enterFresh)"
```

---

### Task 4: Seeding y gate de onboarding en StitchApp

**Files:**
- Modify: `src/stitch/StitchApp.jsx`

- [ ] **Step 1: Ampliar el import de demoMode**

En `src/stitch/StitchApp.jsx`, localizar:
```js
import { isDemoActive, seedDemoStores } from './demoMode';
```
Reemplazar por:
```js
import { isDemoActive, isFreshActive, seedDemoStores, seedFreshStores } from './demoMode';
```

- [ ] **Step 2: Calcular `fresh` junto a `demo` en AuthGate**

Localizar dentro de `AuthGate`:
```js
  const demo = isDemoActive();
  const authedUser = user || (demo ? { id: 'demo', email: 'demo@local' } : null);
```
Reemplazar por:
```js
  const demo = isDemoActive();
  const fresh = isFreshActive();
  const authedUser = user || (demo ? { id: 'demo', email: 'demo@local' } : null);
```

- [ ] **Step 3: Sembrar fresh o demo según el sub-modo**

Localizar el effect de seeding:
```js
  useEffect(() => {
    if (demo) {
      queueMicrotask(seedDemoStores);
      // En demo no corre el effect de fetches (no hay user real); fetchPrefs marca
      // prefsLoaded para que el auto-arranque del tutorial pueda decidir.
      fetchPrefs();
    }
  }, [demo, fetchPrefs]);
```
Reemplazar por:
```js
  useEffect(() => {
    if (demo) {
      queueMicrotask(fresh ? seedFreshStores : seedDemoStores);
      // En demo no corre el effect de fetches (no hay user real); fetchPrefs marca
      // prefsLoaded para que el auto-arranque del tutorial pueda decidir.
      fetchPrefs();
    }
  }, [demo, fresh, fetchPrefs]);
```

- [ ] **Step 4: Mostrar el onboarding en modo fresh**

Localizar:
```js
  // Gate de moneda: usuario real sin moneda elegida ve el onboarding bloqueante.
  const showCurrencyOnboarding = !demo && prefsLoaded && !currency;
```
Reemplazar por:
```js
  // Gate de moneda: usuario real y modo "usuario nuevo" (fresh) ven el onboarding
  // bloqueante. El demo establecido lo salta (ya trae moneda sembrada).
  const showCurrencyOnboarding = (!demo || fresh) && prefsLoaded && !currency;
```

- [ ] **Step 5: Verificar lint**

Run: `npm run lint`
Expected: sin errores nuevos en `StitchApp.jsx`.

- [ ] **Step 6: Commit**

```bash
git add src/stitch/StitchApp.jsx
git commit -m "feat(app): sembrar cuenta vacia y mostrar onboarding en modo usuario-nuevo"
```

---

### Task 5: Botón "Entrar como usuario nuevo" en StitchAuth + i18n

**Files:**
- Modify: `src/stitch/screens/StitchAuth.jsx`
- Modify: `src/i18n/translations.js` (claves `auth.enterFresh`, `auth.freshNote`)

- [ ] **Step 1: Añadir claves i18n en el bloque `es`**

En `src/i18n/translations.js`, en la sección `auth` del bloque `es`, localizar `enterDemo` y `demoNote` (las claves del demo existente). Justo después de la línea `demoNote` del bloque `es`, añadir:
```js
        enterFresh: 'Entrar como usuario nuevo',
        freshNote: 'Cuenta vacía local · onboarding y tour completos',
```

- [ ] **Step 2: Añadir claves i18n en el bloque `en`**

En la sección `auth` del bloque `en`, justo después de la línea `demoNote` del bloque `en`, añadir:
```js
        enterFresh: 'Enter as new user',
        freshNote: 'Empty local account · full onboarding and tour',
```

- [ ] **Step 3: Importar `enterFresh` en StitchAuth**

En `src/stitch/screens/StitchAuth.jsx`, localizar:
```js
import { isLocalhost, enterDemo } from '../demoMode';
```
Reemplazar por:
```js
import { isLocalhost, enterDemo, enterFresh } from '../demoMode';
```

- [ ] **Step 4: Añadir el segundo botón en el bloque localhost**

Localizar el bloque `{isLocalhost() && (...)}` cerca del final del componente `StitchAuth`. Contiene el botón de demo (`onClick={() => { enterDemo(); window.location.reload(); }}`) y un `<p>` con `auth.demoNote`. Justo **después** de ese `<p>` de `demoNote` y **antes** del `</div>` que cierra el bloque, añadir:
```jsx
            <button
              onClick={() => { enterFresh(); window.location.reload(); }}
              className="w-full flex items-center justify-center gap-sm border border-dashed border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase tracking-widest py-sm rounded hover:bg-surface-container-high hover:text-on-surface transition-colors mt-sm"
            >
              <MS name="person_add" className="text-[16px]" /> {t('auth.enterFresh')}
            </button>
            <p className="text-center font-mono-data text-[9px] text-text-muted mt-xs uppercase">{t('auth.freshNote')}</p>
```

(Nota: `MS` ya está importado en `StitchAuth.jsx`.)

- [ ] **Step 5: Verificar lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add src/stitch/screens/StitchAuth.jsx src/i18n/translations.js
git commit -m "feat(auth): boton 'Entrar como usuario nuevo' en localhost"
```

---

### Task 6: Verificación manual del flujo completo

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite de tests completa**

Run: `npm test`
Expected: PASS — todos los tests verdes.

- [ ] **Step 2: Lint global**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Arrancar dev y recorrer el flujo**

Run: `npm run dev`

En `http://localhost:5173` (o el puerto que indique vite), en la pantalla de acceso:
1. Pulsar **"Entrar como usuario nuevo"**.
2. Verificar: aparece el onboarding de moneda bloqueante (no se puede cerrar con Escape/click-fuera).
3. Elegir una moneda y confirmar → el gate desaparece.
4. Esperar ~1s → el tour de 7 pasos arranca solo.
5. Verificar que el tour corre sobre la cuenta **vacía** (no aparecen los 6 meses de datos del demo establecido).
6. Saltar/terminar el tour → dashboard y demás pantallas muestran sus **estados vacíos**.
7. Crear una categoría y una transacción → se ven en memoria (sin errores de Supabase en consola).
8. Abrir Ajustes → el tile de importar PDF dice "Solo bancos de Rep. Dominicana (B. Popular, Qik)".
9. Cerrar sesión desde el menú de cuenta → recarga y vuelve a la pantalla de acceso (flags limpiados).

- [ ] **Step 4: (regresión) Verificar que el demo establecido sigue intacto**

Volver a la pantalla de acceso, pulsar **"Entrar como demo"** (el existente):
- Verificar que aparece con los 6 meses de datos, sin onboarding de moneda, como antes.

---

## Self-Review

**Spec coverage:**
- Pieza 1 tile → Task 1 (banksSupported). ✓
- Pieza 1 banner modal → Task 2. ✓
- Pieza 2 flags/`isDemoActive` cubre ambos/`isFreshActive`/`seedFreshStores`/`enterFresh`/`exitDemo` limpia ambos → Task 3. ✓
- Pieza 2 seeding condicional + gate onboarding (`!demo || fresh`) → Task 4. ✓
- Pieza 2 botón en StitchAuth + i18n → Task 5. ✓
- Reset de prefs contaminadas (riesgo del spec) → cubierto en `seedFreshStores` (Task 3) y testeado. ✓
- Tour automático sin tocar TourProvider → garantizado por el diseño (no hay task de tour, es intencional; verificado en Task 6 paso 4-5). ✓

**Placeholder scan:** sin TBD/TODO; todo el código a insertar está completo. ✓

**Type/símbolo consistency:** `DEMO_FLAG`/`FRESH_FLAG`, `isDemoActive`/`isFreshActive`, `seedFreshStores`/`enterFresh`, `seedDemoStores`/`enterDemo` usados consistentemente entre demoMode.js, StitchApp.jsx, StitchAuth.jsx y los tests. Claves i18n `importRdNotice`, `enterFresh`, `freshNote` consistentes entre translations.js y los componentes. ✓
