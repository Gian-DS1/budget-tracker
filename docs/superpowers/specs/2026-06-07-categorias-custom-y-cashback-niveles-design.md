# Categorías personalizadas y cashback por niveles — Diseño

**Fecha:** 2026-06-07
**Estado:** aprobado (brainstorming), pendiente de plan de implementación

## Contexto

FinTrack ya tiene CRUD de categorías en el store (`addCategory`, `updateCategory`,
`deleteCategory`, toggle `isActive`) y un catálogo de tarjetas con cashback de
**% plano por categoría** (sin topes, por decisión de producto previa). El motor
`computeCashback` congela el cashback en `transaction.cashbackEarned` al guardar.

Este diseño cubre tres piezas independientes solicitadas por el usuario, más las
quick wins ya entregadas.

## Quick wins (YA ENTREGADAS — rama `feat/categorias-y-cashback-quickwins`)

1. **Bug dropdown "Todas las categorías"** (`CashbackEditor.jsx`): el selector usa
   `includeAllOption` de `StitchCategorySelect` (que ya lo soportaba) en vez de un
   botón aparte que, al deseleccionarse, no permitía volver a elegir "Todas".
   Mapea `'' <-> 'all'`.
2. **CCN → Mastercard**: `popular-mc-plus-ccn` / "Mastercard Plus CCN" (antes
   "Visa Plus CCN"). Nota actualizada con el escalonado real (5/6/8%, sin tope).
3. **Promerica eliminada**: tarjeta `promerica-visa-lama` y su categoría de
   ecosistema `plaza-lama` (ya sin uso) removidas del catálogo.

## Descomposición

| Pieza | Riesgo | Entrega |
| --- | --- | --- |
| A. Gestión de categorías (UI) | Bajo | Junto con B |
| B. Emoji picker (lista curada) | Bajo | Junto con A |
| C. Motor de cashback por niveles (CCN derivado) | Alto | Ciclo propio |

A + B se implementan juntas (UI, bajo riesgo). C va en su propio ciclo
spec→plan→implementación por su riesgo (toca cálculo de cashback).

---

## Sección A — Gestión de categorías (UI)

**Objetivo:** interfaz para crear/editar/eliminar categorías. El CRUD del store ya
existe; falta la UI.

**Decisiones de producto (confirmadas con el usuario):**
- Se mantienen las 37 categorías por defecto para cuentas nuevas; **todas** son
  eliminables, incluidas las del sistema, para que el usuario limpie su vista.
- Eliminar una categoría la borra siempre; las transacciones asociadas quedan sin
  categoría (la BD ya hace `ON DELETE SET NULL` en `transactions.category_id`).

**Componentes:**
- `StitchCategories.jsx` — nueva pantalla, ruta `categorias`, enlace en el menú
  lateral (`StitchShell`). Lista las categorías **agrupadas por tipo** (income /
  fixed_expense / variable_expense / savings). Cada fila: emoji + nombre + menú
  (editar / eliminar).
- `categories/categoriesUi.jsx` — re-exports de `formUi` (convención `*Ui.jsx`).
- `categories/CategoryForm.jsx` — modal crear/editar (patrón `CardForm`/`VaultForm`):
  campos nombre, tipo, emoji (EmojiPicker de la sección B), color, keywords
  opcionales (para auto-categorización). Usa `ModalShell` con render-prop.

**Datos:** sin cambios de schema. Las categorías custom se distinguen por
`slug = null` (las del sistema/ecosistema tienen slug). El store ya normaliza
`is_active`/`sort_order`.

**Eliminar:** confirma vía modal; llama `deleteCategory` (o `demoDelete` en demo).
El toast informa "N transacciones quedaron sin categoría" cuando aplica (se cuenta
con el store de transacciones, lectura local — no requiere round-trip).

**Modo demo:** mutaciones vía `demoAdd/Update/Delete` existentes.

**Reutilización:** lista y form comparten primitivas de `formUi.jsx`.

---

## Sección B — Emoji picker (lista curada)

**Objetivo:** reemplazar la lista fija de 12 emojis de `VaultForm` por un picker
con más variedad, curado para finanzas (decisión del usuario: lista curada, NO los
3,828 de emoji-toolkit, por usabilidad y rendimiento).

**Datos:** `src/data/emojiCatalog.js` — ~120-150 emojis agrupados por sección
(Dinero/Finanzas, Comida, Compras, Transporte, Hogar/Servicios, Salud, Ocio/Tech,
Educación/Otros). Cada entry: `{ char, name, keywords, group }`. Data estática,
ampliable.

**Componente `EmojiPicker`:**
- Grid agrupado por sección + buscador opcional (patrón del buscador de
  `StitchCategorySelect`).
- Animación origin-aware vía `DropdownPanel`; respeta `reduced-motion`.
- Celdas con `<Emoji>` (JoyPixels) para coherencia visual. Produce el **carácter
  unicode**, que es lo que `<Emoji e=...>` y el campo `icon` esperan.
- Sin librería externa de picker.

**Usos:** `CategoryForm` (principal) y `VaultForm` (migrado del inline de 12 al
nuevo picker; mejora sin cambiar su comportamiento más allá de más opciones).

---

## Sección C — Motor de cashback por niveles (CCN derivado)

**Objetivo:** cashback escalonado del grupo CCN (5% hasta RD$7,999, 6% de
RD$8,000–19,999, 8% desde RD$20,000), decidido por el **consumo mensual acumulado**
en grupo CCN, sin tope mensual. Auto-selección de la categoría Grupo CCN por
keywords.

**Decisión clave (confirmada con el usuario):** el nivel depende del acumulado
mensual, lo que implica que el cashback de una compra **cambia retroactivamente**
según el gasto CCN del mes. El modelo actual congela cashback por transacción, así
que para CCN se usa **cashback derivado (en vivo)**, no congelado.

**Diseño — dos caminos que conviven:**

1. **Congelado (actual, intacto):** tarjetas con reglas de % plano siguen igual.
   `cashbackEarned` se calcula y guarda al registrar. Cero cambios.

2. **Derivado por niveles (nuevo, CCN):**
   - Nueva forma de regla escalonada en la tarjeta:
     `{ categoryId, tiers: [{ upTo: 7999, pct: 5 }, { upTo: 19999, pct: 6 }, { upTo: Infinity, pct: 8 }] }`.
   - Función pura `getDerivedCashback(card, transactions, monthKey)`: filtra las
     transacciones de esa tarjeta+categoría CCN en el mes, acumula el gasto y
     aplica el nivel correspondiente al **total acumulado** del mes. Devuelve el
     cashback estimado del mes (no por transacción).
   - En la UI de Tarjetas, el cashback CCN se muestra como **"estimado del mes"**
     (derivado), separado del cashback congelado de otras reglas.

**Auto-selección por keywords:** se amplían los keywords de la categoría de
ecosistema `grupo-ccn` con la lista del usuario:
`Supermercados Nacional, Jumbo, Casa Cuesta, Ferretería Cuesta, Juguetón,
Cuesta Libros, Bebé Mundo, La Bodega`. `autoCategorize` (ya existente) rutea la
transacción a Grupo CCN cuando la descripción incluye uno de esos nombres.

**Fuera de alcance (YAGNI, confirmado):** topes mensuales, mínimos de consumo,
reglas por día de semana, topes en USD. Las demás tarjetas del catálogo
(Gnial, ISI, Bravo, SER, Mi País, Familiar, Sirena, Qik, Banesco, Sirena APAP,
etc.) entran/permanecen como **% plano con su mejor tasa por categoría**.

**Aislamiento y testing:** `getDerivedCashback` y el cálculo escalonado se
implementan como funciones puras nuevas en `utils/creditCards.js` con tests
unitarios dedicados (casos: por debajo del primer umbral, en cada salto de nivel,
acumulado que cruza umbral a media compra, mes sin consumo CCN) ANTES de tocar UI.
El camino congelado no se modifica.

## Riesgos

- **C toca presentación de cashback** en Tarjetas/Dashboard. Mitigación: funciones
  puras + tests antes de UI; los dos caminos no se mezclan.
- **Tarjetas CCN ya creadas** con el `catalogId` viejo (`popular-visa-plus-ccn`)
  perderán el botón "Restaurar valores del banco" (devuelve null en
  `getCatalogCard`). Impacto menor: las reglas guardadas en la fila no dependen del
  template. No rompe la app.

## Criterios de éxito

- Crear/editar/eliminar categorías desde la UI; las custom se usan en todas las
  pestañas (incl. reglas de cashback de tarjetas) porque todo lee del mismo store.
- Emoji picker con la lista curada disponible en CategoryForm y VaultForm.
- Una tarjeta CCN calcula 5/6/8% según el acumulado mensual del grupo CCN y lo
  muestra como estimado del mes.
- Escribir "Jumbo" / "Casa Cuesta" / etc. en una transacción rutea a Grupo CCN.
- `npm test` (Vitest), lint y build verdes; tests nuevos para el motor derivado.
