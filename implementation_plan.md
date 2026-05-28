# Optimización y Limpieza General — FinTrack RD

Auditoría completa del código fuente, eliminación de código basura, corrección de bugs, y mejoras estéticas de simetría visual en todas las páginas.

## Resumen de Hallazgos

### 🗑️ Código Basura / Archivos Muertos

| Hallazgo | Archivo | Acción |
|---|---|---|
| `App.css` es 100% código boilerplate de Vite (`.hero`, `#center`, `.ticks`, etc.) — no se usa en ningún componente | [App.css](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/App.css) | Eliminar |
| Línea en blanco duplicada (L61) | [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx#L61) | Limpiar |
| Mini-calendario del Dashboard tiene un cálculo de offset incorrecto (`getDay() || 7 - 1` → da 6 en vez de 0 el domingo) | [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx#L380) | Corregir lógica |
| `import useThemeStore` en TransactionsPage pero `globalSearchQuery` y `clearGlobalSearch` ya no existen en el store | [TransactionsPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/TransactionsPage.jsx#L7) | Verificar/Limpiar |
| Advertencia de build: `react-hot-toast` importada dinámicamente en stores pero estáticamente en páginas (ineficiente) | Stores | Convertir a importación estática en stores |

---

### 🐛 Bugs Potenciales

| Bug | Archivo | Impacto |
|---|---|---|
| Mini-calendario del Dashboard calcula offset de primer día incorrecto — muestra los días desfasados | [DashboardPage.jsx:L380](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx#L380) | Visual — calendario muestra actividad en días equivocados |
| `calendarDays` no está envuelto en `useMemo` en DashboardPage — se recalcula en cada render | [DashboardPage.jsx:L181](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx#L181) | Performance |

---

### 🎨 Mejoras Estéticas / Simetría

| Mejora | Archivo |
|---|---|
| Dashboard: El donut chart (distribución de gastos) tiene alturas diferentes a la barra chart — Unificar a la misma altura | [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx) |
| Dashboard: Mini-calendario header usa ['L','M','M','J','V','S','D'] en vez de los días completos importados del formatter | [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx#L375) |
| Feedback page: Los botones de tipo (Bug, Mejora, Comentario) podrían usar los mismos estilos de tabs que el resto de la app | [FeedbackPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/FeedbackPage.jsx) |

---

### ⚡ Optimizaciones

| Optimización | Archivo |
|---|---|
| Convertir `toast` de importación dinámica a estática en stores (elimina warning de build) | `useBudgetStore.js`, `useTransactionStore.js` |
| Envolver `calendarDays` en `useMemo` para evitar recálculo en cada render del Dashboard | [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx) |

---

## Proposed Changes

### Limpieza de archivos

#### [DELETE] [App.css](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/App.css)
Archivo boilerplate de Vite, no utilizado por ningún componente de la aplicación.

---

### Dashboard

#### [MODIFY] [DashboardPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/DashboardPage.jsx)

1. Corregir cálculo de offset del mini-calendario (L380)
2. Envolver `calendarDays` en `useMemo`
3. Unificar alturas de los charts (300px ambos)
4. Eliminar línea en blanco duplicada (L61)

---

### Stores (Toast Import Fix)

#### [MODIFY] [useBudgetStore.js](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/stores/useBudgetStore.js)
#### [MODIFY] [useTransactionStore.js](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/stores/useTransactionStore.js)

Cambiar `const { default: toast } = await import('react-hot-toast')` a importación estática `import toast from 'react-hot-toast'` para resolver la advertencia de `INEFFECTIVE_DYNAMIC_IMPORT`.

---

### TransactionsPage

#### [MODIFY] [TransactionsPage.jsx](file:///c:/Users/gianc/Documents/Proyectos/VScode/budget-tracker/src/pages/TransactionsPage.jsx)

Verificar si `globalSearchQuery` y `clearGlobalSearch` existen aún en el theme store; si no se usan, limpiar la importación y el `useEffect` muerto.

---

## Verification Plan

### Build automatizado
```bash
npm run build
```
Verificar que no haya errores ni warnings nuevos, y que el warning de `INEFFECTIVE_DYNAMIC_IMPORT` desaparezca.
