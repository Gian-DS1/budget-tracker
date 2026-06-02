# Inventario de Lógica — FinTrack RD

> **Propósito.** Esta carpeta documenta TODA la lógica de negocio, cálculos, contratos
> de datos y buenas prácticas de la app **tal como está en `main`** (producción), para
> poder **reconstruirla encima de una nueva UI** sin tener que releer el código viejo ni
> adivinar fórmulas/edge-cases.
>
> Se escribió antes de reconstruir la UI con el sistema de diseño de Google Stitch.
> Si reconstruyes la UI y rompes la lógica a propósito, **esta es la fuente de verdad**
> para volver a cablearla.

## Cómo está organizado

| Carpeta / archivo | Contenido |
|---|---|
| [`stores/`](./stores/) | Contrato de cada store Zustand: estado, acciones (firma + efectos), persistencia, dependencias entre stores, mapeo a columnas de Supabase. |
| [`utils/`](./utils/) | Fórmulas de cálculo exactas (presupuesto base cero, salud financiera, tarjetas, recurrencia), formateo, constantes. Con ejemplos numéricos. |
| [`pages/`](./pages/) | Por página: estado local, handlers (`onSubmit`/`onClick`/filtros), validaciones, edge cases, empty/loading/error states, atajos de teclado. |
| [`architecture.md`](./architecture.md) | Arquitectura, flujo de datos, patrones, convenciones de a11y/motion, contrato de tokens CSS. Buenas prácticas a reusar. |
| [`data-model.md`](./data-model.md) | Modelo de datos: tablas Supabase, formas de objeto en memoria, mapeo snake_case↔camelCase, claves de localStorage. |

## Stack (no cambia con el rediseño)

- **Vite + React 19** · **React Router 7** (rutas protegidas por sesión).
- **Zustand 5** (con `persist`) para estado de dominio. **Supabase** = backend/fuente de verdad.
- **Recharts** (gráficos), **Framer Motion** (motion), **Lucide** (iconos), **react-hot-toast** (avisos).
- **date-fns**, **papaparse**/**xlsx** (import/export), **driver.js** (tour).
- Moneda base: **DOP**. USD se convierte a DOP al guardar (tasa histórica del día).

## Reglas de oro de la lógica (no negociables al reconstruir)

1. **El monto se guarda SIEMPRE en DOP.** Si el usuario ingresa USD, se convierte con la
   tasa del día (+1.2% spread bancario) ANTES de persistir. La columna `currency` en DB
   siempre queda `'DOP'`. Ver [`stores/transactions.md`](./stores/transactions.md).
2. **Cashback solo en gastos con tarjeta.** Se calcula sobre el monto ya en DOP. El
   "monto efectivo" (para presupuesto/reportes) = `amount − cashbackEarned`. Lo que debes
   a la tarjeta usa el monto **bruto**. Ver [`utils/calculations.md`](./utils/calculations.md)
   y [`utils/credit-cards.md`](./utils/credit-cards.md).
3. **Clasificación por TIPO DE CATEGORÍA**, no por el `type` de la transacción, en el
   resumen del presupuesto (`getBudgetSummary`). Fuente única de verdad para "puedes gastar".
4. **Caché local ≠ fuente de verdad.** Los stores cachean en localStorage (parcialmente)
   para arranque en frío; Supabase es la verdad. El skeleton solo se muestra en carga en
   frío (`loading && data.length === 0`), nunca sobre datos cacheados.
5. **Acciones reversibles.** Borrados ofrecen "Deshacer" re-insertando la fila tal cual
   (sin re-convertir ni recalcular). El `id` cambia; nada referencia transacciones por id.

## Estado de la documentación

- [x] `utils/calculations.md` — fórmulas financieras núcleo
- [ ] `utils/credit-cards.md`, `utils/recurrence.md`, `utils/formatters.md`
- [ ] `stores/*` (11 stores)
- [ ] `pages/*` (13 páginas)
- [ ] `architecture.md`, `data-model.md`
