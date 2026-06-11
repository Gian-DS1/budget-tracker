# Globalización del núcleo — moneda única por usuario + categorías sin semilla

**Fecha:** 2026-06-11 · **Estado:** aprobado (pendiente plan de implementación)

## Idea

Que cualquier persona de cualquier país pueda usar FinTrack. Hoy el ADN es
dominicano: DOP como moneda base estructural (154 ocurrencias en 29 archivos),
par binario DOP/USD con tasa manual (`useRateStore`), y 37 categorías sembradas
con ~405 keywords de comercios de RD (edenorte, caasd, tropigas, claro…).

Decisiones tomadas en el brainstorming (con el usuario):

1. **Alcance: globalización del núcleo.** Idioma ya está (i18n es/en). Lo
   regional dominicano (catálogo de tarjetas, parsers de estados de cuenta)
   se queda como está: features disponibles, no bloquean a nadie.
2. **Moneda: UNA por usuario.** El usuario elige su moneda al empezar; todo
   vive en ella. Desaparecen el par DOP/USD, la tasa de cambio y el selector
   de moneda del form del Ledger. (Si algún día se quiere "gastos en USD
   viviendo en MX", se reintroduce como feature aparte — fuera de alcance.)
3. **Migración: todos al modelo nuevo.** Usuarios existentes quedan con
   `currency='DOP'`; sus transacciones USD se convierten a DOP con la tasa
   vigente del usuario, anotando el monto original en `notes`.
4. **Categorías: SIN semilla para usuarios nuevos.** Cada usuario crea las
   suyas. Muere el auto-seed (y el re-seed de faltantes en cada fetch).
   Consecuencia deliberada: el motor de keywords de fábrica deja de aplicar a
   usuarios nuevos; la **memoria por historial** (`suggestFromHistory`,
   spec 2026-06-11-transacciones-inteligentes) es el mecanismo de aprendizaje.

## 1. Perfil: moneda en `profiles`

La tabla `public.profiles` ya existe (una fila por usuario, `budget_level`).
Se añade:

```sql
alter table public.profiles add column if not exists currency text not null default 'DOP';
```

- Default `'DOP'` hace que todos los usuarios existentes queden migrados de
  facto a su realidad actual.
- El store de perfil existente (el que lee `budget_level`) expone también
  `currency` con la misma mecánica de lectura/escritura.
- Cambiarla después: editable en Ajustes con advertencia explícita de que los
  montos NO se convierten (solo cambia el formato/símbolo).

## 2. Onboarding mínimo

Al primer login de un usuario sin moneda elegida explícitamente (los usuarios
nuevos): un paso único antes del dashboard — "¿En qué moneda manejas tu
dinero?" con un select de monedas ISO 4217 comunes (USD, EUR, MXN, COP, ARS,
PEN, CLP, BRL, DOP, GTQ…) y buscador. Idioma no se pregunta: ya hay selector
es/en en el header.

Implementación: como el flag `tutorial_seen` existente — si `profiles` del
usuario no tiene fila o fue creada en este registro, se muestra el paso. Los
usuarios existentes (con fila previa) NO lo ven.

## 3. Moneda única en el código

- **`formatCurrency` / `formatCurrencyCompact`** (`src/utils/formatters.js`):
  se generalizan con `Intl.NumberFormat(locale, { style: 'currency', currency })`
  → símbolos y formato correctos para cualquier ISO 4217, sin mapa `CURRENCIES`
  manual. El código de moneda por defecto deja de ser `'DOP'` hardcodeado y
  pasa a leerse del perfil (helper `userCurrency()` análogo a `currentLocale()`).
- **Se elimina**: `useRateStore` (tasa manual), el campo Moneda del form del
  Ledger (y su flag `touched.currency`/chip), las conversiones `* fxRate` en
  cashback (`StitchLedger`, `useTransactionStore`, `useRecurringStore`,
  `useDebtStore`, `StitchDashboard`, `BudgetShell`, `StitchSettings`,
  `StitchApp`), el ajuste de tasa en Ajustes, y `currency` por transacción
  como concepto editable (la columna puede quedar en la BD, siempre igual a la
  del perfil, para no migrar el esquema de transacciones).
- **Memoria por historial**: `suggestFromHistory` deja de sugerir `currency`
  (campo sin sentido con moneda única); se simplifican módulo, tests, Ledger
  (queda categoría + tarjeta).
- Los importadores de estados siguen funcionando: importan montos en la
  moneda del usuario (hoy ya asumen una sola).

## 4. Categorías sin semilla

- **Muere en `useCategoryStore.fetchCategories`**: el seed inicial de
  `defaultCategories` Y el auto-insert de "faltantes" en cada fetch (hoy
  re-siembra lo borrado). `resetCategoriesToDefault` (Ajustes) se elimina o
  pasa a "borrar todas las categorías".
- `defaultCategories` queda SOLO como dato del modo demo (el demo sigue
  sembrando las 37 con keywords — es un showcase, no cambia).
- `autoCategorize` sigue existiendo: opera sobre las keywords que tenga cada
  categoría (las custom pueden tenerlas si el usuario las pone; el demo las
  tiene todas). Para usuarios nuevos su efecto es nulo hasta que haya datos —
  la memoria por historial cubre el aprendizaje.
- **Empty states obligatorios** (hoy asumen categorías): Ledger (form exige
  categoría → CTA "crea tu primera categoría" que abre el form de Categorías
  o un mini-create inline), Presupuesto (los 3 niveles sin categorías → CTA),
  Dashboard y Reportes (ya toleran listas vacías; verificar), tour del
  producto (no debe romperse sin categorías).
- `ensureCategory` (categorías de ecosistema para reglas de cashback) se
  mantiene: crea la categoría si no existe — compatible con "sin semilla".

## 5. Migración SQL (manual en Supabase, patrón del repo)

Archivo `supabase/globalize_single_currency.sql`:

1. `alter table profiles add column currency text not null default 'DOP';`
2. Insertar fila de perfil para usuarios que no la tengan (con DOP).
3. Conversión de transacciones USD: `amount = amount * <tasa>`,
   `currency = 'DOP'`, `notes = concat(notes, ' (US$ <original> @ <tasa>)')`.
   La tasa: la última guardada por el usuario en `useRateStore`/Ajustes (está
   en localStorage del cliente, NO en la BD) → el script la recibe como
   parámetro editable arriba del SQL, documentado en `MIGRATIONS.md`.
4. Documentar en `supabase/MIGRATIONS.md`.

Orden de despliegue: correr la migración ANTES de pushear el código (el código
viejo ignora la columna nueva; el nuevo la requiere).

## 6. Demo

El demo no cambia de fondo: siembra categorías + transacciones en DOP y fija
`currency='DOP'` en su perfil simulado. Es la vitrina del producto con datos
ricos; no necesita onboarding (lo salta).

## Fuera de alcance (explícito)

- Multi-divisa por usuario / tasas automáticas.
- Catálogos de tarjetas o parsers por país.
- Más idiomas que es/en.
- Packs regionales de categorías/keywords.

## Pruebas

- Unitarias: `formatCurrency` con varios ISO (USD/EUR/MXN/DOP, negativos,
  compactos); simplificación de `transactionMemory` (sin currency);
  cálculos de cashback sin rama fx.
- Visual demo: flujo completo sin regresiones (DOP).
- Manual producción: onboarding de un usuario nuevo (moneda EUR, cero
  categorías, crear una, registrar transacción, autollenado por historial).

## Riesgos

- La conversión USD→DOP es irreversible: el SQL debe correr con la tasa
  correcta y queda anotado el original en notes como respaldo.
- Quitar `useRateStore` toca 9 archivos: hacerlo en una tarea propia con
  build+tests en verde antes de seguir.
- Estados vacíos: el presupuesto por niveles es la pantalla con más supuestos
  sobre categorías existentes; revisar sus 3 niveles.

## Siguiente paso

Generar el plan de implementación con `writing-plans` (sesión nueva):
tareas sugeridas — (1) migración SQL + columna currency + store de perfil,
(2) formatters Intl + userCurrency, (3) retiro de useRateStore/fx (9 archivos),
(4) retiro del campo moneda en Ledger + simplificar transactionMemory,
(5) no-seed de categorías + empty states, (6) onboarding de moneda,
(7) verificación integral (tests/build/demo visual + prueba manual en prod).
