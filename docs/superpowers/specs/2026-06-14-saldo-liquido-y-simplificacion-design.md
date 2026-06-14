# Saldo líquido + simplificación del dashboard — Diseño

**Fecha:** 2026-06-14
**Tipo:** Cambio de modelo mental + limpieza de pantallas
**Alcance:** SOLO modo demo (localhost). Cero Supabase, cero producción, cero SQL.
**Estado:** Diseño aprobado en brainstorming, pendiente de plan de implementación

---

## Contexto y motivación

Varios usuarios reportan que les cuesta entender la plataforma aun con el tutorial.
La causa de fondo no es el tutorial: es el **modelo mental**. Hoy la app trata cada
mes como una caja cerrada (ingresos − gastos del mes) que **reinicia**, pero los
usuarios piensan como una **cuenta de banco continua**: hay un saldo líquido que
arrastra, cada mes entra y sale dinero, y lo que sobra **engorda ese saldo**.

Además, los usuarios piden **unificar conceptos** ("todo en un mismo sitio") y la
pantalla de **Reportes** se siente ruidosa y repetitiva frente al Dashboard.

**Decisión del usuario:** implementar un modelo de **efectivo líquido que arrastra**
y limpiar las pantallas, TODO **solo en modo demo** para probarlo sin riesgo. Si
convence, una segunda fase (fuera de este spec) lo conectaría a Supabase.

## Objetivo

1. Introducir un **efectivo disponible** que arrastra mes a mes: un solo número que
   sube con ingresos, baja con gastos y con lo apartado a ahorro, partiendo de un
   **saldo inicial** declarado por el usuario.
2. Unificar la vista del dinero en el Dashboard (efectivo + ahorros + deudas +
   patrimonio en un solo sitio).
3. Limpiar pantallas: eliminar **Reportes**, rescatando su comparativa mes-vs-mes
   como una celda del Dashboard.

Todo **exclusivamente en modo demo** (`isDemoActive()`), sin tocar el flujo de la
cuenta real ni el backend.

## No-objetivos (YAGNI)

- NO múltiples cuentas bancarias, NI transferencias entre cuentas, NI conciliación.
- NO persistencia en Supabase, NI migración SQL, NI cambios en la tabla `profiles`.
- NO tocar el flujo de la cuenta real (no-demo): el saldo líquido NO aparece fuera
  de demo en esta fase.
- NO automatizar el apartado a ahorro (es manual y explícito).
- NO mover Categorías del menú (se queda donde está).
- NO un onboarding nuevo pesado: declarar el saldo inicial es un campo simple.

---

## Modelo conceptual: dos bolsas + un puente

**Bolsa 1 — Efectivo disponible (líquido).** Un solo número, "dinero gastable ahora".
**Bolsa 2 — Ahorros (metas / vaults).** Lo que ya existe: metas con su monto.
**Puente — Apartar a ahorro.** Mueve dinero de la Bolsa 1 a la Bolsa 2: el efectivo
baja, el ahorro sube, el patrimonio no cambia.

### Fórmula del efectivo (derivado, no almacenado)

```
efectivo = saldoInicial
         + Σ(transacciones tipo income)
         − Σ(transacciones tipo expense | fixed_expense | variable_expense, netas de cashback)
         − Σ(transacciones tipo savings)        ← apartado a ahorro
```

Notas clave del modelo:

- El efectivo se **deriva** de las transacciones que ya existen + el saldo inicial.
  NO se guarda un saldo mutable (que podría desincronizarse). Una sola fuente de
  verdad: los movimientos. Esto calza con cómo la app ya calcula todo (selectores
  puros sobre `transactions`).
- **Los gastos restan netos de cashback** (igual que el resto de la app:
  `getEffectiveAmount` / `cashbackEarned`), para no contradecir los totales que ya
  muestra el Dashboard.
- **El apartado a ahorro YA EXISTE** como movimiento: `demoAddContribution()` crea
  una transacción tipo `'savings'` enlazada al vault (ver
  [demoMode.js:610](../../../src/stitch/demoMode.js#L610)). Por eso NO se inventa un
  tipo de transacción nuevo: el tipo `'savings'` es el "apartado" y ya descuenta del
  efectivo por la fórmula de arriba. La pieza nueva es el **saldo inicial** y el
  **selector que suma todo**.
- **Los pagos de deuda** ya generan una transacción `'fixed_expense'`
  ([demoMode.js:518](../../../src/stitch/demoMode.js#L518)), así que reducen el
  efectivo automáticamente, sin tratamiento especial.

### El saldo inicial

- Dato nuevo: `initialCashBalance` (número, default `0`).
- **Persistencia:** SOLO en el estado en memoria del modo demo. Se añade al store de
  preferencias (`usePrefsStore`) como un campo más, y `seedDemoStores()` lo siembra
  con un valor de ejemplo realista para que el demo establecido se vea coherente.
  En `seedFreshStores()` ("usuario nuevo") arranca en `0` para disparar el aviso.
- Al recargar la página el modo demo se re-siembra desde cero (es demo): el valor
  declarado por el usuario durante la sesión se pierde al salir. Es el comportamiento
  esperado del demo y es aceptable para esta fase de prueba.
- **Edición:** un mutador `demoSetInitialCashBalance(amount)` en `demoMode.js`, y un
  campo en Ajustes (Settings) "Efectivo inicial" usando `StitchCurrencyInput`.

---

## Arquitectura (archivos y responsabilidades)

| Archivo | Responsabilidad |
| --- | --- |
| `src/stitch/screens/dashboard/selectors.js` | Nuevo selector puro `getLiquidCash({ transactions, initialCashBalance })` + su test. Es el corazón del modelo. |
| `src/stores/usePrefsStore.js` | Añadir campo `initialCashBalance` (default 0) al estado. NO incluirlo en `partialize` (así NO se persiste en `sessionStorage`): vive solo en memoria durante la sesión. Su setter sale temprano en demo igual que `setBudgetLevel`/`setCurrency` (`if (isDemoActive()) return;` antes de cualquier llamada a Supabase). En esta fase NO se toca la tabla `profiles`. |
| `src/stitch/demoMode.js` | Sembrar `initialCashBalance` en `seedDemoStores`/`seedFreshStores`; mutador `demoSetInitialCashBalance`. |
| `src/stitch/screens/StitchDashboard.jsx` | Celda nueva "Efectivo disponible" (estrella); botón "Apartar a ahorro"; celda nueva de comparativa mes-vs-mes (rescatada de Reportes); aviso de saldo inicial sin declarar. |
| `src/stitch/screens/dashboard/LiquidCashCell.jsx` (nuevo) | Celda que muestra el efectivo disponible + delta del mes. |
| `src/stitch/screens/dashboard/SaveToVaultModal.jsx` (nuevo) | Modal "Apartar a ahorro" (cuánto + a qué meta). Reusa `StitchCurrencyInput`, `StitchSelect`, patrón de modales. |
| `src/stitch/screens/StitchSettings.jsx` | Campo "Efectivo inicial" (solo visible/efectivo en demo). |
| `src/stitch/StitchShell.jsx` | Quitar la entrada de menú "Reportes". |
| `src/stitch/StitchApp.jsx` | Quitar la ruta `/reportes`. |
| `src/stitch/screens/reports/` + `StitchReports.jsx` | Eliminar la pantalla. Mover el selector `getMonthComparison` + el componente `MonthComparison` a una ubicación del dashboard (ver más abajo). |
| `src/i18n/translations.js` / `screenStrings.js` | Claves nuevas (efectivo, apartar a ahorro, saldo inicial); limpiar claves muertas de reportes si quedan sin uso. |

> Verificado: el tour (`tourSteps.js`) NO ancla a `reports-content`, así que eliminar Reportes no rompe el tutorial. No hace falta tocar el tour.

### Rescate de la comparativa mes-vs-mes

- `getMonthComparison` (hoy en `screens/reports/selectors.js`) y el componente
  `MonthComparison` (hoy en `screens/reports/`) se **mueven** a `screens/dashboard/`
  (selector → `dashboard/selectors.js` o un módulo hermano; componente →
  `dashboard/MonthComparison.jsx`). Se borra el resto de `screens/reports/`.
- En el Dashboard se añade como una celda secundaria (no compite con el efectivo).

### Aislamiento demo

- El efectivo, el botón de apartar y el campo de saldo inicial se muestran/activan
  SOLO cuando `isDemoActive()` es true. Fuera de demo, el Dashboard se ve como hoy.
- El modal "Apartar a ahorro" en demo llama a `demoAddContribution(goalId, amount,
  date)` (que ya existe) — NO se crea lógica de aporte nueva, se reusa.

---

## Pantallas y flujo (UI)

### Dashboard

1. **Celda "Efectivo disponible" (estrella).** Primer elemento, prominente:
   - Monto grande (`CountUp` + `formatCurrency`).
   - Sub-línea: delta del mes en curso (ingresos − gastos − apartados del mes),
     con signo y color (verde si positivo `text-tertiary`, rojo si negativo
     `text-accent-error`).
   - Botón **"Apartar a ahorro"** que abre `SaveToVaultModal`.
2. **Bolsas visibles** (reusar lo que ya existe): Ahorros (metas), Deudas, y
   **Patrimonio neto**. Patrimonio neto pasa a incluir el efectivo:
   `patrimonio = efectivo + ahorros − deudas` (hoy es `ahorros − deudas`).
3. **Celda comparativa mes-vs-mes** (rescatada de Reportes), secundaria.
4. **Aviso de saldo inicial** (solo si `initialCashBalance === 0` en demo): banner
   suave "Declara tu efectivo actual para empezar" con enlace a Ajustes.

### Apartar a ahorro (modal)

- Campos: monto (`StitchCurrencyInput`) + meta destino (`StitchSelect` con las metas
  activas) + fecha (`StitchDatePicker`, default hoy).
- Al confirmar (demo): `demoAddContribution(goalId, amount, dateISO)`. El efectivo
  baja (por la transacción `'savings'`), la meta sube. Toast de confirmación +
  Deshacer (patrón existente: `demoDeleteContribution`).
- Validación: monto > 0; advertir (no bloquear) si el monto supera el efectivo
  disponible ("vas a quedar en negativo").

### Ajustes

- Campo "Efectivo inicial" (`StitchCurrencyInput`). Al cambiar:
  `demoSetInitialCashBalance(value)`. Solo en demo.

### Menú (StitchShell)

De 9 a 8 destinos (solo se elimina Reportes):

- **Principal:** Dashboard · Transacciones · Presupuesto
- **Activos:** Ahorros · Deudas · Tarjetas
- **Herramientas:** Calendario · Categorías

---

## Datos / cálculo

- **`getLiquidCash`** (nuevo selector puro): recibe `transactions` (todas, no de un
  mes) e `initialCashBalance`; aplica la fórmula. Testeable con casos:
  saldo inicial solo; ingreso sube; gasto neto de cashback baja; aporte `'savings'`
  baja; combinación. Convención existente: `selectors.test.js`.
- **Delta del mes** (para la sub-línea): mismo cálculo restringido a las
  transacciones del mes seleccionado (income − gastos netos − savings del mes).
- **Patrimonio neto** se recalcula incluyendo efectivo (ajustar
  `getNetWorthSplit` o el consumidor en el Dashboard).

## Manejo de errores / casos borde

- `transactions` vacío + saldo inicial 0 → efectivo 0; mostrar aviso de saldo inicial.
- Apartar más que el efectivo disponible → permitido con advertencia (el usuario
  manda; refleja que puede tener efectivo fuera de la app).
- Cashback: los gastos restan `amount − cashbackEarned` (neto), nunca el bruto.
- Fuera de demo: nada de esto se muestra; el Dashboard original intacto.

## Testing

- **Unitario:** `getLiquidCash` + el delta del mes en `selectors.test.js` (lógica
  pura, alineado con cómo se testea hoy). El movimiento de "apartar" reusa
  `demoAddContribution`, ya cubierto por el comportamiento existente.
- **Verificación:** `npm run build` pasa; `npm test` verde; inspección visual en
  demo (Entrar como demo): efectivo correcto, apartar baja efectivo / sube meta,
  Reportes ya no está en el menú, comparativa visible en Dashboard.
- **No** se añaden tests de componentes UI (la app no los tiene; sería teatro).

## Reversibilidad

Todo vive tras `isDemoActive()` y en `screens/dashboard/` + `demoMode.js` +
`usePrefsStore` (campo en memoria). Revertir = quitar las celdas/modal nuevos, el
campo `initialCashBalance`, y restaurar Reportes desde git. La eliminación de
Reportes es el único cambio que toca código no-demo (menú/ruta), pero es estético y
reversible con git.

## Criterios de éxito

En modo demo, el usuario ve **un efectivo disponible que arrastra y cuadra** con sus
movimientos, puede **apartar a ahorro** bajando su efectivo, ve **todo en el
Dashboard** (efectivo + ahorros + deudas + patrimonio + comparativa), y **Reportes ya
no existe** como pantalla separada. Con eso se evalúa si el modelo simplifica de
verdad la comprensión, antes de invertir en conectarlo a Supabase.
```