# UI Audit Fixes — Design Spec
Date: 2026-06-06

## Scope

Three residual inconsistencies encontradas en la auditoría visual de la app Stitch:

- **H2**: `inputCls`, `Field`, `FormActions`, `Modal` duplicados en 3 archivos (`vaultsUi.jsx`, `cardsUi.jsx`, `debtsUi.jsx`) y una 4ª variante local en `StitchLedger.jsx`.
- **H3**: Colores hex de charts hardcodeados en múltiples archivos, duplicando tokens CSS.
- **H4**: `focus-visible` ausente en botones y enlaces (solo existe en el checkbox).

**H1 ya resuelto**: `ModalShell.jsx` implementa la animación Emil completa (AnimatePresence, scale 0.96→1, backdrop fade, reduced-motion). No requiere cambios.

---

## H2 — Deduplicar primitivas de formulario modal

### Problema

`inputCls`, `Field`, `FormActions`, `Modal` están copiados byte-a-byte en:
- `src/stitch/screens/vaults/vaultsUi.jsx`
- `src/stitch/screens/cards/cardsUi.jsx`
- `src/stitch/screens/debts/debtsUi.jsx`

Y una variante ligeramente distinta existe inline en `StitchLedger.jsx:622-651` (`Field` con soporte de `error` y `extra`, `Modal` sin prop `width`).

### Diseño

Crear **`src/stitch/formUi.jsx`** — fuente única de verdad para estas primitivas:

```
export const inputCls = '...'
export function Field({ label, children, hint, error, extra })  // fusión de ambas variantes
export function FormActions({ onCancel, label, disabled })
export function Modal({ title, onClose, children, width = '480px' })
```

- `Field` absorbe los props `error` y `extra` de la variante de `StitchLedger` (los 3 `*Ui.jsx` nunca los usan, por lo que no es breaking — simplemente no los pasan).
- Los 3 `*Ui.jsx` pasan a re-exportar desde `formUi.jsx` para preservar compatibilidad con sus importadores actuales (los modales de cada screen siguen importando de `'../vaultsUi'`, etc. — no requieren cambios).
- `StitchLedger.jsx` reemplaza sus definiciones inline por imports de `formUi.jsx`.

### Archivos afectados

| Acción | Archivo |
|--------|---------|
| Crear | `src/stitch/formUi.jsx` |
| Reemplazar con re-exports | `src/stitch/screens/vaults/vaultsUi.jsx` |
| Reemplazar con re-exports | `src/stitch/screens/cards/cardsUi.jsx` |
| Reemplazar con re-exports | `src/stitch/screens/debts/debtsUi.jsx` |
| Eliminar definiciones inline, agregar imports | `src/stitch/screens/StitchLedger.jsx` |

---

## H3 — Centralizar colores de charts en `chartTokens.js`

### Problema

Recharts requiere strings (no `var(--token)`). Los hex que usa coinciden 1:1 con tokens CSS:

| Hex | Token CSS | Archivos |
|-----|-----------|---------|
| `#bdd200` | `--color-tertiary` | FlowChart, IncomeExpenseBars, MonthComparison, HealthRing, StitchReports, StitchCalendar, VaultItem |
| `#ffb4ab` | `--color-error` | FlowChart, IncomeExpenseBars, MonthComparison, HealthRing, StitchReports, StitchCalendar |
| `#9a9da3` | `--color-text-muted` | FlowChart, IncomeExpenseBars |
| `#232426` | `--color-border-subtle` | FlowChart, HealthRing, IncomeExpenseBars |
| `#101112` | surface oscuro | FlowChart |
| `#454655` | outline-variant | FlowChart |
| `#50d8e9` | `--color-secondary` | HealthRing, StitchReports |
| `#ffb689` | `--color-accent-warning` | HealthRing, StitchReports |

**No tocar**: `goal.color` / `d.color` / `c.color` (datos del usuario), SVGs de marca, Logo.

### Diseño

Crear **`src/stitch/chartTokens.js`**:

```js
// Hex que espeja los tokens CSS de stitch.css — Recharts no acepta var().
// Si cambias un token, actualiza aquí también.
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

Cada archivo que use estos hex los reemplaza por `CHART.tertiary`, etc.

### Archivos afectados

| Archivo | Constantes a reemplazar |
|---------|------------------------|
| Crear `src/stitch/chartTokens.js` | — |
| `screens/dashboard/FlowChart.jsx` | `INC`, `EXP`, axis/grid hex |
| `screens/reports/IncomeExpenseBars.jsx` | Bar fill, axis hex |
| `screens/reports/MonthComparison.jsx` | background color |
| `screens/dashboard/HealthRing.jsx` | función `scoreColor`, RadialBar bg |
| `screens/StitchReports.jsx` | `healthColor` inline |
| `screens/StitchCalendar.jsx` | leyenda `c` array |
| `screens/vaults/VaultItem.jsx` | color `proj.done` |

---

## H4 — `focus-visible` global en botones y enlaces

### Problema

Solo `stitch.css:185` tiene regla `focus-visible` (para `.stitch-check`). Los `<button>` genéricos y `<a href>` no tienen ring de teclado. Incumple WCAG 2.4.7.

### Diseño

Agregar una sola regla al final de `src/stitch/stitch.css`:

```css
.stitch-root button:focus-visible,
.stitch-root [role=button]:focus-visible,
.stitch-root a[href]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- Scoped a `.stitch-root` para no afectar partes fuera del tema.
- `outline-offset: 2px` evita que el ring solape el borde del elemento.
- Una regla, cubre toda la app.

---

## Plan de commits

1. `refactor(stitch): crear formUi.jsx compartido y deduplicar *Ui.jsx + StitchLedger`
2. `refactor(stitch): centralizar colores de charts en chartTokens.js`
3. `a11y(stitch): focus-visible global para botones y enlaces`
