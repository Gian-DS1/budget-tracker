# Aviso de importación (solo RD) + Modo "usuario nuevo" local

**Fecha:** 2026-06-13
**Estado:** Diseño aprobado

Dos cambios independientes que comparten esta sesión:

1. Avisar que la importación de estados de cuenta solo está implementada para
   República Dominicana (los modelos de PDF con que se construyó la lógica).
2. Un modo local que simula una **cuenta recién creada** (vacía), para recorrer
   el viaje completo de un usuario nuevo —onboarding de moneda, tour, primeros
   datos— sin tocar Supabase y viéndose igual que en producción.

---

## Pieza 1 — Aviso "importar solo soporta RD"

### Objetivo
Dejar claro, antes y durante la importación, que la lectura de estados de cuenta
está calibrada para bancos dominicanos (Banco Popular y Qik) y que otros formatos
pueden no leerse bien.

### Cambios

**i18n** (`src/i18n/translations.js`, bloques `es` y `en`):
- Reescribir `banksSupported`:
  - es: `'Solo bancos de Rep. Dominicana (B. Popular, Qik)'`
  - en: `'Dominican Republic banks only (B. Popular, Qik)'`
- Nueva clave `importRdNotice` (banner del modal):
  - es: `'Esta función está calibrada para estados de cuenta de Rep. Dominicana. Otros formatos pueden no leerse correctamente.'`
  - en: `'This feature is calibrated for Dominican Republic bank statements. Other formats may not parse correctly.'`

**Tile de Ajustes** (`src/stitch/screens/StitchSettings.jsx`, ~línea 252):
- El tile "Importar Estado de Cuenta (PDF)" ya usa `banksSupported` como
  descripción cuando no está en demo. Al reescribir la clave, el tile queda
  avisado sin cambios estructurales. No se añade subtexto extra para no recargar
  la tarjeta; el banner del modal cubre el detalle largo.

**Modal de importación** (`src/stitch/screens/StatementImportModal.jsx`):
- Añadir un banner informativo dentro del header del modal (debajo del párrafo
  "Banco detectado…"), reutilizando el patrón visual del aviso de demo en
  Ajustes:
  ```jsx
  <div className="flex items-start gap-sm mt-sm px-md py-sm rounded bg-secondary/10 border border-secondary/30">
    <MS name="info" className="!text-[16px] text-secondary shrink-0 mt-[1px]" />
    <span className="font-mono-data text-mono-data text-secondary normal-case tracking-normal">
      {t('screens.settings.importRdNotice')}
    </span>
  </div>
  ```
- Requiere importar `MS` en el modal (hoy no lo usa).

### Sin cambios
Nada de la lógica de parseo, matching ni importación cambia. Es texto + un `<div>`.

---

## Pieza 2 — Modo "usuario nuevo" (cuenta vacía, interactivo, local)

### Objetivo
Permitir entrar, en localhost, a una cuenta **recién creada y vacía** que se
comporte exactamente como un registro real nuevo: onboarding de moneda
bloqueante → tour automático → estados vacíos en todas las pantallas →
capacidad de crear los primeros datos (categoría, transacción, meta, etc.) en
memoria. Todo local, sin Supabase, idéntico a producción.

### Contexto del código existente (hallazgos clave)

- **`isDemoActive()` es el guardián universal.** Los stores (`usePrefsStore`:
  `setCurrency`/`setTutorialSeen`/`setBudgetLevel`, y los mutadores de
  `demoMode.js`) usan `isDemoActive()` para decidir "solo caché local, no toques
  Supabase". Por lo tanto **el modo fresh DEBE hacer que `isDemoActive()`
  devuelva `true`**, o esos paths intentarían escribir a Supabase.
- **El onboarding de moneda se salta en demo** vía `!demo` en
  `StitchApp.jsx:154` (`showCurrencyOnboarding = !demo && prefsLoaded && !currency`).
  El modo fresh **sí** debe mostrarlo.
- **El auto-arranque del tour ya es correcto** (`StitchShell.jsx` `TourAutoStart`):
  espera `prefsLoaded` y `currency` no nula, luego arranca si `!tutorialSeen`.
  En fresh: `currency` arranca `null` → onboarding lo resuelve → el tour arranca
  solo. **No hay que tocar el tour.**
- **`TourProvider.start()`** fuerza `enterDemo()` solo si no hay datos **y**
  `!isDemoActive()`. Como en fresh `isDemoActive()` será `true`, **no** forzará
  el demo establecido; el tour correrá sobre la cuenta vacía. Correcto.
- **`usePrefsStore` persiste `currency`/`tutorialSeen` en sessionStorage**
  (`fintrack-prefs-cache`). Si en la misma sesión se entró antes al demo
  establecido (que fija `currency:'DOP'` y posiblemente `tutorialSeen:true`), el
  caché contaminaría el modo fresh. El seeding fresh debe **forzar el reset** de
  esos valores.

### Arquitectura

Se introduce un **flag hermano** del demo. Distinguimos dos sub-modos:

| Concepto | Flag sessionStorage | Significado |
|---|---|---|
| Demo establecido | `fintrack-demo-mode` | Usuario con 6 meses de datos (existente). |
| Usuario nuevo (fresh) | `fintrack-fresh-mode` | Cuenta vacía recién creada (nuevo). |

**`isDemoActive()` pasa a devolver `true` para cualquiera de los dos** (es el
guardián de "no toques Supabase / aplica en memoria"). Se añade un helper
específico `isFreshActive()` para los dos únicos lugares que necesitan
distinguir: el seeding y el gate de onboarding.

### Cambios

**`src/stitch/demoMode.js`:**
- Nueva constante `FRESH_FLAG = 'fintrack-fresh-mode'`.
- `isFreshActive()`: `isLocalhost() && sessionStorage.getItem(FRESH_FLAG) === '1'`.
- Renombrar internamente el flag existente a `DEMO_FLAG` (valor sin cambios:
  `'fintrack-demo-mode'`) por claridad.
- **`isDemoActive()`** pasa a:
  `isLocalhost() && (sessionStorage.getItem(DEMO_FLAG) === '1' || sessionStorage.getItem(FRESH_FLAG) === '1')`.
  Así todo el código que ya chequea `isDemoActive()` cubre ambos modos sin
  cambios. (Verificar consumidores: `StitchApp`, `StitchShell`, `AccountMenu`,
  `usePrefsStore`, `TourProvider`, `StitchSettings`.)
- `seedFreshStores()`: siembra **todos los stores vacíos** y resetea prefs:
  ```js
  useCategoryStore.setState({ categories: [], loading: false });
  useTransactionStore.setState({ transactions: [], loading: false });
  useBudgetStore.setState({ budgets: [], loading: false });
  useSavingsStore.setState({ goals: [], contributions: [], loading: false });
  useDebtStore.setState({ debts: [], payments: [], loading: false });
  useCreditCardStore.setState({ cards: [], loading: false });
  // Reset de prefs para que arranque como usuario nuevo de verdad:
  usePrefsStore.setState({ currency: null, tutorialSeen: false, budgetLevel: 'tracking', prefsLoaded: false });
  setRuntimeCurrency(null);
  ```
  (Sin categorías semilla: coherente con la globalización del núcleo, que las
  eliminó. Un usuario real nuevo arranca sin categorías.)
- `enterFresh()`: `if (!isLocalhost()) return false; sessionStorage.setItem(FRESH_FLAG, '1'); seedFreshStores(); return true;`
- `exitDemo()` limpia **ambos** flags (`DEMO_FLAG` y `FRESH_FLAG`).

**`src/stitch/StitchApp.jsx` (`AuthGate`):**
- Importar `isFreshActive`, `seedFreshStores`.
- `const fresh = isFreshActive();` `const demo = isDemoActive();` (demo cubre ambos).
- En el `useEffect` de seeding (`if (demo)`): si `fresh`, llamar
  `seedFreshStores`; si no, `seedDemoStores`. En ambos casos seguir llamando
  `fetchPrefs()` (en demo solo marca `prefsLoaded:true`).
  ```js
  if (demo) {
    queueMicrotask(fresh ? seedFreshStores : seedDemoStores);
    fetchPrefs();
  }
  ```
- **Gate de onboarding** — cambiar:
  ```js
  const showCurrencyOnboarding = !demo && prefsLoaded && !currency;
  ```
  por:
  ```js
  // El demo establecido salta el onboarding (ya trae moneda). El modo fresh y
  // los usuarios reales sin moneda SÍ lo ven.
  const showCurrencyOnboarding = (!demo || fresh) && prefsLoaded && !currency;
  ```

**`src/stitch/screens/StitchAuth.jsx`:**
- Importar `enterFresh` junto a `enterDemo`.
- En el bloque `isLocalhost()`, añadir un segundo botón debajo del de demo, mismo
  estilo (`border-dashed`), con su propia clave i18n:
  ```jsx
  <button onClick={() => { enterFresh(); window.location.reload(); }} ...>
    <MS name="person_add" className="text-[16px]" /> {t('auth.enterFresh')}
  </button>
  ```
  Y una nota corta `auth.freshNote` debajo.

**i18n** (`src/i18n/translations.js`):
- `auth.enterFresh` — es: `'Entrar como usuario nuevo'` / en: `'Enter as new user'`.
- `auth.freshNote` — es: `'Cuenta vacía local · onboarding y tour completos'` /
  en: `'Empty local account · full onboarding and tour'`.

### Flujo resultante (verificación manual)
1. En localhost, en la pantalla de acceso, pulsar "Entrar como usuario nuevo".
2. La app recarga; `seedFreshStores` deja todo vacío y `currency=null`.
3. `CurrencyOnboarding` aparece bloqueante (gate). Elegir una moneda.
4. `setCurrency` (en modo demo → solo caché local) fija la moneda; el gate
   desaparece.
5. Tras ~700 ms, el tour de 7 pasos arranca solo (`TourAutoStart`).
6. El tour, al no haber datos pero estar `isDemoActive()===true`, NO fuerza el
   demo establecido: corre sobre la cuenta vacía.
7. Cerrar/saltar el tour deja la cuenta vacía con sus estados vacíos.
8. Crear una categoría, una transacción, una meta: funciona en memoria (mutadores
   demo existentes, que ya operan bajo `isDemoActive()`).
9. Cerrar sesión (`AccountMenu`) llama `exitDemo()` → limpia ambos flags + recarga.

### Qué NO se toca
- El demo establecido actual (datos, seeding, comportamiento) queda intacto.
- La lógica del tour (`TourProvider`, `TourAutoStart`) no cambia.
- Ningún path que escriba a Supabase; nada de producción.
- Los mutadores en memoria de `demoMode.js` se reutilizan tal cual.

### Riesgos y mitigaciones
- **Caché de prefs contaminado** (entrar a demo establecido y luego a fresh en la
  misma sesión): mitigado porque `seedFreshStores` resetea explícitamente
  `currency`, `tutorialSeen`, `budgetLevel`, `prefsLoaded`.
- **Consumidores de `isDemoActive()` que asumían "demo establecido"**: revisar que
  ninguno dependa de que haya datos sembrados. (Los identificados —prefs, tour,
  account menu, settings— solo lo usan como "modo sin sesión / en memoria", que es
  exactamente lo que queremos para fresh.)
- **Seguridad**: ambos modos siguen restringidos a `isLocalhost()`; jamás se
  habilitan en producción. Sin cambios en esa garantía.
