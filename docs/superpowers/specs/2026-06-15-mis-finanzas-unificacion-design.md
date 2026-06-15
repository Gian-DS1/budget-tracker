# Unificación "Mis finanzas" (Patrimonio + Ahorros + Deudas + Tarjetas) — Diseño

**Fecha:** 2026-06-15
**Tipo:** Unificación de pantallas + regla de no-repetición de información
**Estado:** Diseño aprobado en brainstorming, pendiente de plan de implementación

---

## Contexto y motivación

Hoy hay tres entradas separadas en el menú lateral (Ahorros, Deudas, Tarjetas), cada
una su propia pantalla. El usuario quiere **simplificar**: una sola pestaña que agrupe
todo el "dinero" (lo que tienes, lo que ahorras, lo que debes), con un resumen de
patrimonio arriba.

Además, el usuario fijó un **principio de diseño general**: *no repetir información entre
pantallas*. Cada DETALLE vive en un solo lugar; un TOTAL puede repetirse como contexto/
ancla, pero no el mismo detalle dos veces. Si te cambias de pestaña, es porque ahí hay
algo que no viste en otro lado. (Ver memoria `no-repetir-informacion`.)

## Objetivo

Una pantalla nueva **"Mis finanzas"** (`/mis-finanzas`) que:
1. Muestre un **resumen de patrimonio** arriba (patrimonio neto + 3 bolsas).
2. Agrupe Ahorros, Deudas y Tarjetas en **tabs internos**, reusando las pantallas
   actuales casi intactas como paneles.
3. **No repita** en los paneles los totales que ya están en el resumen.

## No-objetivos (YAGNI)

- NO fusionar los headers/modales de los tres paneles (cada panel conserva su filtro,
  su botón "+ nuevo" y sus modales tal cual).
- NO crear un botón "+ nuevo" contextual único.
- NO tocar la lógica de ningún store, ni los cálculos de payoff/projection.
- NO el barrido de no-repetición del resto de la app (dashboard vs transacciones, etc.):
  es un proyecto aparte posterior. Aquí solo se aplica a Mis Finanzas.
- NO cambios en Supabase ni migraciones (es reorganización de UI).

---

## Arquitectura

```
StitchFinances.jsx  (shell nuevo, ruta /mis-finanzas)
├── PatrimonioSummary.jsx  (nuevo)
│     Patrimonio neto (grande, count-up) + 3 bolsas: Efectivo · Ahorro · Deudas
├── Tabs  [ Ahorros | Deudas | Tarjetas ]   (estado local activeTab)
└── Panel activo (uno a la vez):
      VaultsPanel  ← contenido de StitchVaults SIN su <div> raíz ni su total de header
      DebtsPanel   ← contenido de StitchDebts  SIN su <div> raíz ni su total de header
      CardsPanel   ← contenido de StitchCards  SIN su <div> raíz ni su total de header
```

### Estrategia de reuso (bajo riesgo)

Cada pantalla actual (`StitchVaults`, `StitchDebts`, `StitchCards`) se convierte en un
**panel** que vive dentro de `StitchFinances`. El cambio en cada una es quirúrgico:

1. **Quitar el `<div className="p-md sm:p-margin-safe max-w-[1728px] mx-auto w-full">`
   raíz** (el padding/ancho ahora lo provee el shell de `StitchFinances`). El panel
   devuelve un fragmento.
2. **Quitar del header su línea de total** (regla de no-repetición — el total ya está en
   el resumen de arriba):
   - `StitchVaults`: quitar `"{totalAccumulated} <CountUp value={total}/>"`
     ([StitchVaults.jsx:75](../../../src/stitch/screens/StitchVaults.jsx#L75)).
   - `StitchDebts`: quitar la línea de deuda total del header (usa `getTotalDebt`).
   - `StitchCards`: el resumen de patrimonio NO incluye "tarjetas por pagar" (es deuda
     de corto plazo, distinta de los préstamos de la bolsa Deudas). Por tanto el panel
     Tarjetas SÍ conserva su total propio si lo tiene — no hay repetición con el resumen.
     No se quita nada del header de Tarjetas.
3. **Conservar intacto** el resto: el filtro, el botón "+ nuevo", el grid de items, los
   estados de modal y los modales. La lógica de stores no se toca.

**Decisión de nombres:** para mínima fricción, se pueden renombrar los archivos a
`VaultsPanel.jsx` etc., o conservar `StitchVaults.jsx` exportando el panel. El plan de
implementación decidirá; lo importante es que el contenido se reusa.

### Montaje condicional de paneles

Solo el panel del tab activo se monta (`{activeTab === 'vaults' && <VaultsPanel/>}`).
Así los modales de los otros paneles no existen mientras no es su tab → cero colisiones
de estado entre paneles. Al cambiar de tab, el panel anterior se desmonta (sus modales
se cierran solos).

---

## Componentes nuevos

### `PatrimonioSummary.jsx`

Resumen fijo sobre los tabs. Reusa stores/selectores existentes; CERO lógica de cálculo
nueva.

```
┌──────────────────────────────────────────────┐
│ PATRIMONIO NETO                                │
│ RD$ 1,432,025          (CountUp animado)       │
│                                                │
│ EFECTIVO        AHORRO         DEUDAS          │
│ RD$ 867,025     RD$ 605,000    −RD$ 40,000     │
└──────────────────────────────────────────────┘
```

- **Patrimonio neto** = efectivo + ahorro − deudas (CountUp).
- **Efectivo** = `getLiquidCash(transactions, initialCashBalance, cards)` (el mismo
  selector del dashboard, para que los números cuadren entre pantallas).
- **Ahorro** = `getTotalSaved()` (Σ `goal.currentAmount`, el cálculo ya corregido).
- **Deudas** = `getTotalDebt()`.
- Estética Stitch: rótulos `font-mono-data` en mayúsculas, neto en `font-headline`,
  colores del tema (deudas en `text-accent-error`). Animación de entrada con `<Stagger>`/
  motion respetando reduced-motion.

### `StitchFinances.jsx`

Shell: `<div>` raíz con padding/ancho (el que tenían las pantallas) → `PatrimonioSummary`
→ barra de tabs → panel activo.

- **Tabs:** control de pestañas estilo Stitch (activo en periwinkle/`text-primary` con
  indicador; inactivos en `text-on-surface-variant`; transición ~200ms). Estado local
  `activeTab` (`'vaults' | 'debts' | 'cards'`).
- **Tab inicial:** `'vaults'` por defecto, o el que indique el query param `?tab=` (al
  redirigir desde las rutas viejas).
- **i18n:** etiquetas de tabs reusan claves existentes (`nav.savings`, `nav.debts`,
  `nav.creditCards`); rótulos del resumen reusan `dashboard.liquidCash`,
  `dashboard.savedTotal`, y nuevas `finances.netWorth`/`finances.title` si faltan.

---

## Navegación y rutas

- **Menú lateral** (`StitchShell.jsx`): las 3 entradas (Ahorros, Deudas, Tarjetas) se
  reemplazan por UNA: **"Mis finanzas"** → `/mis-finanzas`, icono apropiado (p. ej.
  `account_balance_wallet` o `savings`). El menú baja de 8 a 6 destinos. La sección
  "Activos" del menú pasa a contener solo esta entrada (o se fusiona con Principal; el
  plan decide).
- **Rutas** (`StitchApp.jsx`): nueva `<Route path="mis-finanzas" element={<StitchFinances/>}/>`.
  Las rutas viejas redirigen para no romper enlaces/tour:
  - `/ahorros`  → `<Navigate to="/mis-finanzas?tab=vaults" replace />`
  - `/deudas`   → `<Navigate to="/mis-finanzas?tab=debts" replace />`
  - `/tarjetas` → `<Navigate to="/mis-finanzas?tab=cards" replace />`
- **`usePageTitle.js`:** mapear `/mis-finanzas` → `nav.finances`. Las viejas pueden
  quedar o quitarse (al redirigir, el título lo toma la nueva).
- **Tour (`tourSteps.js`):** verificar si algún paso ancla a `vaults-new`/`debts-*`/
  `cards-*`; como los paneles conservan esos `data-tour`, deberían seguir funcionando
  dentro del tab. Verificar en implementación que el tab correcto esté activo cuando el
  tour apunte a un ancla de ese panel (puede requerir abrir el tab desde el tour).

---

## Aplicación del principio "no repetir información" (en esta pantalla)

| Dato | Dónde vive (único) | Dónde se quita |
| --- | --- | --- |
| Ahorro TOTAL | Resumen de patrimonio (contexto) | Header del panel Ahorros |
| Deuda TOTAL | Resumen de patrimonio (contexto) | Header del panel Deudas |
| Metas individuales | Panel Ahorros (detalle único) | — (no estaban en otro lado) |
| Deudas individuales | Panel Deudas (detalle único) | — |
| Tarjetas individuales | Panel Tarjetas (detalle único) | — |
| Tarjetas por pagar (total) | Panel Tarjetas (NO está en el resumen) | — (no hay repetición) |
| Efectivo total | Resumen + dashboard (total de contexto, permitido) | — |

El detalle (las tarjetas/metas/deudas individuales) vive en un solo sitio. Los totales
solo aparecen en el resumen como ancla, no repetidos en cada panel.

---

## Manejo de errores / casos borde

- **Sin datos** en un tab (p. ej. cero metas): el panel conserva su empty-state actual
  (ya existe en cada pantalla).
- **Patrimonio neto negativo** (deudas > activos): se muestra en `text-accent-error`.
- **Demo y cuenta real:** funciona igual; los paneles ya ramifican `isDemoActive()`
  internamente (no se toca).
- **Query param `?tab=` inválido:** cae al tab por defecto (`vaults`).

## Testing

- **Unitario:** no hay lógica nueva de cálculo (el resumen reusa selectores ya testeados:
  `getLiquidCash`, `getTotalSaved`, `getTotalDebt`). Los tests de `payoff`/`projection`
  siguen verdes (no se toca esa lógica).
- **Verificación:** `npm run build` pasa; `npm test` verde; ESLint limpio; inspección
  visual en demo: los 3 tabs cambian de contenido, el resumen cuadra con cada panel, las
  rutas viejas redirigen al tab correcto, los CRUD/modales de cada panel funcionan.
- **No** se añaden tests de componentes UI (la app no los tiene).

## Reversibilidad

El cambio es de organización de UI. Revertir = restaurar las 3 rutas/entradas de menú y
volver a poner el `<div>` raíz + total en cada pantalla (todo recuperable desde git).
Ningún store ni cálculo se modifica, así que no hay riesgo de datos.

## Criterios de éxito

El usuario tiene UNA entrada "Mis finanzas" que muestra su patrimonio de un vistazo
(neto + efectivo + ahorro + deudas) y, debajo, tabs para gestionar el detalle de cada
categoría — sin ver el mismo total repetido al cambiar de tab. El menú lateral queda más
corto y la app, más simple.
