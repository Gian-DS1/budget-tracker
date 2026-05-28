# Corrección de 8 Bugs en FinTrack RD

Plan para arreglar todos los bugs reportados en la aplicación.

---

## Bugs Identificados y Soluciones

### Bug 1: Campo monto no se formatea visualmente al escribir
**Problema:** Al escribir `1000` en el campo monto de transacciones, se muestra `1000` sin formato.
**Solución:** Crear un componente reutilizable `CurrencyInput` que:
- Mientras el usuario escribe, formatea en tiempo real con separadores de miles (ej: `1,000.00`)
- Usa un `<input type="text">` en lugar de `type="number"` para permitir el formato visual
- Internamente mantiene el valor numérico puro para los formularios
- Se usará en Transacciones, Presupuesto, Ahorros, y donde haga falta

---

### Bug 2: Seleccionar USD no hace conversión de moneda
**Problema:** Al elegir USD y poner un monto, se guarda como RD$ sin conversión.
**Raíz:** En [useTransactionStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/useTransactionStore.js#L47), siempre se guarda `currency: 'DOP'` hardcodeado, ignorando `transaction.currency`.

**Solución:**
- Corregir el store para guardar la moneda seleccionada por el usuario (`transaction.currency`)
- Agregar una tasa de cambio USD→DOP configurable (por defecto ~60 DOP = 1 USD, o consultar una constante)
- Al guardar en USD, convertir el monto a DOP para que los cálculos internos funcionen, pero guardar ambos: el monto original y la moneda original

> [!IMPORTANT]
> **Decisión de diseño:** ¿Prefieres que al seleccionar USD se haga una conversión automática a DOP (usando una tasa fija configurable), o prefieres que simplemente se guarde el monto en la moneda seleccionada sin conversión? La conversión automática es más útil para los totales del dashboard, pero necesitamos definir la tasa. Propongo usar una constante `USD_TO_DOP_RATE = 60` en `constants.js` que puedas cambiar.

---

### Bug 3: Campo "Estimado" en Presupuesto no permite escribir
**Problema:** El input de estimado en la tabla de presupuesto no responde al teclado.
**Raíz:** En [BudgetPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/BudgetPage.jsx#L148-L164), el `<input>` tiene `value={row.estimated || ''}`. Cuando `row.estimated` es `0`, JavaScript evalúa `0 || ''` como `''`, pero el verdadero problema es que `handleEstimatedChange` hace un upsert a Supabase **en cada tecleo** (debounce ausente), y además la re-renderización con la data de Supabase borra lo que se está escribiendo.

**Solución:**
- Convertir el input de Estimado a un componente con estado local que solo persista al hacer `onBlur` (al salir del campo), en lugar de guardar en cada `onChange`
- Usar el mismo componente `CurrencyInput` con formato visual

---

### Bug 4: Metas de ahorro no se guardan
**Problema:** Al crear una meta de ahorro, no pasa nada.
**Raíz:** En [SavingsPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/SavingsPage.jsx#L54-L63) el formulario usa `form.name`, `form.targetAmount`, `form.currentAmount`, etc. Pero en [useSavingsStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/useSavingsStore.js#L36-L44), el store espera `goal.title` (no `goal.name`), `goal.targetAmount`, y `goal.deadline` (no `goal.targetDate`). Los campos no coinciden, así que `title` llega como `undefined` a Supabase y falla silenciosamente.

**Solución:** Corregir el mapeo en `SavingsPage.jsx` para enviar los campos con los nombres que el store espera: `title` en vez de `name`, `deadline` en vez de `targetDate`.

---

### Bug 5: Barra de búsqueda global no funciona
**Problema:** La barra de búsqueda del header no filtra nada.
**Raíz:** En [Header.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/components/layout/Header.jsx#L15-L22), el input no tiene `value` ni `onChange` — es completamente decorativo.

**Solución:** Implementar búsqueda global funcional:
- Agregar estado global de búsqueda en el theme store (o un store nuevo simple)
- Al escribir, navegar automáticamente a `/transacciones` y pasar el query como parámetro de búsqueda
- Filtrar transacciones usando el search query del header

---

### Bug 6: Plan financiero — metas no se guardan
**Problema:** Al crear una meta en Plan Financiero, no se guarda.
**Raíz:** En [PlanPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/PlanPage.jsx#L28-L33) el formulario no envía `targetAmount` (el campo no existe en el form). Pero [usePlanStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/usePlanStore.js#L39) hace `Number(plan.targetAmount)` que resulta en `NaN`, y el campo `deadline` espera `plan.deadline` pero el form envía `targetDate`. Además, el campo `target_amount` en Supabase probablemente tiene un constraint NOT NULL.

**Solución:** Corregir el mapeo del formulario:
- Agregar campo `targetAmount` al formulario del plan (actualmente no lo tiene)
- Mapear `targetDate` → `deadline` en el store
- O bien, ajustar los nombres en el form para que coincidan con lo que el store espera

---

### Bug 7: CSV import no refleja datos
**Problema:** Al importar CSV dice "295 transacciones importadas" pero no aparecen en dashboard ni transacciones.
**Raíz:** En [useTransactionStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/useTransactionStore.js#L90-L111), `bulkAddTransactions` hace el insert correctamente, pero si hay un error silencioso de Supabase (por ejemplo campos obligatorios faltantes o tipos incompatibles), la data no se persiste. También podría ser que el `category_id` se envía como string vacío `''` en vez de `null`, lo que viola un foreign key constraint.

**Solución:**
- En `bulkAddTransactions`, agregar manejo de errores con toast para mostrar si falla
- Convertir `categoryId: ''` a `category_id: null` para evitar violaciones de foreign key
- Hacer lo mismo en `addTransaction` para consistencia
- Después del insert exitoso, refrescar las transacciones con `fetchTransactions()` para garantizar sincronización

---

### Bug 8: Error 404 al refrescar la página en sub-rutas
**Problema:** Al refrescar `/transacciones/nueva` (o cualquier sub-ruta), da error `404: NOT_FOUND`.
**Raíz:** Esto es un problema clásico de SPA con `BrowserRouter`. El servidor (probablemente Vercel) no sabe redirigir las rutas del lado del cliente al `index.html`. Sin embargo, mirando el código, la app usa solo rutas de primer nivel (`/transacciones`, `/ahorros`, etc.), no sub-rutas. El problema real es que al abrir el modal de "Nueva Transacción", la URL **no cambia**, pero si el usuario refresca, funciona normal. 

Revisando más a fondo: si el deploy es en Vercel, necesita un archivo `vercel.json` con rewrite rules. Si es local con Vite, ya está manejado.

**Solución:** Crear/verificar el archivo de configuración de deploy:
- Para Vercel: crear `vercel.json` con `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]`
- Verificar que `vite.config.js` no tenga configuración que interfiera

---

## Archivos a Modificar

### Nuevos archivos
#### [NEW] [CurrencyInput.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/components/ui/CurrencyInput.jsx)
Componente reutilizable para input de montos con formato visual en tiempo real.

---

### Stores
#### [MODIFY] [useTransactionStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/useTransactionStore.js)
- Pasar `transaction.currency` en vez de hardcodear `'DOP'`
- Convertir `category_id: ''` a `null`
- Agregar manejo de errores en `bulkAddTransactions`
- Refrescar transacciones después de bulk import

#### [MODIFY] [useThemeStore.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/stores/useThemeStore.js)
- Agregar estado `globalSearchQuery` para la búsqueda global

---

### Pages
#### [MODIFY] [TransactionsPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/TransactionsPage.jsx)
- Reemplazar input de monto con `CurrencyInput`
- Leer `globalSearchQuery` del store para inicializar el filtro de búsqueda
- Manejar conversión USD→DOP al guardar

#### [MODIFY] [BudgetPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/BudgetPage.jsx)
- Corregir input de Estimado con estado local + onBlur
- Reemplazar con `CurrencyInput`

#### [MODIFY] [SavingsPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/SavingsPage.jsx)
- Corregir campos del form: `name`→`title`, `targetDate`→`deadline`

#### [MODIFY] [PlanPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/PlanPage.jsx)
- Agregar campo `targetAmount` al formulario
- Corregir `targetDate`→`deadline`

#### [MODIFY] [SettingsPage.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/pages/SettingsPage.jsx)
- Mejorar manejo de errores en CSV import

---

### Layout
#### [MODIFY] [Header.jsx](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/components/layout/Header.jsx)
- Conectar barra de búsqueda con estado global y navegación a transacciones

---

### Config
#### [MODIFY] [constants.js](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/src/utils/constants.js)
- Agregar constante `USD_TO_DOP_RATE`

#### [NEW] [vercel.json](file:///Users/giancarlos/Documents/VS%20CODE/budget-tracker/vercel.json)
- Rewrites para SPA routing en Vercel

---

## Verificación

### Pruebas manuales
1. Crear transacción → verificar formato visual del monto
2. Seleccionar USD → verificar conversión
3. Escribir en campo Estimado de Presupuesto → verificar que funciona
4. Crear meta de ahorro → verificar que aparece en la lista
5. Usar barra de búsqueda global → verificar que filtra
6. Crear meta en Plan Financiero → verificar que se guarda
7. Importar CSV → verificar que las transacciones aparecen
8. Refrescar en sub-ruta → verificar que no da 404

### Build
```bash
npm run build
```
