# Specs de lógica de negocio — FinTrack (rediseño Stitch)

Estos specs describen la **lógica financiera** de la app. Fueron escritos y aprobados
antes del rediseño Stitch. **Estado hoy:** esa lógica está implementada (stores Zustand
+ `src/utils/` + columnas reales en Supabase) **y expuesta en la UI Stitch**. El único
pendiente real de UI son los sobres acumulativos (ver la tabla). La UI vieja que mostraba
todo esto (`src/pages/*`) fue eliminada en el commit `dbc4677`.

Por eso estos specs hay que **leerlos por la LÓGICA y el modelo de datos**, NO por la
UI: las secciones de UI referencian componentes viejos (`BudgetPage.jsx`,
`CreditCardsPage.jsx`, `useThemeStore`, etc.) que ya no existen. La implementación real
usa los componentes nuevos (`StitchSelect`, `StitchDatePicker`, `StitchCurrencyInput`,
`DropdownPanel`, `Emoji`, `Modal` de cada screen) y la pauta de modo demo (mutadores en
memoria en `demoMode.js`).

## Estado de cada feature (lógica vs. UI Stitch)

| Feature | Spec | Estado | Notas |
|---|---|---|---|
| Presupuesto: niveles (Seguimiento / 50-30-20 / Base cero) | `2026-05-28-presupuesto-base-cero-design.md` + `2026-06-niveles-progresivos-design.md` | **HECHO** | `screens/budget/` (BudgetShell + BudgetZero + Budget503020 + BudgetTracking). Preferencia `budgetLevel` en `usePrefsStore`. |
| Sobres acumulativos (sinking funds) | `2026-05-29-sobres-acumulativos-design.md` | **PENDIENTE (UI)** | Lógica lista: `getAccumulatedBalance` + columnas `is_accumulative`/`accumulation_start`. Falta el mini-modal por categoría en `screens/budget/BudgetZero.jsx`. Único pendiente real. |
| Tarjetas de crédito (ciclos, estado, aviso) | `2026-05-29-tarjetas-credito-design.md` | **HECHO** | `screens/cards/`. Aviso de pago próximo en Dashboard; selector de tarjeta en el form de Transacciones. |
| Abonos parciales en tarjetas | `2026-05-31-abonos-parciales-tarjetas-design.md` | **HECHO** | `getCardBalances` (billed/open/paid/prepago/arrastre), modal "Abonar", "Pagar todo", historial. |
| Tarjetas predefinidas + cashback | `2026-05-31-tarjetas-predefinidas-cashback-design.md` | **HECHO** | Catálogo en `src/data/creditCardCatalog.js`, `computeCashback`/`getLifetimeCashback`, editor de reglas, preview de cashback en Transacciones. |

## Decisión de producto vigente

El concepto central de presupuesto evoluciona de "solo base cero" a **niveles
progresivos** (Seguimiento → 50/30/20 → Base cero), elegidos por el usuario. Esto
resuelve la resistencia de usuarios que no entienden el base cero, sin perder la
potencia para los avanzados. Ver `2026-06-niveles-progresivos-design.md`. Donde los
specs viejos dicen "Modo Simple/Avanzado", se reinterpreta como estos niveles.

## Reglas de oro de la lógica (transversales, NO romper)

- **Anti-doble-conteo en tarjetas:** una compra con tarjeta es un gasto normal en su
  categoría, cuenta UNA vez. El pago/abono de la tarjeta NO crea gasto: solo liquida
  saldo. (Las deudas SÍ son base caja: cada abono crea un gasto `fixed_expense`.)
- **Moneda única del perfil** *(actualizado 2026-06-11, globalización del núcleo)*:
  cada usuario elige UNA moneda en el onboarding y todo se guarda/calcula/formatea
  en ella (`Intl`). Ya no existe conversión USD→DOP ni `useRateStore`; donde estos
  specs digan "DOP" o "RD$", léase "la moneda del perfil".
- **ISO local** en fechas (`YYYY-MM-DD`), nunca toISOString (corre el día en GMT-4).
- **Tipo derivado de la categoría** (income/fixed_expense/variable_expense/savings).
- Las migraciones SQL las corre el usuario a mano en Supabase (ver cada spec). Varias
  YA están aplicadas (las columnas existen y los stores las mapean).

## Migraciones SQL aplicadas (verificado en stores)

- `credit_cards` (tabla) + `transactions.card_id` — aplicada (useCreditCardStore lee/escribe).
- `credit_cards.payments` (jsonb), `cashback_rules`, `catalog_id` — aplicadas.
- `categories.is_accumulative` + `accumulation_start` — aplicadas (useCategoryStore las mapea).

Si al implementar una feature el dato no aparece, revisar primero que la migración
correspondiente del spec esté corrida en el Supabase del entorno de QA.
