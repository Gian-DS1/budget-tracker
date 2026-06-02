# Páginas — estado, handlers, validaciones, edge cases

> 13 páginas en `src/pages/`. Casi todas componen stores + utils ya documentados.
> Rutas protegidas por sesión (`App.jsx`): sin `user` ⇒ solo `AuthPage`. Layout
> (`Sidebar` + `Header` + `Outlet`) envuelve las páginas internas.

## Atajos de teclado globales (`useKeyboardShortcuts`, vive en Layout)

- `Cmd/Ctrl+T` → `cb.newTransaction()` si la página lo registró, si no navega a `/transacciones`.
- `Cmd/Ctrl+E` → navega a `/ajustes`.
- `Ctrl+←/→` → `cb.previousMonth/nextMonth()` si la página los registró y el foco NO está en
  un input. No secuestra teclas mientras se escribe. `Escape` lo maneja cada Modal.
- Las páginas registran acciones con `usePageShortcuts({ newTransaction, previousMonth, nextMonth })`.

## Patrones transversales

- **Skeleton solo en carga en frío:** `showSkeleton = loading && data.length === 0`. Nunca
  sobre datos cacheados.
- **Empty states** con `<EmptyState icon title description action>`.
- **Modales** con `components/ui/Modal` (focus trap, Esc, backdrop, restore focus).
- **Confirmaciones destructivas** con `<ConfirmDialog>`.
- **Montos** con `<CurrencyInput>`; toda cifra vía `formatCurrency`. Toasts con `react-hot-toast`.
- **Deshacer:** acciones destructivas guardan lo borrado y ofrecen toast con botón "Deshacer".

---

## DashboardPage — `/`
Stores: TODOS (transactions, savings, debt, category, budget, plan, creditCard, rate).
Lee `getBudgetSummary`, `getMonthlySavingCapacity`, `getCardBalances`. Estado: `selectedDay`
(modal de transacciones del día), navegación por mes (`Ctrl+←/→`). KPIs: "puedes gastar",
flujo del mes (ingresos lima / gastos coral con signo), patrimonio neto, ahorro/deuda/tarjetas,
readiness financiero. Charts: barras 6 meses (Ingresos/Gastos) + pie por categoría
(`groupByCategory`, tope 6 + "Otros"). `showSkeleton` → `SkeletonDashboard`.

## TransactionsPage — `/transacciones`
Stores: transaction, category, creditCard, rate, recurring. **El más interactivo.**
- Estado: form (date, amount, type, categoryId, cardId, description, notes, currency,
  isRecurring, recurrencePattern), `formErrors`, filtros (search, type, category, dateFrom/To),
  sort (`sortField/Dir`), selección bulk (`selectedIds`), modales (form, recurrentes, bulk-delete).
- Handlers: `handleSubmit` (valida amount>0 + categoría; USD→DOP lo hace el store),
  `handleDescriptionChange` (auto-categoriza vía `autoCategorize`, set type), edit, delete con
  undo (`handleDeleteWithUndo` → `deleteTransaction` + toast "Deshacer" → `restoreTransaction`),
  bulk delete/assign card/assign category, `toggleSort`, `clearFilters`.
- Atajo: `Cmd/Ctrl+T` abre el form. Empty/loading: `SkeletonTable` / `EmptyState`.
- Filtro `UNCATEGORIZED = '__uncategorized__'` para txs sin categoría (o categoría borrada).

## BudgetPage — `/presupuesto`
Stores: budget, category, debt, rate, transaction. Utils: `getBudgetSummary` (núcleo),
`constants`. Estado: mes activo, edición inline de estimados (`handleEstimatedChange`
con debounce vía `handleBlur` → `setBudget` optimista). Handlers: `handleCopyPrevious`
(`copyBudgetFromPreviousMonth`), `handleAutoSuggest` (`getBudgetSuggestions`→`bulkSetBudgets`;
error si <3 meses de historial), `handleSaveConfig` (acumulativas). Atajos mes `Ctrl+←/→`.
Muestra "puedes gastar / por asignar / estado" del `getBudgetSummary`.

## CalendarPage — `/calendario`
Stores: transaction, category. Estado: mes visible, `selectedDate` (panel de txs del día).
Pinta cada día con actividad (ingreso/gasto). Navegación mes `Ctrl+←/→`. `key={año-mes}`
remonta el grid (fade al cambiar de mes). Sin `selectedDate` ⇒ `[]`.

## ReportsPage — `/reportes`
Stores: transaction, category, debt. Utils: `calculations` (groupByCategory, salud,
movingAverage, detectAnomalies), `constants`. Tabs de análisis (tendencias, categorías,
score de salud financiera con `getFinancialHealthScore`). Solo lectura. `animate-tab-content`
al cambiar pestaña. Charts Recharts con tooltip glass + mono tabular.

## DebtsPage — `/deudas`
Store: debt (único). Estado: form (creditorName, originalAmount, currentBalance, interestRate,
monthlyPayment, dueDate, currency, status), modal de pago (`payingDebt`, amount, date, notes),
modales historial/eliminar. Handlers: `handleSubmit` (add/update), `handlePayment`
(`addPayment` → crea tx enlazada; toast "deuda liquidada" si saldo llega a 0),
`handleDeletePayment` (`deletePayment` → revierte saldo + borra tx enlazada; toast "Deshacer"
→ `restorePayment`). Estrategias avalancha/bola de nieve (orden por interés/saldo).

## SavingsPage — `/ahorros`
Stores: savings, transaction. Estado: form (title, targetAmount, currentAmount, deadline,
priority, icon, color, currency), modales (form, contribuir, eliminar). `CircularProgress`
SVG por meta. Handlers: `handleSubmit` (valida title+targetAmount), `handleContribute`
(`addContribution` + **crea transacción tipo `savings`** "Abono a meta: X"; toast 🎉 si la
meta se completa). Emojis predefinidos. `getTotalSaved` en el header.

## PlanPage — `/plan`
Stores: plan, debt, savings, transaction. Estado: form (title, description, targetAmount,
currentAmount, deadline, horizon, status). Handler `handleSubmit` (valida title). Agrupa por
horizonte (corto/medio/largo) y estado. Calcula fecha objetivo (`projectedCompletionDate`).

## CreditCardsPage — `/tarjetas`
Stores: creditCard, transaction, category. Utils: `getCardBalances`, `getLifetimeCashback`,
`paidCyclesToPayments`. Estado: form (name, bank, cutoffDay, dueDay, color, cashbackRules,
catalogId, note), flujo crear (`cardType` predefinida|personalizada, `selectedBank`),
modales (historial, abono, eliminar). Handlers: `handleSelectTemplate` (catálogo →
`resolveCardCashback` crea categorías de ecosistema vía `ensureCategory`), `handleSubmit`
(valida name + cutoffDay/dueDay ∈ [1,31]), `handleAbonoSubmit` (`addCardPayment`). `rows`
deriva saldos con `getCardBalances`. `COLORS` = paleta del color-picker.

## SettingsPage — `/ajustes`
Stores: category, rate, theme, transaction. Handlers: `handleSaveRate`/`handleAutoRate`
(`setManualRate`/`fetchRate`), export CSV/Excel (papaparse/xlsx; error si 0 txs),
`handleFileUpload` (import CSV/.xlsx → parsea, valida date+amount, `bulkAddTransactions`),
`handleClearData` (borra `fintrack-*-cache` de datos, conserva theme). Gestión de categorías
(add/edit/toggle/dedupe/reset). Toggle de tema.

## FeedbackPage — `/feedback`
Sin stores ni utils de dominio. Formulario de feedback/beta. Card informativa "envío directo".

## AuthPage — (cualquier ruta sin sesión)
Sin stores de dominio. Usa `AuthContext` (`signIn`, `signUp`, `signInWithGoogle`,
`resetPassword`). Util `authErrors` mapea errores Supabase a mensajes ES. Botón Google con
colores oficiales de marca (NO tematizar). Login/registro/recuperación.

## LandingPage — `/` (público, sin sesión)
Sin stores. Fuerza `data-theme="dark"` mientras está montada. Componentes en
`components/landing/` (Hero, Features, HowItWorks, HealthScore, ValueBar, FinalCTA, Navbar,
Footer). Sistema CSS propio `--lp-*` en `styles/landing.css`.
