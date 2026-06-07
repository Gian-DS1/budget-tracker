# UI Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar duplicación de primitivas de formulario, centralizar colores de charts en un módulo, y agregar `focus-visible` global a botones y enlaces.

**Architecture:** Tres refactors independientes sin cambios de lógica de negocio: (1) un archivo `formUi.jsx` compartido del que re-exportan los tres `*Ui.jsx` existentes; (2) un módulo `chartTokens.js` con los 8 hex de Recharts; (3) una regla CSS en `stitch.css`. Ningún cambio visible para el usuario final excepto el ring de teclado (H4).

**Tech Stack:** React, Framer Motion (ya en uso), Recharts, Tailwind CSS, tokens CSS custom en `stitch.css`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `src/stitch/formUi.jsx` |
| Simplificar a re-exports | `src/stitch/screens/vaults/vaultsUi.jsx` |
| Simplificar a re-exports | `src/stitch/screens/cards/cardsUi.jsx` |
| Simplificar a re-exports | `src/stitch/screens/debts/debtsUi.jsx` |
| Modificar | `src/stitch/screens/StitchLedger.jsx` |
| Crear | `src/stitch/chartTokens.js` |
| Modificar | `src/stitch/screens/dashboard/FlowChart.jsx` |
| Modificar | `src/stitch/screens/reports/IncomeExpenseBars.jsx` |
| Modificar | `src/stitch/screens/reports/MonthComparison.jsx` |
| Modificar | `src/stitch/screens/dashboard/HealthRing.jsx` |
| Modificar | `src/stitch/screens/StitchReports.jsx` |
| Modificar | `src/stitch/screens/StitchCalendar.jsx` |
| Modificar | `src/stitch/screens/vaults/VaultItem.jsx` |
| Modificar | `src/stitch/stitch.css` |

---

## Task 1: Crear `formUi.jsx` y reemplazar los tres `*Ui.jsx`

**Files:**
- Create: `src/stitch/formUi.jsx`
- Modify: `src/stitch/screens/vaults/vaultsUi.jsx`
- Modify: `src/stitch/screens/cards/cardsUi.jsx`
- Modify: `src/stitch/screens/debts/debtsUi.jsx`

- [ ] **Step 1: Crear `src/stitch/formUi.jsx`**

Contenido completo del archivo nuevo:

```jsx
import MS from './MS';
import ModalShell from './ModalShell';

export const inputCls =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

export function Field({ label, children, hint, error, extra }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-sm">
        {label}{extra}
      </label>
      {children}
      {hint && <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{hint}</span>}
      {error && <span className="font-label-sm text-label-sm text-accent-error">Requerido</span>}
    </div>
  );
}

export function FormActions({ onCancel, label, disabled }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
      <button type="submit" disabled={disabled} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow disabled:opacity-40">{label}</button>
    </div>
  );
}

export function Modal({ title, onClose, children, width = '480px' }) {
  return (
    <ModalShell
      onClose={onClose}
      className="stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-h-[85vh] overflow-y-auto p-lg"
      style={{ maxWidth: width }}
    >
      {(requestClose) => (
        <>
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
            <button onClick={requestClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
          </div>
          {typeof children === 'function' ? children(requestClose) : children}
        </>
      )}
    </ModalShell>
  );
}
```

- [ ] **Step 2: Reemplazar `vaultsUi.jsx` con re-exports**

Reemplazar el contenido completo de `src/stitch/screens/vaults/vaultsUi.jsx`:

```jsx
export { inputCls, Field, FormActions, Modal } from '../../formUi';
```

- [ ] **Step 3: Reemplazar `cardsUi.jsx` con re-exports**

Reemplazar el contenido completo de `src/stitch/screens/cards/cardsUi.jsx`:

```jsx
export { inputCls, Field, FormActions, Modal } from '../../formUi';
```

- [ ] **Step 4: Reemplazar `debtsUi.jsx` con re-exports**

Reemplazar el contenido completo de `src/stitch/screens/debts/debtsUi.jsx`:

```jsx
export { inputCls, Field, FormActions, Modal } from '../../formUi';
```

- [ ] **Step 5: Verificar que la app compila sin errores**

```bash
npm run build 2>&1 | tail -20
```

Expected: sin errores de importación. Si hay error "Module not found", verificar que la ruta `../../formUi` sea correcta desde cada `*Ui.jsx` (vaults/cards/debts están en `src/stitch/screens/<screen>/`).

- [ ] **Step 6: Commit**

```bash
git add src/stitch/formUi.jsx src/stitch/screens/vaults/vaultsUi.jsx src/stitch/screens/cards/cardsUi.jsx src/stitch/screens/debts/debtsUi.jsx
git commit -m "refactor(stitch): crear formUi.jsx compartido y simplificar *Ui.jsx a re-exports"
```

---

## Task 2: Migrar `StitchLedger.jsx` a `formUi.jsx`

**Files:**
- Modify: `src/stitch/screens/StitchLedger.jsx:1-26` (imports) y `:622-651` (definiciones inline)

- [ ] **Step 1: Agregar import de `formUi` en `StitchLedger.jsx`**

En `src/stitch/screens/StitchLedger.jsx`, la línea 12 actualmente importa `ModalShell`:

```js
import ModalShell from '../ModalShell';
```

Reemplazarla por:

```js
import { inputCls, Field, FormActions, Modal } from '../formUi';
```

(Ya no se usa `ModalShell` directamente en StitchLedger — lo usa internamente `Modal` de `formUi`.)

- [ ] **Step 2: Eliminar las definiciones inline de `Field`, `Modal` e `inputCls` en StitchLedger**

Localizar y eliminar el bloque en `src/stitch/screens/StitchLedger.jsx` que contiene (alrededor de la línea 615–651):

```jsx
const inputCls = '...';   // ← eliminar

function Field({ label, error, extra, children }) {  // ← eliminar todo el bloque
  ...
}

function Modal({ title, onClose, children }) {       // ← eliminar todo el bloque
  ...
}
```

Estos tres ya vienen del import agregado en Step 1.

- [ ] **Step 3: Verificar que `FormActions` también se use desde `formUi` si existe en StitchLedger**

Buscar si `StitchLedger.jsx` define o usa `FormActions`:

```bash
grep -n "FormActions" src/stitch/screens/StitchLedger.jsx
```

Si hay una definición local, eliminarla también. Si solo aparece como uso (JSX), ya está cubierto por el import.

- [ ] **Step 4: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

Expected: sin errores. Si hay error en `StitchLedger`, es probable que `ModalShell` siga importado — verificar que el import fue reemplazado correctamente en Step 1.

- [ ] **Step 5: Commit**

```bash
git add src/stitch/screens/StitchLedger.jsx
git commit -m "refactor(stitch): StitchLedger usa formUi compartido, elimina primitivas inline"
```

---

## Task 3: Crear `chartTokens.js` y usarlo en todos los charts

**Files:**
- Create: `src/stitch/chartTokens.js`
- Modify: `src/stitch/screens/dashboard/FlowChart.jsx`
- Modify: `src/stitch/screens/reports/IncomeExpenseBars.jsx`
- Modify: `src/stitch/screens/reports/MonthComparison.jsx`
- Modify: `src/stitch/screens/dashboard/HealthRing.jsx`
- Modify: `src/stitch/screens/StitchReports.jsx`
- Modify: `src/stitch/screens/StitchCalendar.jsx`
- Modify: `src/stitch/screens/vaults/VaultItem.jsx`

- [ ] **Step 1: Crear `src/stitch/chartTokens.js`**

```js
// Hex que espeja los tokens CSS de stitch.css.
// Recharts no acepta var() — mantener sincronizado con los tokens.
export const CHART = {
  tertiary:  '#bdd200',  // --color-tertiary
  error:     '#ffb4ab',  // --color-error
  secondary: '#50d8e9',  // --color-secondary
  warning:   '#ffb689',  // --color-accent-warning
  muted:     '#9a9da3',  // --color-text-muted
  border:    '#232426',  // --color-border-subtle
  surface:   '#101112',  // surface oscuro
  outline:   '#454655',  // outline-variant
};
```

- [ ] **Step 2: Actualizar `FlowChart.jsx`**

En `src/stitch/screens/dashboard/FlowChart.jsx`:

Reemplazar las líneas 10–11:
```js
const INC = '#bdd200'; // tertiary (lima) — ingresos
const EXP = '#ffb4ab'; // accent-error (rojo) — gastos
```
por:
```js
import { CHART } from '../../chartTokens';
const INC = CHART.tertiary;
const EXP = CHART.error;
```

Luego reemplazar los hex sueltos en el JSX:
- `stroke="#101112"` → `stroke={CHART.surface}`
- `axisLine={{ stroke: '#232426' }}` → `axisLine={{ stroke: CHART.border }}`
- `tick={{ fill: '#9a9da3', ... }}` → `tick={{ fill: CHART.muted, ... }}` (hay dos: en XAxis y YAxis)
- `stroke="#454655"` (ReferenceLine y Tooltip cursor) → `stroke={CHART.outline}`

- [ ] **Step 3: Actualizar `IncomeExpenseBars.jsx`**

En `src/stitch/screens/reports/IncomeExpenseBars.jsx`, agregar al inicio:

```js
import { CHART } from '../../chartTokens';
```

Reemplazar:
- `fill="#bdd200"` → `fill={CHART.tertiary}`
- `fill="#ffb4ab"` → `fill={CHART.error}`
- `tick={{ fill: '#9a9da3', ... }}` → `tick={{ fill: CHART.muted, ... }}`
- `axisLine={{ stroke: '#232426' }}` → `axisLine={{ stroke: CHART.border }}`
- `wrapperStyle={{ ..., color: '#9a9da3' }}` → `wrapperStyle={{ ..., color: CHART.muted }}`

- [ ] **Step 4: Actualizar `MonthComparison.jsx`**

En `src/stitch/screens/reports/MonthComparison.jsx`, agregar al inicio:

```js
import { CHART } from '../../chartTokens';
```

Reemplazar en el JSX:
- `background: up ? '#ffb4ab' : '#bdd200'` → `background: up ? CHART.error : CHART.tertiary`

- [ ] **Step 5: Actualizar `HealthRing.jsx`**

En `src/stitch/screens/dashboard/HealthRing.jsx`, agregar al inicio:

```js
import { CHART } from '../../chartTokens';
```

Reemplazar la función `ringColor`:
```js
function ringColor(score) {
  if (score >= 80) return CHART.tertiary;
  if (score >= 60) return CHART.secondary;
  if (score >= 40) return CHART.warning;
  return CHART.error;
}
```

Reemplazar en el JSX:
- `background={{ fill: '#232426' }}` → `background={{ fill: CHART.border }}`

- [ ] **Step 6: Actualizar `StitchReports.jsx`**

En `src/stitch/screens/StitchReports.jsx`, agregar el import:

```js
import { CHART } from '../chartTokens';
```

Reemplazar la línea con `healthColor`:
```js
const healthColor = health.score >= 80 ? '#bdd200' : health.score >= 60 ? '#50d8e9' : health.score >= 40 ? '#ffb689' : '#ffb4ab';
```
por:
```js
const healthColor = health.score >= 80 ? CHART.tertiary : health.score >= 60 ? CHART.secondary : health.score >= 40 ? CHART.warning : CHART.error;
```

- [ ] **Step 7: Actualizar `StitchCalendar.jsx`**

En `src/stitch/screens/StitchCalendar.jsx`, agregar el import:

```js
import { CHART } from '../chartTokens';
```

Reemplazar el array `LEGEND`:
```js
const LEGEND = [
  { c: CHART.error, l: 'Deuda' }, { c: CHART.warning, l: 'Tarjeta' },
  { c: CHART.tertiary, l: 'Meta' }, { c: CHART.secondary, l: 'Recurrente' },
];
```

- [ ] **Step 8: Actualizar `VaultItem.jsx`**

En `src/stitch/screens/vaults/VaultItem.jsx`, agregar el import:

```js
import { CHART } from '../../../chartTokens';
```

Reemplazar las dos ocurrencias de `'#bdd200'` en el JSX:
- `style={proj.done ? { color: '#bdd200' } : undefined}` → `style={proj.done ? { color: CHART.tertiary } : undefined}`
- `background: proj.done ? '#bdd200' : (goal.color || '#bec2ff')` → `background: proj.done ? CHART.tertiary : (goal.color || '#bec2ff')`

(`goal.color || '#bec2ff'` es color de datos del usuario — no tocar.)

- [ ] **Step 9: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

Expected: sin errores. Si hay "Cannot find module '../../chartTokens'", verificar que la profundidad de ruta es correcta para cada archivo (los que están en `screens/dashboard/` usan `../../chartTokens`; los que están en `screens/` usan `../chartTokens`; VaultItem está en `screens/vaults/` y usa `../../../chartTokens`).

- [ ] **Step 10: Commit**

```bash
git add src/stitch/chartTokens.js src/stitch/screens/dashboard/FlowChart.jsx src/stitch/screens/reports/IncomeExpenseBars.jsx src/stitch/screens/reports/MonthComparison.jsx src/stitch/screens/dashboard/HealthRing.jsx src/stitch/screens/StitchReports.jsx src/stitch/screens/StitchCalendar.jsx src/stitch/screens/vaults/VaultItem.jsx
git commit -m "refactor(stitch): centralizar colores de charts en chartTokens.js"
```

---

## Task 4: `focus-visible` global en `stitch.css`

**Files:**
- Modify: `src/stitch/stitch.css` (al final del archivo, antes del cierre `}` de `@media (prefers-reduced-motion)`)

- [ ] **Step 1: Agregar la regla al final de `stitch.css`**

Al final de `src/stitch/stitch.css`, **después** del bloque `@media (prefers-reduced-motion: reduce)` que cierra en la línea 292, agregar:

```css

/* ── Focus visible — navegación por teclado (WCAG 2.4.7) ─────────────── */
.stitch-root button:focus-visible,
.stitch-root [role=button]:focus-visible,
.stitch-root a[href]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Verificar visualmente en el navegador**

Iniciar la app (`npm run dev`) y navegar con Tab por la app:
- Presionar Tab repetidamente: los botones deben mostrar un ring periwinkle (`var(--color-primary)`) de 2px cuando reciben foco.
- El ring no debe aparecer al hacer click con mouse (solo con teclado) — eso es el comportamiento nativo de `:focus-visible`.
- El `.stitch-check` (checkbox) ya tenía su propio ring en azul — verificar que no se pisó (tiene clase específica, no es un `<button>`).

- [ ] **Step 3: Commit**

```bash
git add src/stitch/stitch.css
git commit -m "a11y(stitch): focus-visible global para botones y enlaces (WCAG 2.4.7)"
```
