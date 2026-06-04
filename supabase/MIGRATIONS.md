# Migraciones — orden y notas de producción

Estas migraciones se corren **a mano** en el SQL editor de Supabase. Todas son
**idempotentes** (`if not exists`, `drop policy if exists`, copias con `not
exists`), así que re-correrlas en una base con datos es seguro.

## Para lanzar el rediseño (rama de UI) sobre una base con datos existentes

Correr **en este orden** antes de (o junto con) el despliegue del código nuevo:

1. **`add_savings_contributions.sql`** — añade `currency` y `monthly_contribution`
   a `savings`, y crea la tabla `savings_contributions`.
2. **`add_savings_horizon.sql`** — añade `horizon` a `savings` y copia las filas de
   `plans` a `savings` (fusión Plan→Ahorros).

⚠️ **El orden importa.** `add_savings_horizon.sql` escribe las columnas
`currency`/`monthly_contribution` que crea la migración #1. Correrlas al revés
falla con `column "currency" of relation "savings" does not exist`.

> La tabla `plans` NO se elimina (queda huérfana tras la fusión). Bórrala a mano
> solo cuando hayas verificado que las metas migraron bien.

### ¿Qué pasa si despliegas el código ANTES de correr estas migraciones?
- **Lecturas:** seguras. La pantalla de Ahorros carga; las columnas faltantes caen
  a sus valores por defecto y los aportes degradan a lista vacía.
- **Escrituras:** crear/editar/restaurar una meta de ahorro **falla con un toast**
  claro ("…puede faltar una migración de la base de datos") en vez de fallar en
  silencio. No corrompe datos. Registrar un aporte también avisa con toast.
- El resto de la app (transacciones, deudas, tarjetas, presupuesto, categorías)
  **no se ve afectado** por estas migraciones: sus datos legados cargan y se
  escriben sin cambios.

Conclusión: lo ideal es correr las dos migraciones (en orden) y luego desplegar.
Si el código sale antes, la app no se rompe; solo la creación/edición de metas de
ahorro queda temporalmente deshabilitada con aviso, hasta correr las migraciones.

## Tutorial guiado (product tour)

**`add_tutorial_seen.sql`** — añade la columna `tutorial_seen boolean` a
`profiles`. Controla que el tutorial guiado arranque solo la **primera vez**.

### ¿Qué pasa si despliegas el código ANTES de correr esta migración?
- **Lecturas:** seguras. `fetchPrefs` ignora la columna ausente y `tutorialSeen`
  queda en su default (`false`).
- **Efecto temporal:** como no se puede persistir "ya visto" en Supabase, el
  auto-arranque del tour podría reaparecer en cada dispositivo/recarga hasta que
  exista la columna (el caché local mitiga dentro del mismo navegador). El resto
  de la app no se ve afectado. Correr la migración resuelve el auto-arranque.

## Migraciones previas (ya aplicadas en producción histórica)

`schema.sql` es la fuente de verdad canónica (idempotente; ya incluye las columnas
y tablas nuevas con `if not exists`). Los demás `add_*.sql`/`*.sql`
(`add_profiles_table`, `add_card_payments_column`, `add_vehiculo_categories`,
`advisor_fixes`, `cleanup_duplicate_categories`) son migraciones puntuales
anteriores; no son requeridas por el rediseño de UI.
