# Diseño — Fusión de Plan dentro de Ahorros · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

Tras pulir Ahorros (`screens/vaults/`), la siguiente página del handoff era Plan
(`StitchStrategy.jsx`). Al revisarla se decidió **no pulirla por separado** sino
**fusionarla dentro de Ahorros**: Plan y Ahorros son conceptualmente lo mismo
(metas con monto objetivo + acumulado + fecha límite). Plan solo aportaba un
agrupamiento por horizonte temporal (corto/mediano/largo) y un campo
descripción; su tabla `plans` era CRUD simple sin aportes.

### Estado de partida

- `src/stitch/screens/StitchStrategy.jsx`: página Plan con grid de 3 columnas por
  horizonte + KPI strip; inputs nativos (`<select>`, `<input type=date>`); modal
  inline; sin demo branching ni Deshacer.
- `src/stores/usePlanStore.js`: CRUD simple sobre tabla `plans`
  (title, description, target_amount, current_amount, deadline, type=horizonte,
  status). Sin aportes ni transacción enlazada.
- Ahorros ya pulido: metas con aportes registrados (`savings_contributions`),
  transacción de ahorro enlazada, aporte mensual, proyección, historial con
  Deshacer, demo branching. Tabla `savings` con `currency`/`monthly_contribution`.
- Consumidores de `plans`: `StitchApp.jsx` (ruta `/plan` + `fetchPlans`),
  `StitchShell.jsx` (entrada de menú "Plan"), `StitchDashboard.jsx` (alerta "Meta
  próxima" para planes con deadline ≤30 días, enlaza a `/plan`),
  `demoMode.js` (siembra `plans`).

## Decisiones (acordadas en brainstorming)

1. **Fusión total:** Plan desaparece como página Y como modelo. Todo se vuelve
   "metas de ahorro" con un campo `horizonte` opcional.
2. **Migrar datos `plans → savings`** vía script SQL que el usuario corre a mano.
   La tabla `plans` queda huérfana pero NO se borra (seguridad; el usuario decide
   cuándo eliminarla).
3. **Modelo unificado simple:** una sola clase de meta. Todas tienen
   aportes/proyección/moneda. El `horizonte` (short/medium/long/null) es solo una
   etiqueta para agrupar/filtrar; NO cambia la lógica. Los planes migrados llegan
   como metas normales con su saldo como saldo inicial y `monthly_contribution` 0.
4. **Presentación:** se mantiene el grid de tarjetas de Ahorros (no las 3 columnas
   rígidas de Plan) + un control de agrupar/filtrar por horizonte. "Plan" se quita
   del menú lateral.
5. **`description`:** no se añade a `savings`. En la migración, si el plan tenía
   descripción, se concatena al título (`"Comprar casa — inicial 20%"`).

## Capa de datos

### Migración SQL — `supabase/add_savings_horizon.sql` (idempotente, corre a mano)

```sql
-- Fusión Plan→Ahorros: columna horizonte en savings + migración de plans.
-- Correr a mano en el SQL editor de Supabase. Idempotente.

-- 1. Columna horizonte (nullable: las metas normales no la necesitan).
alter table public.savings add column if not exists horizon text;  -- short | medium | long | null

-- 2. Copia cada plan del usuario a savings como meta con saldo inicial.
--    title := title (+ ' — ' + description si hay). type → horizon.
--    current_amount → saldo. monthly_contribution := 0. currency := 'DOP'.
--    status: 'completed' si current>=target>0, si no 'active'.
--    Idempotente vía NOT EXISTS por (user_id, title) para no duplicar al re-correr.
insert into public.savings (user_id, title, target_amount, current_amount, deadline, icon, color, status, currency, monthly_contribution, horizon)
select
  p.user_id,
  case when p.description is not null and length(trim(p.description)) > 0
       then p.title || ' — ' || p.description else p.title end,
  p.target_amount,
  p.current_amount,
  p.deadline,
  '🎯',
  '#bec2ff',
  case when p.current_amount >= p.target_amount and p.target_amount > 0 then 'completed' else 'active' end,
  'DOP',
  0,
  p.type
from public.plans p
where not exists (
  select 1 from public.savings s
  where s.user_id = p.user_id
    and s.title = (case when p.description is not null and length(trim(p.description)) > 0
                        then p.title || ' — ' || p.description else p.title end)
);

-- La tabla public.plans NO se elimina aquí. Queda huérfana; el usuario decide
-- cuándo borrarla una vez verificada la migración.
```

El SQL canónico de `schema.sql` gana la columna `horizon` en `savings`. La tabla
`plans` permanece en `schema.sql` (no se borra del schema; solo se deja de usar
desde la app).

### `src/stores/useSavingsStore.js`

- `fetchGoals`: mapear `horizon: g.horizon || null`.
- `addGoal`: payload incluye `horizon: goal.horizon || null`; formatted incluye
  `horizon`.
- `updateGoal`: `if (updates.horizon !== undefined) dbUpdates.horizon = updates.horizon || null;`
  y el `set` local ya propaga `...updates`.
- `restoreGoalWithContributions`: el payload de inserción incluye
  `horizon: goal.horizon || null` (para que el Deshacer conserve el horizonte).
- Nada más cambia: aportes, proyección, transacción enlazada intactos.

### `src/stitch/demoMode.js`

- Metas demo (`goals`): añadir `horizon` de ejemplo (p. ej. g1 `null`, g2 `medium`,
  g3 `long`) para ejercitar el filtro.
- `demoAddGoal`/`demoUpdateGoal`/`demoRestoreGoal`: pasar/propagar `horizon`.
- **Eliminar** la siembra de `plans` en `seedDemoStores` y el `import usePlanStore`.
- Eliminar el array `plans` de los datos de ejemplo.

## Limpieza de Plan (deja de existir como página)

- `StitchApp.jsx`: quitar `import StitchStrategy`, la `<Route path="plan">`, el
  `import usePlanStore` y la llamada `fetchPlans()` (y su dependencia en el
  `useEffect`).
- `StitchShell.jsx`: quitar la entrada de menú `{ to: '/plan', icon: 'flag', label: 'Plan' }`.
- `StitchDashboard.jsx`: la alerta "Meta próxima" debe leer de `savings` (metas
  con `deadline` ≤30 días y `status !== 'completed'`) en vez de `plans`, y enlazar
  a `/ahorros`. Quitar `import usePlanStore` y la suscripción `plans`; usar `goals`
  de `useSavingsStore`. NOTA INTENCIONAL: tras la fusión la alerta cubrirá TODAS
  las metas de ahorro con fecha límite cercana (no solo los antiguos "planes").
  Esto es deseado y coherente con la fusión, no un bug; es una mejora de cobertura
  (antes las metas de ahorro con deadline no generaban alerta).
- **Borrar:** `src/stitch/screens/StitchStrategy.jsx` y `src/stores/usePlanStore.js`.

## Capa de presentación (Ahorros unificado)

### `VaultForm.jsx`

Añadir un campo **Horizonte** (`StitchSelect`) en la fila de 2 columnas junto a
Moneda. Opciones: `{ value: '', label: 'Sin horizonte' }`, `short` "Corto plazo
(< 1 año)", `medium` "Mediano plazo (1–5 años)", `long` "Largo plazo (5+ años)".
El estado `form` gana `horizon` (cadena vacía = null). Se envía en `data` tanto
al crear como al editar.

### `StitchVaults.jsx` (shell)

Añadir un control de **filtro por horizonte** en el header (un `StitchSelect`
compact: Todas / Corto / Mediano / Largo / Sin horizonte). Estado local
`horizonFilter` (default `''` = todas). El grid mapea
`goals.filter(byHorizon)` donde `byHorizon` deja pasar todo si el filtro está
vacío. El resto del shell (header, total, Deshacer, modales) intacto.

### `VaultItem.jsx`

Un chip pequeño y discreto del horizonte (8px, atenuado, estilo del badge USD)
junto al badge USD, SOLO si `goal.horizon` existe. Etiquetas: Corto / Mediano /
Largo. No cambia nada más de la tarjeta.

## Pautas aplicadas (handoff §1–14)

`StitchSelect` para horizonte (nunca `<select>` nativo) · tokens del tema · chip
discreto · español sentence-case · demo branching ya presente · ningún dropdown
recorta. El `horizon` es puramente presentacional; no toca la lógica de aportes
ni de proyección.

## Testing y verificación

- Los 82 tests existentes deben seguir verdes (esta fusión no añade lógica
  testeable nueva; `projection.js` no cambia).
- `npm run build`, `npm run lint` (0 errores), `npm run test` (82).
- `http://localhost:5173/` responde 200; el menú ya NO muestra "Plan"; navegar a
  `/plan` directo no rompe (la ruta se quitó → cae al fallback del router).
- En demo: crear meta con horizonte, filtrar por horizonte, ver el chip en la
  tarjeta. Dashboard muestra la alerta "Meta próxima" leyendo de savings.

## Fuera de alcance (YAGNI)

- Borrar la tabla `plans` (se deja huérfana; decisión del usuario).
- Campo `description` propio en savings (se anexa al título en la migración).
- Layout de 3 columnas por horizonte (se mantiene el grid + filtro).
- Que el horizonte altere la proyección o la lógica de aportes.
- Migrar `plans` cuyo equivalente ya exista en `savings` (la migración es
  idempotente por (user_id, title)).
