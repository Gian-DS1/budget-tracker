# Diseño: Presupuesto base cero mejorado (FinTrack RD)

- **Fecha:** 2026-05-28
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **Enfoque elegido:** B — Mejorar el modelo mensual actual (con "truco" de ingreso recibido)

## 1. Contexto y objetivo

FinTrack RD es una SPA multi-usuario (React 19 + Vite 8 + Supabase) para seguimiento de
finanzas personales en República Dominicana. El objetivo es evolucionar el sistema hacia un
presupuesto **base cero** efectivo —donde cada peso que entra tiene un destino (gasto, ahorro,
inversión, pago de deuda)— que funcione en la práctica, no solo en la pantalla.

### Perfiles de usuario a soportar (multi-usuario, un solo modelo)

- **Ingreso variable (caso del autor):** pago por horas en **USD**, **quincenal** (un viernes
  sí, otro no) → monto variable, moneda extranjera, a veces 3 pagos en un mes.
- **Ingreso fijo (otros usuarios):** salario predecible, típicamente en DOP, fácil de planificar.

### Restricciones

- **Tiempo:** poco tiempo para implementar y para el seguimiento diario. Prioridad a soluciones
  rápidas de ejecutar y mantener.
- **Captura de datos actual:** mezcla de importación CSV/Excel del banco + ajustes manuales.
- **Deuda:** se busca **pagar deuda y ahorrar en paralelo** (ambos son destinos del dinero).
- **Claridad #1 deseada:** "¿cuánto me queda por gastar?" — dinero disponible tras lo comprometido.

## 2. Estado actual del sistema (base sobre la que construimos)

- Categorías en 4 tipos: `income`, `fixed_expense`, `variable_expense`, `savings`
  (ver `src/data/defaultCategories.js`, `src/utils/constants.js`).
- Presupuesto por categoría/mes con `estimatedAmount`; el "actual" se computa de transacciones
  (`src/stores/useBudgetStore.js`, `src/pages/BudgetPage.jsx`).
- `BudgetPage` ya tiene la tarjeta **"Por Asignar"** = ingresos_est − gastos_est − ahorros_est,
  y celebra cuando da 0 (núcleo de zero-based ya presente).
- Las **deudas viven en un store aparte** (`src/stores/useDebtStore.js`, tablas `debts` y
  `debt_payments`); no participan en la ecuación del presupuesto.
- **No existe concepto de "saldo en cuenta/banco":** todo se deriva de transacciones.
- El Dashboard (`src/pages/DashboardPage.jsx`) calcula sus propios totales y **no resta ahorro
  ni muestra el pago de deuda** en el flujo de caja → inconsistente con `BudgetPage`.

### Tensiones estructurales detectadas

1. **La deuda no entra en "Por Asignar".** Puede mostrarse "presupuesto perfecto" mientras queda
   dinero sin asignar al pago de deuda.
2. **Se presupuesta contra ingreso *estimado*, no contra dinero real.** Con ingreso variable
   quincenal en USD, esto se rompe (meses de 3 cheques o de pocas horas desajustan el plan).

## 3. Marco conceptual (decisiones de fondo)

- **Qué es realista:** asignar cada peso *cuando entra* (sobre dinero recibido), no repartir el
  mes completo por adelantado. Mismo modelo sirve a ingreso fijo (cheque idéntico) y variable.
- **Por qué fallan los sistemas zero-based y cómo lo evitamos:**
  1. Fricción de captura → reforzamos el flujo de import existente; no pedimos registrar más.
  2. Presupuestar contra un pronóstico → el número "puedes gastar" usa dinero **recibido**.
  3. Falta de colchón para gastos irregulares → sobres acumulativos (2da ronda).
  4. Rigidez con culpa → permitir mover dinero entre categorías sin drama.
  5. "Cero" como vanidad → reflejar plata real, no estimada.
- **"Asignar cada peso" vs. sistema que funciona:** un sistema útil (a) refleja dinero real,
  (b) responde "cuánto puedo gastar hoy sin romper nada", (c) absorbe lo irregular,
  (d) cuesta minutos.

## 4. Enfoque elegido: B con ingreso recibido

Se mantiene el modelo de "estimar el mes" (mínimo cambio, rápido), pero el **número estrella se
calcula sobre ingreso recibido**, lo que neutraliza la debilidad de B ante ingreso variable sin
migrar a un modelo por-cheque (enfoque C). El plan sigue usando estimados como meta.

## 5. Alcance del v1 (acordado)

Incluido:
- **Sección 1 núcleo:** deuda en la ecuación + número "Puedes gastar" sobre ingreso recibido.
- **Modo Simple vs. Avanzado** (elegido por el usuario, persistido).

Diferido a 2da ronda:
- Sobres acumulativos (gastos irregulares).
- Tasa USD editable + ingresos en USD con conversión.

## 6. Diseño detallado (v1)

### 6.1 Función única de cálculo (cimiento)

Crear en `src/utils/calculations.js` una función que sea **la única fuente de verdad** usada por
Dashboard y Presupuesto (hoy calculan por separado y no coinciden):

```
calculateSafeToSpend({ transactions, budgets, debts, payments, categories, year, month }) → {
  ingresoRecibido,        // suma de transacciones type 'income' del mes (en moneda base DOP)
  comprometido,           // gastos_fijos_del_mes(plan) + deuda_planificada + ahorro_planificado
  variableGastado,        // suma real de gastos variables del mes
  puedesGastar,           // max(0, ingresoRecibido − comprometido − variableGastado)
  porAsignar,             // ingresos_est − gastos_est − ahorros_est − deuda_planificada
  estado,                 // 'good' | 'warning' | 'danger' (semáforo)
}
```

Reglas:
- **Gastos fijos** se tratan como **comprometidos del mes completo** aunque no se hayan pagado aún.
- **Gastos variables** solo descuentan lo realmente gastado; el resto del presupuesto variable es
  parte de "puedes gastar".
- **Deuda planificada** = suma de pagos mensuales de deudas activas (`getTotalMonthlyPayment()`,
  ya convierte USD→DOP con la tasa).
- **Ahorro planificado** = total estimado de categorías `savings` del mes.
- Todo en moneda base **DOP**.

### 6.2 Deuda en la ecuación

- Nueva sección **"Pago de Deuda"** en `BudgetPage`: planificado (desde `useDebtStore`) vs. real
  (pagos del mes desde `payments`). Junto a la sección de Ahorro como destino del dinero.
- "Por Asignar" pasa a: `ingresos_est − gastos_est − ahorros_est − deuda_planificada`
  (modifica el cálculo en `src/pages/BudgetPage.jsx`, hoy en la línea ~124).
- Evitar doble conteo: el "real" de deuda viene de `debt_payments`, no de transacciones.

### 6.3 Número "Puedes gastar"

- Héroe en Dashboard y resumen en Presupuesto, alimentados por `calculateSafeToSpend`.
- Etiqueta en lenguaje natural con verbo ("Puedes gastar"), no jerga ("Seguro para gastar").
- Frase de apoyo: "este mes, sin atrasarte en pagos ni metas".
- Semáforo consistente en todo el sistema: 🟢 good · 🟡 warning · 🔴 danger.

### 6.4 Modo Simple vs. Avanzado

- Preferencia `viewMode: 'simple' | 'advanced'` en `src/stores/useThemeStore.js` (persistida por
  usuario, junto al tema). Nuevos usuarios arrancan en **Simple**. Interruptor en Ajustes.
- **Simple:**
  - Dashboard: un número héroe ("Puedes gastar") + semáforo + frase; el resto (gráficos,
    recientes, calendario) se despliega con "¿Cómo se calcula? ▸" / "ver más".
  - Presupuesto: solo tarjetas resumen (Por Asignar + Puedes gastar); tablas por categoría
    colapsadas tras "ver detalle ▸".
- **Avanzado:**
  - Dashboard: todas las tarjetas (corregidas para incluir ahorro y pago de deuda), gráficos,
    recientes, calendario.
  - Presupuesto: tablas completas como hoy.

### 6.5 Consistencia del Dashboard

- Corregir `DashboardPage` para usar la misma matemática: restar ahorro e incluir pago de deuda
  en el flujo, vía `calculateSafeToSpend` / utilidades compartidas.

## 7. Hoja de ruta (orden de implementación)

**v1:**
1. Cimiento: `calculateSafeToSpend` + unificar matemática + corregir Dashboard.
2. Deuda en la ecuación (sección "Pago de Deuda" + "Por Asignar").
3. Número "Puedes gastar" en Dashboard y Presupuesto.
4. Modo Simple/Avanzado (presentación sobre números que ya funcionan).

**2da ronda:** 5. Sobres acumulativos · 6. Tasa USD editable + ingresos en USD.

**Futuro (opcional):** 7. Multimoneda real (tasa histórica por fecha) y/o migración al modelo
híbrido C (asignación por cheque).

Principio: los pasos 1→2→3 entregan valor aunque se pare ahí; el paso 4 lo hace digerible para
todos los perfiles.

## 8. Fuera de alcance (v1)

- Sobres acumulativos / sinking funds.
- Multimoneda (más allá de lo ya existente); ingresos en USD; tasa editable.
- Modelo de asignación por cheque (enfoque C).
- Concepto de saldo bancario / cuentas.
- Algoritmo automático de reparto deuda vs. ahorro (solo visibilidad lado a lado en v1).

## 9. Criterios de éxito

- Al abrir la app, el usuario ve **un número claro** que responde "¿cuánto me queda por gastar?"
  basado en **dinero real recibido**, no estimado.
- "Por Asignar" refleja la deuda como destino; con deuda activa, no puede dar 0 sin asignarla.
- Dashboard y Presupuesto muestran **cifras idénticas** (fuente única de verdad).
- Un usuario nuevo (o mayor/novato) en Modo Simple entiende su situación con un número + semáforo,
  sin ver jerga ni tablas, y puede profundizar con un clic.
- El usuario de ingreso variable nunca ve "puedes gastar" plata que no ha entrado.

## 10. Archivos afectados (estimado)

- `src/utils/calculations.js` — nueva función `calculateSafeToSpend` y utilidades compartidas.
- `src/pages/BudgetPage.jsx` — sección "Pago de Deuda", "Por Asignar" corregido, modo Simple.
- `src/pages/DashboardPage.jsx` — héroe "Puedes gastar", consistencia, modo Simple.
- `src/stores/useThemeStore.js` — preferencia `viewMode`.
- `src/pages/SettingsPage.jsx` — interruptor Simple/Avanzado.
- (Lectura) `src/stores/useDebtStore.js`, `src/stores/useBudgetStore.js`,
  `src/stores/useTransactionStore.js`.
