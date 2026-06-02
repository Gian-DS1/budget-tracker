# Diseño: Niveles progresivos de presupuesto — FinTrack (Stitch)

- **Fecha:** 2026-06
- **Estado:** Aprobado (concepto) — pendiente de plan de implementación
- **Reemplaza:** el "Modo Simple vs. Avanzado" del spec base-cero (2026-05-28).

## 1. Problema

El presupuesto **base cero** es el más potente para optimizar, pero tiene fricción de
entrada alta: obliga a asignar cada peso por adelantado y "cuadrar a cero" cada mes.
Usuarios sin hábito de presupuestar lo abandonan: exige trabajo ANTES de ver valor.
Se observó resistencia real de personas que no entienden cómo funciona.

## 2. Idea central

No elegir un solo método. Los métodos financieros son **capas del mismo motor de
datos** (todos necesitan transacciones categorizadas). La diferencia es solo cuánta
estructura se le muestra al usuario. Se ofrece un **nivel de control progresivo** que
el usuario elige y puede cambiar cuando quiera:

| Nivel | Método | Idea en una frase | Fricción |
|---|---|---|---|
| 1 | Seguimiento | "Solo registra; mira a dónde se va tu dinero" | Mínima |
| 2 | 50/30/20 | "50% necesidades, 30% gustos, 20% ahorro/deuda" | Baja |
| 3 | Base cero / Sobres | "Asigna cada peso hasta llegar a 0" | Alta |

- **Default para usuarios nuevos: Nivel 1** (valor inmediato, cero configuración).
- El nivel se elige en onboarding y se cambia en Ajustes. Persistido por usuario.

## 3. Por qué funciona sin reescribir el motor

Las 37 categorías ya tienen `type` (income / fixed_expense / variable_expense /
savings). Eso permite derivar TODO automáticamente:

- **Nivel 1 (Seguimiento):** suma transacciones del mes y agrupa por categoría/tipo.
  No requiere presupuesto ni configuración. Usa `groupByCategory` / `calculateExpenses`.
- **Nivel 2 (50/30/20):** mapea los tipos a los tres baldes y compara contra los
  porcentajes objetivo sobre el ingreso del mes:
  - **Necesidades (50%)** = `fixed_expense` (alquiler, luz, internet, etc.).
  - **Gustos (30%)** = `variable_expense` (restaurantes, suscripciones, etc.).
  - **Ahorro/Deuda (20%)** = `savings` + pago de deuda planificado (useDebtStore).
  Tres barras de progreso, sin que el usuario configure categorías.
- **Nivel 3 (Base cero / Sobres):** el modelo del spec 2026-05-28 + sobres
  acumulativos (2026-05-29). `getBudgetSummary` ya lo soporta.

El número estrella **"Puedes gastar"** (sobre ingreso recibido) es transversal: se
muestra en los tres niveles, solo cambia el detalle alrededor.

## 4. Modelo de datos

Preferencia `budgetLevel: 'tracking' | '503020' | 'zero'` por usuario.

- **Dónde:** como el viejo `viewMode` vivía en `useThemeStore` (ya eliminado), se crea
  una preferencia nueva. Opciones: (a) tabla/columna `profiles.budget_level` en
  Supabase, o (b) un `usePrefsStore` con persist (localStorage) si no se quiere tocar
  BD en v1. Decisión al planificar; (b) es más rápido para QA.
- Default `'tracking'`. Migración de usuarios actuales: arrancan en `'zero'` (ya usan
  base cero) o en `'tracking'` — decidir al planificar.

## 5. UI (diseño Stitch)

- **Onboarding / Ajustes:** un selector de 3 opciones (usar `StitchSelect` o tarjetas
  de selección) con una frase explicativa por nivel. Cambiarlo recalcula la vista de
  Presupuesto y Dashboard, no toca datos.
- **Página Presupuesto (`StitchBudget`):** renderiza según el nivel:
  - Nivel 1: lista/gráfico de "a dónde se fue el dinero" este mes (sin metas).
  - Nivel 2: tres barras 50/30/20 (necesidades/gustos/ahorro-deuda) con real vs.
    objetivo, derivadas de los tipos de categoría.
  - Nivel 3: la vista de sobres por categoría (estimado editable + gastado) y "Por
    Asignar", como el spec base-cero.
- **Dashboard:** "Puedes gastar" + semáforo en los tres niveles. El detalle adicional
  (gráficos, sobres) aparece según el nivel.
- Todo con los componentes Stitch (StitchCurrencyInput para montos, DropdownPanel para
  selects, animaciones Emil) y branching de modo demo.

## 6. Alcance v1 sugerido

Incluido:
- Preferencia `budgetLevel` + selector en Ajustes (y/o onboarding).
- Render de los 3 niveles en `StitchBudget`.
- "Puedes gastar" + semáforo transversal (requiere la función estrella del spec
  base-cero; ver dependencia abajo).

Diferido:
- Onboarding guiado completo (tutorial).
- Sobres acumulativos en Nivel 3 (feature aparte, ya con lógica lista).
- Sugerencia inteligente de nivel según el comportamiento del usuario.

## 7. Dependencias

- **Función estrella "Puedes gastar":** el spec base-cero pide `calculateSafeToSpend`;
  hoy existe `getBudgetSummary` (parcial). Conviene implementar/unificar esa función
  primero, porque alimenta el número héroe en los tres niveles.
- Sobres acumulativos y tarjetas/abonos son independientes de este concepto.

## 8. Criterios de éxito

- Un usuario nuevo entra en Nivel 1 y entiende su situación sin configurar nada.
- Puede subir a 50/30/20 y ver tres barras claras derivadas automáticamente de sus
  categorías, sin clasificar nada a mano.
- El usuario avanzado conserva el base cero + sobres en Nivel 3.
- Cambiar de nivel nunca altera ni borra datos: solo cambia la presentación.
- "Puedes gastar" y el semáforo se ven en los tres niveles, con cifras idénticas a las
  del motor (fuente única de verdad).
