# Transacciones inteligentes — memoria por historial

**Fecha:** 2026-06-11 · **Estado:** aprobado

## Idea

La app aprende del usuario sin que él haga nada: al teclear la descripción de una
transacción nueva (o al importar un estado de cuenta), si esa descripción —igual o
similar— ya existe en su historial, los campos **categoría, tarjeta y moneda** se
autollenan con lo que el usuario eligió las veces anteriores. Guardar una
transacción ES el acto de aprendizaje; no hay confirmaciones ni escrituras extra.

Decisiones tomadas en el brainstorming:

- **Campos aprendidos:** categoría + tarjeta + moneda. El monto NO se rellena.
- **Aprendizaje silencioso:** sin toasts de confirmación.
- **Alcance:** formulario del Ledger + importador de estados de cuenta.
- **Enfoque elegido (A):** memoria derivada del historial de transacciones. Sin
  tabla nueva, sin migraciones, sin doble escritura. Funciona retroactivamente
  con lo ya registrado, en demo y en producción, multi-dispositivo (el historial
  ya sincroniza vía Supabase).

## Núcleo: `suggestFromHistory`

Módulo nuevo `src/data/transactionMemory.js` — funciones puras, sin React ni
stores (convención del proyecto: lógica testeable fuera de componentes).

```
suggestFromHistory(description, transactions)
  → { categoryId, cardId, currency, source: 'exact' | 'partial' } | null
```

### Normalización

Minúsculas, sin acentos (NFD), espacios colapsados y recortados — la misma
normalización que usa `autoCategorize` en `defaultCategories.js`.

### Matching

1. **Exacto primero:** transacciones pasadas cuya descripción normalizada es
   idéntica a la tecleada.
2. **Por contención después** (solo si no hubo exactas): una descripción contiene
   a la otra, en cualquier dirección. Ambas cadenas deben tener ≥ 4 caracteres.
3. Sin candidatas → `null` (el caller cae al sistema de keywords actual).

### Decisión por campo (independiente)

Entre las candidatas, cada campo se resuelve por separado:

- Gana el valor **más frecuente**; a igual frecuencia, el de la transacción
  **más reciente** (por fecha).
- `cardId` vacío/null cuenta como valor: si el patrón del usuario es "sin
  tarjeta" para ese comercio, NO se rellena tarjeta.
- `categoryId` vacío no compite (una transacción sin categoría no enseña nada
  sobre categorías).

## Formulario del Ledger (`StitchLedger.jsx`)

En `onDescription`, **solo al crear** (nunca al editar, igual que hoy):

1. `suggestFromHistory(description, transactions)` → si hay match, rellena
   categoría (+ tipo derivado de la categoría), tarjeta y moneda.
2. Sin match → fallback al comportamiento actual: `autoCategorize` por keywords
   + `cardForCategory` por reglas de cashback.

**Regla de oro: el autollenado nunca pisa una elección manual** hecha en esa
sesión del formulario. El flag actual `autoCat` (solo categoría) se generaliza a
flags por campo (categoría, tarjeta, moneda): tocar un campo a mano lo excluye
del autollenado hasta cerrar el form; mientras un campo siga en modo auto, cada
cambio de descripción puede actualizarlo.

**UI:** el chip ✨AUTO (`AutoCatChip`) que hoy marca la categoría aparece también
junto a tarjeta y moneda cuando vienen del historial, vía el slot `extra` de
`Field` en `formUi.jsx`.

## Importador (`StatementImportModal.jsx`)

Por cada fila: `suggestFromHistory` primero para la **categoría**; fallback a
`autoCategorize` como hoy. Tarjeta y moneda no aplican (las define el estado de
cuenta que se importa). Beneficio: comercios corregidos a mano una vez llegan
bien clasificados en la siguiente importación.

## Retiro del toast «¿Siempre clasificar X como Y?»

El trabajo de hoy (sin commitear) se retira porque el historial lo hace
silenciosamente y mejor:

- Toast y enganche en `submit` de `StitchLedger.jsx`.
- Acción `learnKeyword` de `useCategoryStore.js`.
- Helpers `buildLearnedKeyword` / `shouldLearnKeyword` y sus tests en
  `defaultCategories.{js,test.js}`.
- Claves i18n `learnKeywordPrompt/Yes/Done` (es/en).

Las keywords de fábrica (~405 en 37 categorías) siguen siendo el fallback para
descripciones nunca vistas.

## Rendimiento y casos borde

- Corre por tecla, como el `autoCategorize` actual: un barrido O(n) del array ya
  en memoria. Si algún día pesa, se memoiza un índice `Map` por descripción
  normalizada; no se optimiza de antemano.
- Descripciones tecleadas con < 4 caracteres → sin sugerencia.
- Borrar transacciones = olvidar el patrón (ya no hay evidencia).
- Demo y producción comparten el código: el helper opera sobre `transactions`
  del store (sembrado en demo, Supabase en real).

## Pruebas

**Unitarias** (`src/data/transactionMemory.test.js`, vitest):

- Match exacto gana sobre contención.
- Contención bidireccional con mínimo de 4 caracteres.
- Frecuencia gana; recencia desempata.
- Campos independientes (categoría de la mayoría, tarjeta de la mayoría, aunque
  vengan de transacciones distintas).
- "Sin tarjeta" como patrón aprendido.
- Historial vacío / sin match → null.

**Verificación visual en demo:** crear transacción con tarjeta y moneda
inusuales; reabrir el form, teclear la misma descripción → tres campos
autollenados con chips AUTO; una elección manual no se pisa; una fila del
importador con descripción conocida llega categorizada.
