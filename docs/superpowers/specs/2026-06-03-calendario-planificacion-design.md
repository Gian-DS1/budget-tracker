# Diseño — Calendario como centro de planificación · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

`StitchCalendar.jsx` es la siguiente página a pulir (solo lectura, sin CRUD). Hoy
muestra una vista mensual con los días que tienen MOVIMIENTOS pasados
(transacciones), un detalle del día seleccionado, y navegación prev/next. Ya usa
datos reales, `<Emoji>` y tokens del tema.

Brechas frente a las páginas pulidas: sin `Stagger`; navegación solo con flechas
(el resto usa `StitchSelect`); no marca HOY; sin resumen del mes; y —lo más
importante— solo muestra el pasado, ignorando los VENCIMIENTOS futuros que la app
ya calcula (cuotas de deuda, pago de tarjetas, metas con deadline, recurrentes).

Decisión del usuario: pulir + mostrar vencimientos en el calendario + panel
lateral de "Próximos vencimientos". El Calendario se vuelve un centro de
planificación, no solo un registro del pasado.

## Decisiones (acordadas)

1. **Vencimientos de 4 fuentes** (todas con datos ya disponibles): cuotas de deuda
   (`useDebtStore`, due_date), pago de tarjetas (`useCreditCardStore` +
   `getCardBalances` → dueDateISO), metas con deadline (`useSavingsStore`),
   recurrentes programadas (`useRecurringStore`, nextDate/frequency/active).
2. **Distinción visual:** movimientos pasados = mini montos +/- (como hoy);
   vencimientos = puntos/íconos de color por tipo (deuda rojo, tarjeta ámbar, meta
   lima, recurrente cian). El panel del día separa "Movimientos" y "Vencimientos".
3. **Panel lateral "Próximos vencimientos":** lista de lo que viene (~30 días
   desde hoy), ordenada por fecha, con "en N días" y color por tipo; clic navega a
   la página relevante.
4. **Pulido:** `Stagger`, selector mes/año (`StitchSelect`) + flechas, marcar HOY
   (anillo periwinkle), resumen del mes (count-up), total del día, estados vacíos,
   ISO local sin `toISOString`.

## Arquitectura — shell + carpeta de sub-componentes + selectores puros

Carpeta nueva `src/stitch/screens/calendar/`:

| Archivo | Rol |
|---|---|
| `selectors.js` | Puros: `getDayMovements`, `getDueEvents`, `getMonthSummary`, `getUpcoming`. |
| `selectors.test.js` | Tests TDD. |
| `DayCell.jsx` | Celda del día: número, HOY, mini montos, puntos de vencimiento. |
| `DayDetail.jsx` | Panel del día: secciones "Movimientos" y "Vencimientos" + total. |
| `UpcomingRail.jsx` | Panel "Próximos vencimientos". |

`StitchCalendar.jsx` = shell: header + selector mes/año + flechas + resumen del
mes + grid + detalle + rail, con `Stagger`. Obtiene datos de los stores y los pasa
a los selectores; no contiene cálculo pesado.

### selectors.js — funciones puras

- `getDayMovements(transactions, year, month)` → `{ [day]: { income, expense,
  list: [tx] } }`. Income = 'income'; expense = fixed/variable/expense menos
  cashback.
- `getDueEvents({ debts, cards, goals, recurring }, year, month, now, transactions)`
  → `{ [day]: [{ type:'deuda'|'tarjeta'|'meta'|'recurrente', label, amount, color,
  to }] }`. Deuda: activas con due_date en el mes. Tarjeta: `getCardBalances` →
  dueDateISO con saldo pendiente. Meta: savings con deadline en el mes y no
  completada. Recurrente: plantillas activas con nextDate en el mes.
- `getMonthSummary(transactions, year, month)` → `{ income, expense, balance }`.
- `getUpcoming({ debts, cards, goals, recurring }, now, transactions, days=30)` →
  `[{ date, daysUntil, type, label, amount, color, to }]` ordenado por fecha,
  desde hoy hasta +days, excluyendo pasados.

Colores por tipo: deuda `text-accent-error`/rojo, tarjeta `text-accent-warning`/
ámbar, meta `text-tertiary`/lima, recurrente `text-secondary`/cian.

## Layout

```
HEADER: dot "Vista mensual" + "<Mes> <Año>" + [Selector mes][Selector año] + ‹ ›
RESUMEN DEL MES: Ingresos · Gastos · Balance (count-up)
[ GRID (lg:col-span-2) ]                 [ Detalle del día (col) ]
  encabezados L–D; HOY anillo periwinkle    Movimientos / Vencimientos / total
  movimientos: mini +/- ; vencimientos: puntos color
PRÓXIMOS VENCIMIENTOS (ancho completo): lista próx. ~30 días
LEYENDA: ● deuda ● tarjeta ● meta ● recurrente
```

- Selector mes/año con `StitchSelect`; se conservan las flechas ‹ › (sincronizadas
  con el estado).
- Celda clicable si tiene movimientos O vencimientos.
- `Stagger` de entrada; count-up en el resumen; navegación del rail vía
  `useNavigate`.

## Testing y verificación

- `selectors.test.js` (TDD): `getDayMovements` (vacío, agrupa por día, cashback,
  ignora otros meses), `getDueEvents` (cada tipo, fuera de mes se ignora, día sin
  eventos ausente), `getMonthSummary` (vacío→ceros, suma neta), `getUpcoming`
  (orden asc, excluye pasados, ventana N días).
- Componentes de presentación: build + carga, no unit.
- `npm run test` (115 + nuevos), `npm run build` (limpio), `npm run lint` (0).
- Dev server: `GET /` 200; módulos de `calendar/` 200.
- Demo: navegar meses; movimientos + vencimientos en celdas; HOY marcado; detalle
  con dos secciones; próximos vencimientos; clic navega.
- NOTA: sin driver de navegador no se conducen clics/hover; se valida en QA demo.

## Fuera de alcance (YAGNI)

- Crear/editar eventos desde el calendario (es solo lectura).
- Vista semanal o de agenda.
- Arrastrar para reprogramar.
- Notificaciones/alertas push.
