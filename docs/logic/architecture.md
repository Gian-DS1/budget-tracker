# Arquitectura, flujo de datos y buenas prácticas (para reusar)

## Flujo de datos (de arriba a abajo)

```
Supabase (PostgreSQL + RLS)   ← fuente de verdad
        ↑↓  (supabase-js, por user_id)
Stores Zustand (+ persist)    ← estado de dominio en memoria + caché localStorage
        ↑↓  (hooks use*Store)
Páginas / Componentes React   ← componen stores + utils; estado de UI con useState
        ↑↓
utils/ (puro, testeable)      ← cálculos, formateo, recurrencia (sin React)
```

- **App.jsx** monta `AuthProvider` + `ShortcutsProvider`, define rutas. Si no hay `user`,
  renderiza `AuthPage` en cualquier ruta. Con `user`: dispara los `fetchX` de todos los
  stores + `materializeDue` (recurrentes) + `fetchRate`. Aplica `data-theme` al `<html>`.
- **Layout** = `Sidebar` + `Header` + `<Outlet/>`. `useKeyboardShortcuts` vive aquí (una vez).
- **Contextos:** `AuthContext` (sesión Supabase: signIn/signUp/Google/reset/signOut),
  `ShortcutsContext` (registro de callbacks de atajos por página, vía ref para evitar
  closures obsoletos).

## Patrones de estado (reglas que funcionaron bien)

1. **Un store por dominio**, con `persist` + `partialize` para caché de arranque en frío.
   Supabase es la verdad; el caché solo evita pantalla vacía al cargar.
2. **Optimistic update con rollback** donde la latencia se nota (ver `setBudget`): aplica al
   estado sync, persiste, y si falla restaura el snapshot previo + toast de error.
3. **Dedupe de concurrencia** con un flag `inFlight` a nivel de módulo para operaciones que no
   deben correr dos veces en paralelo (StrictMode/doble montaje): `fetchCategories`,
   `materializeDue`. Patrón: `if (xInFlight) return xInFlight; xInFlight = (async()=>{...})(); try{await} finally{xInFlight=null}`.
4. **Whitelist de columnas** en cada `updateX`: el form trae campos extra (id, createdAt,
   currency, isRecurring…) que Supabase rechazaría. Solo se mandan columnas reales.
5. **Acciones reversibles (Deshacer):** la acción destructiva captura lo borrado y la UI
   muestra un toast con botón que re-inserta TAL CUAL (sin recalcular). Ids nuevos están bien.
6. **Cross-store por `getState()`** (no hooks dentro de acciones): p.ej. `addTransaction` lee
   `useCreditCardStore.getState().cards`. El acoplamiento más delicado: pago de deuda ↔ tx.

## Reglas de negocio invariantes (repetir SIEMPRE)

- Montos en **DOP**; USD se convierte al guardar (tasa del día + 1.2% spread). `currency` DB = 'DOP'.
- **Cashback** solo gastos-con-tarjeta, sobre DOP; "efectivo" = amount − cashback para
  presupuesto/reportes; **bruto** para lo que debes a la tarjeta.
- Presupuesto base cero: clasificar por **tipo de categoría**; fijos/ahorro por PLAN,
  variables por GASTO real; "puedes gastar" = `getBudgetSummary`.
- Fechas como `YYYY-MM-DD` parseadas con `+'T00:00:00'` (medianoche LOCAL, GMT-4). Nunca UTC.
- Abono de tarjeta/deuda **liquida saldo, no es gasto** del presupuesto.

## Buenas prácticas de UI (del sistema actual — conservar al reconstruir)

- **Skeleton solo en carga en frío** (`loading && data.length===0`); nunca sobre datos cacheados.
- **Componentes UI reutilizables:** `Modal` (focus trap, Esc, backdrop, restore focus),
  `ConfirmDialog`, `EmptyState`, `Skeleton`, `CurrencyInput`, `InfoTooltip`, `TourGuide`.
- **Accesibilidad:** todo input con `<label>`; icon-buttons con `aria-label`; foco visible;
  contraste AA; color nunca como único signo (pares con +/−, icono o texto); touch ≥44px;
  `prefers-reduced-motion` respetado.
- **Números** en mono tabular (JetBrains Mono vía `unicode-range`), una sola línea.
- **Motion con propósito** (Framer Motion): señala cambio de estado, no decora. 150–350ms,
  transform/opacity, sin bounce. De-bounce de toggles de modal.
- **Atajos:** `Cmd/Ctrl+T` (nueva tx), `Cmd/Ctrl+E` (ajustes), `Ctrl+←/→` (mes). No
  secuestrar teclas mientras se escribe.
- **Toasts** (`react-hot-toast`) para feedback; toasts con `id` para operaciones en lote
  (loading→success/error sobre el mismo id).

## Import / Export

- Export CSV (papaparse) y Excel (xlsx). Import detecta `.csv`/`.xlsx`, valida `date`+`amount`,
  inserta con `bulkAddTransactions` (lotes de 100, recalcula cashback).

## Testing

- `vitest`. Tests puros sobre utils: `calculations.test.js`, `creditCards.test.js`,
  `recurrence.test.js`, `defaultCategories.test.js`, `creditCardCatalog.test.js`.
  **Al reconstruir, estos tests deben seguir verdes** (la lógica no cambia).

## Despliegue

- Push a `main` → Vercel despliega. Migraciones SQL en `supabase/` se corren a mano en el
  SQL Editor de Supabase. Serverless `/api/rate` (Banco Popular) provee la tasa real.

## Stack a preservar al reconstruir la UI

React 19 · React Router 7 (rutas protegidas) · Zustand 5 (+persist) · Supabase · Recharts ·
Framer Motion · Lucide · react-hot-toast · date-fns · papaparse/xlsx · driver.js (tour).
