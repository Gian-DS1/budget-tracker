# Diseño: Tarjetas predefinidas con cashback automático — FinTrack RD

- **Fecha:** 2026-05-31
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **Construye sobre:** `2026-05-29-tarjetas-credito-design.md`

## 1. Contexto y objetivo

Hoy el usuario crea cada tarjeta de cero (nombre, banco, corte, pago, color y reglas de
cashback manuales). El cashback es un **% plano por categoría** calculado al instante en
cada transacción (`computeCashback`), sin topes ni mínimos.

Cada tarjeta del mercado dominicano tiene reglas de cashback propias. El objetivo es ofrecer
un **catálogo de tarjetas predefinidas** donde el banco y el nombre vienen fijos y las reglas
de cashback se cargan automáticamente, dejando al usuario solo definir **día de corte** y
**día de pago**. Se conserva la opción de crear una tarjeta **personalizada** (flujo actual)
y se permite **personalizar** una predefinida (por si el banco cambia un beneficio).

## 2. Decisiones tomadas (restricciones del usuario)

1. **Solo % plano por categoría.** No se modelan topes (devolución máxima mensual/anual),
   consumos mínimos, rotación trimestral ni tasas escalonadas. `computeCashback` **no se
   toca**. El cashback mostrado es un estimado, igual que hoy. **No se muestran topes en
   ninguna parte de la UI.**
2. **Categorías dedicadas** para los ecosistemas de comercio cuya tasa alta solo aplica en
   una cadena específica (Bravo, Sirena, Plaza Lama, Grupo CCN), para no sobreestimar el
   cashback contra categorías generales.
3. Esas categorías dedicadas se crean **bajo demanda**: solo cuando el usuario agrega una
   tarjeta que las necesita. Quien no tenga esas tarjetas mantiene su lista de categorías
   limpia.

## 3. Estado actual relevante

- Tabla `credit_cards`: `id, user_id, name, bank, cutoff_day, due_day, color, paid_cycles
  (jsonb), cashback_rules (jsonb: [{categoryId, percentage}]), created_at`.
- `cashback_rules[].categoryId` es un **UUID de categoría por usuario** o el literal `'all'`.
- `computeCashback(card, categoryId, amount)` busca la regla de la categoría exacta; si no,
  la regla `'all'`; devuelve `monto × % / 100` redondeado. Función pura, por transacción.
- Categorías sembradas por usuario desde `defaultCategories` (UUID por usuario). Solo
  `pago-deuda` tiene `slug` estable hoy. El seeding/dedup hace match por **nombre
  normalizado + tipo**.
- `useCreditCardStore`: `addCard`, `updateCard`, `deleteCard`. `useCategoryStore`:
  `addCategory`, `updateCategory`, etc.

## 4. Alcance

Incluido:
- Catálogo estático de tarjetas predefinidas (banco + nombre + color + reglas de cashback).
- Flujo de creación con elección **Predefinida** vs **Personalizada**.
- Predefinida: banco y nombre **fijos**; solo corte/pago editables; cashback pre-cargado y
  **editable** (panel "Personalizar cashback"); botón "Restaurar valores del banco".
- Personalizada: formulario actual completo (sin cambios funcionales).
- Resolución de `categoryKey` del catálogo → categoría real del usuario, creando categorías
  de ecosistema **bajo demanda**.
- `slug` estable en las categorías por defecto usadas por el catálogo.
- Limpieza/optimización de keywords para que el auto-categorizador rutee a la categoría de
  ecosistema correcta.

Diferido (fuera de alcance):
- Topes, mínimos, rotación, escalonamiento (decisión explícita del usuario).
- Módulos de viaje de Qik Pro (10% transporte / 5% restaurantes / 3% renta de autos).
- Categorías dedicadas para comercios menores (Corripio, Listo Ferretería, Pressto): se
  mapean a categorías generales o se omiten.

## 5. Datos

### 5.1 Migración SQL (la ejecuta el usuario en Supabase)

```sql
alter table public.credit_cards add column if not exists catalog_id text;
```

- `catalog_id` = `id` del template del catálogo. **NULL ⇒ tarjeta personalizada**.
- `cashback_rules` **no cambia de forma**: sigue siendo `[{categoryId, percentage}]` con
  UUIDs ya resueltos del usuario. Para una predefinida se pre-llena desde el catálogo; el
  usuario puede editarla. Esto mantiene `computeCashback` intacto.
- Tarjetas existentes quedan con `catalog_id = NULL` → personalizadas. Retrocompatible.

### 5.2 `mapFromDb` / store

`useCreditCardStore.mapFromDb` agrega `catalogId: c.catalog_id || null`. `addCard` y
`updateCard` incluyen `catalog_id` en el payload/whitelist.

## 6. Catálogo (`src/data/creditCardCatalog.js`)

Estructura:

```js
export const CATALOG_CATEGORIES = {
  // Ecosistemas dedicados — se crean bajo demanda con esta definición.
  'bravo':      { name: 'Bravo',      type: 'variable_expense', icon: '🛒',
                  color: '#e3000f', keywords: ['bravo', 'supermercados bravo', 'bravova',
                  'smartfit', 'smart fit', 'sweet frog', 'arca petshop', 'dr noe'] },
  'sirena':     { name: 'Sirena',     type: 'variable_expense', icon: '🛒',
                  color: '#0aa3a3', keywords: ['sirena', 'la sirena', 'sirena market'] },
  'plaza-lama': { name: 'Plaza Lama', type: 'variable_expense', icon: '🛒',
                  color: '#c8102e', keywords: ['plaza lama', 'lama'] },
  'grupo-ccn':  { name: 'Grupo CCN',  type: 'variable_expense', icon: '🛒',
                  color: '#004b87', keywords: ['nacional', 'supermercados nacional', 'jumbo',
                  'jumbo express', 'casa cuesta', 'jugueton', 'ferreteria cuesta',
                  'cuesta libros', 'bebemundo', 'la bodega', 'merca jumbo'] },
};

export const CREDIT_CARD_CATALOG = [ /* ver §6.2 */ ];
```

Las llaves de categorías **por defecto** (`supermercado`, `combustible`, …) se resuelven
contra las categorías del usuario (no se redefinen aquí); ver §7.

### 6.1 Llaves de categorías por defecto → categoría de la app

| categoryKey | Categoría (nombre · tipo) |
|---|---|
| `supermercado`   | Supermercado · variable_expense |
| `combustible`    | Combustible · variable_expense |
| `restaurantes`   | Restaurantes y Delivery · variable_expense |
| `farmacia`       | Farmacia y Medicamentos · variable_expense |
| `streaming`      | Suscripciones Digitales · fixed_expense |
| `internet`       | Internet · fixed_expense |
| `telefono`       | Teléfono · fixed_expense |
| `mascotas`       | Mascotas · variable_expense |
| `transporte`     | Taxi y Transporte · variable_expense |
| `educacion`      | Educación · variable_expense |
| `amazon`         | Amazon · variable_expense |
| `entretenimiento`| Entretenimiento · variable_expense |
| `hogar`          | Hogar · variable_expense |
| `all`            | (literal) resto de consumos |

### 6.2 Tarjetas y reglas

Las notas (rotativa/escalonada/personalizable/no publicada) viven en un campo `note` del
template y se muestran como texto corto en el panel de cashback. **Nunca incluyen topes.**

```
Banco Popular Dominicano
- popular-visa-isi      "Visa ISI"        super 5, combustible 5, amazon 2, all 1
- popular-mc-infinia    "Mastercard Infinia"  super 10 (note: rotativa trimestral — ajústala),
                                              internet 2, telefono 2, all 1
- popular-mc-gnial      "Mastercard Gnial"     restaurantes 5, entretenimiento 5, streaming 5, all 1
- popular-visa-plus-ccn "Visa Plus CCN"        grupo-ccn 5 (note: escalonada 5/6/8 según consumo)

Banco BHD
- bhd-visa-premia       "Visa Premia"     super 5, internet 5, telefono 5, streaming 5, mascotas 5, all 1
- bhd-visa-mipais       "Visa Mi País"    farmacia 5, restaurantes 5, hogar 6 (note: 6% Corripio), all 1

Scotiabank
- scotia-visa-bravo     "Visa Bravo"      bravo 7, streaming 5, transporte 5, all 1

Banco Santa Cruz
- santacruz-visa-bravo  "Visa Bravo"      bravo 7, amazon 5, all 1

Qik Banco Digital
- qik-credito-basica    "Qik Crédito Básica"  all 1
- qik-pro               "Qik Pro"         restaurantes 5 (note: 5% personalizable — elige tu
                                          categoría), all 1

APAP
- apap-visa-familiar    "Visa Familiar"   super 10, combustible 5, farmacia 5, educacion 4
- apap-visa-sirena      "Visa Sirena"     sirena 8 (note: plan complementario personalizable), all 1

Banreservas
- banreservas-visa-ser  "Visa SER"        super 1, farmacia 1, combustible 1, educacion 1,
                                          transporte 1 (note: tasas variables no publicadas —
                                          ajústalas según tu tarifario), all 1

Banco Promerica
- promerica-visa-lama   "Visa Lama Plazos"  plaza-lama 9, all 1
```

Defaults de tarjetas rotativas/escalonadas/personalizables/no publicadas: se elige un valor
sensato y editable (la nota lo explica). El usuario lo ajusta vía "Personalizar cashback".

## 7. Resolución de cashback y categorías

Función pura/orquestadora en `src/utils/creditCards.js` (o `creditCardCatalog.js`):

```
resolveCardCashback(template, userCategories, ensureCategory) -> [{categoryId, percentage}]
```

Por cada regla `{categoryKey, percentage}` del template:

1. `categoryKey === 'all'` → `{ categoryId: 'all', percentage }`.
2. **Categoría por defecto** → buscar en `userCategories` por `slug` y, si no hay match (o
   el usuario no tiene slugs), por **nombre normalizado + tipo** (mismo `normalize` de
   `defaultCategories.js`). Usar su `id`.
3. **Ecosistema dedicado** (`CATALOG_CATEGORIES[key]`) → buscar por slug/nombre+tipo; si **no
   existe**, crearla vía `ensureCategory(def)` (que llama `addCategory` y devuelve el id) y
   mover sus keywords fuera del Supermercado del usuario (§7.1). Usar el id resultante.

`ensureCategory` es async (insert en Supabase). El flujo de "agregar predefinida" en el
store crea primero las categorías faltantes, obtiene sus ids y luego construye
`cashback_rules` antes de insertar la tarjeta.

Caso especial **telecom** (BHD Visa Premia): el catálogo ya expande a dos reglas (`internet`
y `telefono`) con el mismo %, así que no requiere lógica adicional.

### 7.1 Slugs y keywords (optimización de categorías)

- Agregar `slug` estable a las categorías por defecto de §6.1 en `defaultCategories.js`.
  Nuevos usuarios los reciben en el seed; usuarios existentes caen al match por nombre+tipo
  (no se requiere backfill).
- Quitar de las keywords por defecto de **Supermercado** las marcas que ahora tienen
  categoría dedicada (`bravo`, `sirena`, `la sirena`, `plaza lama`, `nacional`, `jumbo`),
  dejando solo genéricas (`supermercado`, `pricesmart`, `pola`, `super`, `colmado`,
  `almacen`, `aprovisiones`). Esto evita que el auto-categorizador rutee compras de
  ecosistema a Supermercado.
- Al crear una categoría de ecosistema bajo demanda, además de insertarla con sus keywords,
  **eliminar esas mismas keywords del Supermercado del usuario** (un `updateCategory`
  dirigido) para que el ruteo y por tanto el cashback sean correctos.

## 8. Componentes / UI (`CreditCardsPage.jsx`)

### 8.1 Crear

"Nueva Tarjeta" abre un primer paso de **tipo**:

- **Predefinida**: `select` Banco → `select` Tarjeta de ese banco. Al elegir, se pre-llenan
  `name`, `bank`, `color`, `catalogId` y las reglas de cashback resueltas (banco y nombre en
  solo-lectura). El usuario ingresa **día de corte** y **día de pago**. Panel colapsable
  **"Personalizar cashback"** reutiliza el editor de reglas actual (categoría + %). El color
  queda editable (cosmético).
- **Personalizada**: el formulario actual completo. `catalogId = null`.

### 8.2 Editar

- Predefinida (`catalogId != null`): banco/nombre en solo-lectura; corte/pago, color y
  cashback editables; botón **"Restaurar valores del banco"** que vuelve a llamar
  `resolveCardCashback` del template y reemplaza las reglas.
- Personalizada: igual que hoy.

### 8.3 Notas en UI

La `note` del template (rotativa/escalonada/personalizable/no publicada) se muestra como
texto auxiliar pequeño dentro del panel de cashback. **Sin topes.**

## 9. Lo que NO cambia

- `computeCashback` y el cálculo de cashback en `useTransactionStore` (sigue siendo % plano
  por categoría, por transacción).
- Presupuesto, "Por Asignar", "Puedes gastar", ciclos de tarjeta, marcar pagado, historial.
- El modelo de las tarjetas personalizadas existentes.

## 10. Pruebas (Vitest)

- `resolveCardCashback`: resuelve `all`, categoría por defecto por nombre (usuario sin
  slugs), categoría por defecto por slug, y ecosistema (existente vs. creación bajo demanda
  vía `ensureCategory` mock).
- Telecom expande a dos reglas con el mismo %.
- `creditCardCatalog`: cada template tiene `id`, `bank`, `name` únicos y reglas con
  `categoryKey` válidas (existe en defaults o en `CATALOG_CATEGORIES` o es `all`).
- Reusar los tests existentes de `computeCashback`/ciclos sin cambios.

## 11. Criterios de éxito

- Puedo crear una tarjeta eligiendo banco y modelo del catálogo; banco y nombre llegan fijos
  y el cashback se carga solo; solo defino corte y pago.
- Al elegir una tarjeta de ecosistema (p. ej. Scotia Visa Bravo), se crea la categoría
  "Bravo" automáticamente y el cashback alto aplica solo a ella.
- Puedo personalizar el cashback de una predefinida y restaurarlo a los valores del banco.
- Puedo seguir creando tarjetas personalizadas como hoy.
- Las tarjetas existentes siguen funcionando sin cambios.
- El cálculo de presupuesto y "Puedes gastar" no cambia.

## 12. Archivos afectados

- **Crear:** `src/data/creditCardCatalog.js`, `src/data/creditCardCatalog.test.js`.
- **Modificar:**
  - `src/utils/creditCards.js` (+ `resolveCardCashback`) y `creditCards.test.js`.
  - `src/data/defaultCategories.js` (slugs; limpieza de keywords de Supermercado).
  - `src/stores/useCreditCardStore.js` (`catalog_id` en map/payload; orquestar creación de
    categorías de ecosistema al agregar predefinida).
  - `src/stores/useCategoryStore.js` (helper `ensureCategory` / reuso de `addCategory`).
  - `src/pages/CreditCardsPage.jsx` (flujo tipo Predefinida/Personalizada; panel de cashback;
    bloqueo de banco/nombre; restaurar).
- **Migración SQL** (§5.1), ejecutada por el usuario.
