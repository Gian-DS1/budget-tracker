# Presupuesto basado en el ingreso real (no en el estimado)

**Fecha:** 2026-06-28
**Estado:** Aprobado (diseño)

## Problema

El presupuesto base cero calcula "por asignar" contra el **ingreso estimado** (la suma
de los sobres de ingreso que el usuario teclea, p. ej. RD$120,000). Ese número es una
predicción y puede variar: el usuario quiere que el presupuesto se base en el **ingreso
real recibido** del mes.

Hoy `getBudgetSummary` calcula:

```
porAsignar = ingresoEstimado − fijos − variable − ahorro − acumulado − deuda
```

mientras que `puedesGastar`, `disponible`, `estado` y los niveles 50/30/20 y Seguimiento
**ya usan el ingreso recibido**. El único cálculo desalineado es `porAsignar`.

## Regla acordada (base del presupuesto)

Se introduce `ingresoBase` con respaldo al estimado solo mientras no haya ingreso:

```
ingresoBase = ingresoRecibido > 0 ? ingresoRecibido : ingresoEstimado
```

- **Recibido = 0** (inicio de mes, antes de cobrar): base = estimado → el usuario
  presupuesta normal.
- **Recibido > 0** (entró el primer peso): base = recibido → de ahí en adelante el
  presupuesto se ancla a lo real e **ignora** el estimado.

Caso borde aceptado: un ingreso parcial pequeño antes del salario hace que la base salte
a ese monto (por asignar se vuelve negativo hasta que entre el salario). Se acepta porque
el usuario cobra como depósito único. La variante "max(recibido, estimado)" queda como
posible blindaje futuro, NO se implementa ahora.

## Cambios

### Lógica (`src/utils/calculations.js`, `getBudgetSummary`)

1. Calcular `const ingresoBase = ingresoRecibido > 0 ? ingresoRecibido : ingresoEstimado;`
2. `porAsignar` usa `ingresoBase` en vez de `ingresoEstimado`.
3. Devolver `ingresoBase` en el objeto resumen.

Nada más en la matemática cambia. Identidad que se preserva:
`comprometido + gastosVariablesPlan + porAsignar = ingresoBase`.

### Display (`src/stitch/screens/budget/BudgetZero.jsx`)

- Línea "Reparto del plan": cerrar en `= ingresoBase` (antes `ingresoEstimado`). Cuando
  ya se cobró, la identidad mostrada será contra el ingreso recibido.
- Pie del card: mostrar siempre "Recibido RD$X"; añadir "· usando estimado RD$Y" **solo**
  cuando `ingresoRecibido === 0` y hay estimado, para avisar que la base es temporal.
- Tooltip de "por asignar": describir la nueva regla (se calcula sobre lo recibido; usa
  el estimado solo hasta que entre el primer ingreso).

### i18n (`src/i18n/translations.js`)

- Actualizar `toAllocateInfo` (es/en) a la nueva regla.
- Nueva clave para "usando estimado" (es/en).

## Pruebas (`src/utils/calculations.test.js`)

- Actualizar el test existente de `porAsignar` (hoy asume estimado).
- `recibido = 0` → `porAsignar` se calcula sobre el estimado.
- `recibido > 0` → `porAsignar` se calcula sobre lo recibido (ignora estimado).
- Identidad `comprometido + gastosVariablesPlan + porAsignar = ingresoBase`.
- `ingresoBase` se devuelve correctamente en ambos casos.

## Fuera de alcance

- La barra "Presupuesto del mes" del dashboard (ya compara gastado vs plan, no usa ingreso).
- Niveles 50/30/20 y Seguimiento (ya usan ingreso recibido).
- Variante "max(recibido, estimado)".
