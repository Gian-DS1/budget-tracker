# Diseño: Sobres acumulativos (sinking funds) — FinTrack

- **Fecha:** 2026-05-29
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **Origen:** 2da ronda del presupuesto base cero (diferido en el spec del 2026-05-28).

## 1. Contexto y objetivo

Los gastos irregulares (marbete, seguros, matrícula, regalos de diciembre) caen una vez
al año y destrozan el presupuesto de ese mes. Un **sobre acumulativo** deja apartar un
aporte mensual chico que **arrastra saldo mes a mes**; cuando llega la factura grande, se
mide contra ese bote acumulado y no aparece como sobregiro.

## 2. Decisiones tomadas (brainstorming)

1. **Comportamiento:** el gasto grande se mide **contra el bote acumulado** (no contra el
   presupuesto del mes). El sobre arrastra saldo entre meses.
2. **Inicio del bote:** **configurable por categoría**, con default = mes actual al activar.
3. **Alcance:** completo — además del Presupuesto, mantiene **"Puedes gastar" sano**: la
   categoría acumulativa se trata como ahorro (su aporte se reserva; su gasto del bote NO
   descuenta del "Puedes gastar" del mes).
4. **Configuración:** interruptor en un **mini-modal desde la fila de la categoría** en la
   página de Presupuesto (no una página aparte).
5. **Mecanismo:** flag por categoría (`is_accumulative`) + mes de inicio
   (`accumulation_start`).

## 3. Datos (Supabase — migración manual que corre el usuario)

```sql
alter table public.categories add column if not exists is_accumulative boolean not null default false;
alter table public.categories add column if not exists accumulation_start text; -- 'YYYY-MM'
```

(Las columnas de tablas existentes heredan los GRANT de la tabla, así que no hace falta
GRANT adicional — solo aplica a tablas nuevas.)

El store de categorías (`useCategoryStore`) mapea:
- lectura: `isAccumulative = c.is_accumulative`, `accumulationStart = c.accumulation_start`.
- `updateCategory`: incluir en el whitelist `is_accumulative` y `accumulation_start`.

## 4. Cálculo del bote (función pura, testeable)

Nuevo en `src/utils/calculations.js`:

```
getAccumulatedBalance({ categoryId, accumulationStart, budgets, transactions, uptoYear, uptoMonth })
  → { budgeted, spent, available }
```

- `budgeted` = Σ `estimatedAmount` de los presupuestos de esa categoría cuyos (año, mes)
  caen entre `accumulationStart` y (`uptoYear`, `uptoMonth`) inclusive.
- `spent` = Σ `amount` de las transacciones de esa categoría con fecha entre el primer día
  del mes de inicio y el último día del mes `upto`.
- `available` = `budgeted − spent` (el bote disponible).
- Comparación de meses por índice `año*12 + mes`. Si `accumulationStart` es nulo, se asume
  el mes `upto` (bote arranca ese mes).
- Todo en DOP (las transacciones ya están en DOP base).

Casos borde con tests: sin presupuestos (bote 0), inicio en el futuro (bote 0), gasto mayor
que lo acumulado (available negativo = sobregiro del sobre).

## 5. "Puedes gastar" sano — cambios en `getBudgetSummary`

`getBudgetSummary` ya recibe `categories`. Se añade el manejo de categorías acumulativas
(identificadas por `category.isAccumulative`), **sin importar su tipo base**:

- Su **estimado** del mes va a un bucket nuevo `accumulativePlan` (no a fijos/variables).
- Su **gasto real** del mes va a `accumulativeSpent` (se **excluye** de `variableGastado`).
- `comprometido = gastosFijosPlan + debtPlanned + ahorroPlan + accumulativePlan`.
- `puedesGastar = max(0, ingresoRecibido − comprometido − variableGastado)` (sin el gasto
  acumulativo).
- `porAsignar = ingresoEstimado − gastosFijosPlan − gastosVariablesPlan − ahorroPlan
  − accumulativePlan − debtPlanned` (mismo total que antes; solo reclasifica el aporte).
- Se devuelven además `accumulativePlan` y `accumulativeSpent` para transparencia/tests.

Los 6 tests existentes de `getBudgetSummary` deben seguir verdes (sin categorías
acumulativas, los buckets nuevos quedan en 0). Se añaden tests para el caso acumulativo.

## 6. UI — página de Presupuesto

- **Configurar:** cada fila de categoría tiene un ícono que abre un **mini-modal**:
  - Interruptor "Sobre acumulativo" (on/off).
  - Selector de "Mes de inicio" (default: mes actual; visible solo si está activo).
  - Guardar → `updateCategory(catId, { isAccumulative, accumulationStart })`.
- **Mostrar:** una categoría acumulativa muestra en su fila, en lugar del progreso mensual
  normal, su **bote**: "Disponible: RD$X (de RD$Y acumulado)" con barra de progreso de
  `spent / budgeted` (verde mientras `available ≥ 0`; rojo solo si se pasó del bote).
- El badge/indicador deja claro que esa categoría es un sobre acumulativo.

## 7. Lo que NO cambia

- Categorías no acumulativas: comportamiento idéntico al actual.
- Módulos de deudas y tarjetas: intactos.
- El total de "Por Asignar" no cambia (solo se reclasifica el aporte acumulativo).

## 8. Fuera de alcance (v1)

- Reusar el módulo de Ahorros (metas) para esto — se mantienen separados (sobre = gasto
  irregular; meta = aspiracional).
- Múltiples botes por categoría / historial de "retiros" del bote.
- Proyección de cuándo el bote alcanzará la meta.

## 9. Criterios de éxito

- Puedo marcar una categoría como acumulativa y fijar su mes de inicio.
- Su fila en Presupuesto muestra el bote (disponible / acumulado) y el mes del gasto grande
  no aparece como sobregiro si había saldo en el bote.
- El "Puedes gastar" del Dashboard no se hunde por un pago grande hecho desde un sobre.
- Las categorías normales y el resto del sistema se comportan igual que antes.

## 10. Archivos afectados (estimado)

- Migración SQL en Supabase (sección 3), ejecutada por el usuario.
- `src/utils/calculations.js` — `getAccumulatedBalance` + cambios en `getBudgetSummary`.
- `src/utils/calculations.test.js` — tests nuevos (bote + acumulativo en summary).
- `src/stores/useCategoryStore.js` — mapeo y whitelist de las dos columnas.
- `src/pages/BudgetPage.jsx` — mini-modal de configuración + render del bote en la fila.
