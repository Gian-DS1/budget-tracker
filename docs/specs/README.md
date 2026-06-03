# Specs de lógica de negocio — FinTrack (rediseño Stitch)

Estos specs describen la **lógica financiera** de la app. Fueron escritos y aprobados
antes del rediseño Stitch. **Hallazgo clave:** casi toda esta lógica YA ESTÁ
IMPLEMENTADA en el código (stores Zustand + `src/utils/` + columnas reales en
Supabase). Lo que falta es **exponerla en la UI Stitch** — la UI vieja que la
mostraba (`src/pages/*`) fue eliminada en el commit `dbc4677`.

Por eso estos specs hay que **leerlos por la LÓGICA y el modelo de datos**, NO por la
UI: las secciones de UI referencian componentes viejos (`BudgetPage.jsx`,
`CreditCardsPage.jsx`, `useThemeStore`, etc.) que ya no existen. Al implementar en
Stitch se usan los componentes nuevos (`StitchSelect`, `StitchDatePicker`,
`StitchCurrencyInput`, `DropdownPanel`, `Emoji`, `Modal` de cada screen) y la pauta
de modo demo (mutadores en memoria en `demoMode.js`).

## Estado de cada feature (lógica vs. UI Stitch)

| Feature | Spec | Lógica/BD | UI Stitch | Qué falta cablear |
|---|---|---|---|---|
| Presupuesto base cero ("Puedes gastar") | `2026-05-28-presupuesto-base-cero-design.md` | PARCIAL — `getBudgetSummary` existe en calculations.js; falta la función estrella `calculateSafeToSpend` (o equivalente) y la unificación Dashboard/Presupuesto | PENDIENTE | Número "Puedes gastar" sobre ingreso recibido + semáforo en Dashboard y Presupuesto; deuda en "Por Asignar" |
| Sobres acumulativos (sinking funds) | `2026-05-29-sobres-acumulativos-design.md` | LISTA — `getAccumulatedBalance` + buckets `accumulativePlan/Spent` en `getBudgetSummary`; columnas `is_accumulative`/`accumulation_start` mapeadas en useCategoryStore | PENDIENTE | Mini-modal por categoría (toggle + mes inicio) y render del "bote" en la fila de Presupuesto |
| Tarjetas de crédito (seguimiento) | `2026-05-29-tarjetas-credito-design.md` | LISTA — `getCardCycles`/`getStatementAmount` en creditCards.js; tabla `credit_cards` + `transactions.card_id`; useCreditCardStore completo | PARCIAL (StitchCards existe; verificar que muestre ciclo/estado/aviso) | Aviso de pago próximo en Dashboard; selector de tarjeta en el form de Transacciones (ya está en StitchLedger) |
| Abonos parciales en tarjetas | `2026-05-31-abonos-parciales-tarjetas-design.md` | LISTA — `getCardBalances` (billed/open/paid/pendingBilled/totalBalance/isPaid, prepago, arrastre), `payments` jsonb, addPayment/deletePayment, paidCyclesToPayments | PENDIENTE | En StitchCards: 3 líneas jerárquicas (ciclo abierto / POR PAGAR / saldo total) + botones "Abonar" (modal monto libre) y "Pagar todo"; historial de abonos |
| Tarjetas predefinidas + cashback | `2026-05-31-tarjetas-predefinidas-cashback-design.md` | LISTA — `computeCashback`, `getLifetimeCashback`; `cashbackRules`/`catalogId` mapeados; catálogo en `src/data/creditCardCatalog.js` | PENDIENTE | Selector de catálogo al crear tarjeta + editor de reglas de cashback; cálculo de cashback ya se aplica en StitchLedger (cashbackPreview) |
| Niveles progresivos (NUEVO concepto) | `2026-06-niveles-progresivos-design.md` | POR HACER | POR HACER | Reemplaza "Modo Simple/Avanzado" del spec base-cero. Ver su spec |

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
- **Moneda base DOP:** todo se guarda y calcula en DOP (USD→DOP se convierte al
  guardar, con la tasa de useRateStore).
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
