# Diseño — Pulido de Ajustes y Feedback · Stitch

Fecha: 2026-06-03 · Rama: `rebuild/stitch-pure` (local, no subir).

## Contexto

Últimas dos páginas pendientes (solo lectura/config, ya funcionales). Ajustes
(`StitchSettings.jsx`) tiene nivel de presupuesto, tasa USD, export/import,
categorías. Feedback (`StitchFeedback.jsx`) es un formulario Web3Forms. Ambas
divergen de lo ya pulido. Sin features nuevas; solo las 14 pautas.

Aclaración del usuario: los emojis de Feedback están bien (falsa alarma).

## Cambios (acordados)

### Ajustes (`StitchSettings.jsx`)
1. **Tasa manual → `StitchCurrencyInput`** en vez del `<input>` nativo (formateo de
   miles, value crudo). El handler `saveRate` ya recibe el valor crudo.
2. **`confirm()` nativo → toast de confirmación Stitch** para el reset de
   categorías: toast rojo "Esto borra tus categorías actuales. [Confirmar]" (~6s),
   patrón de los toasts de Deshacer.
3. **Aviso de import en demo:** `bulkAddTransactions` devuelve 0 sin sesión; en
   demo el import hoy muestra "No se encontraron filas válidas" (engañoso). Si
   `isDemoActive()`, mostrar "El import no está disponible en modo demo" y no
   procesar. (Export sí funciona en demo: usa los datos sembrados en memoria.)
4. **`Stagger`** de entrada para las tarjetas de configuración.
5. Íconos `!text-[Npx]`, tokens revisados.

NOTA verificada: `setBudgetLevel` y `setManualRate` ya manejan demo (caché local
optimista, `isDemoActive()` corta el backend) — funcionan sin cambios. El único
que requiere sesión es el import.

### Feedback (`StitchFeedback.jsx`)
1. **`Stagger`** de entrada (formulario + aside).
2. Tokens/íconos revisados. Formulario Web3Forms y emojis quedan igual.

## Arquitectura

Pulido directo sobre cada archivo (no ameritan carpeta de sub-componentes; son
manejables). Reuso de `StitchCurrencyInput`, `Stagger`, toasts, stores. Sin
lógica nueva ni selectores nuevos → sin tests unitarios nuevos.

## Testing y verificación

- No hay lógica pura nueva → los 126 tests existentes siguen verdes.
- `npm run build` (limpio), `npm run lint` (0).
- Dev server: `GET /` 200; módulos 200.
- Demo: en Ajustes, cambiar nivel de presupuesto y fijar tasa manual funcionan;
  import muestra el aviso de demo; reset pide confirmación vía toast; export
  funciona. Feedback entra con Stagger; el formulario se ve consistente.
- NOTA: sin driver de navegador no se conducen clics/envíos; se valida en QA demo.

## Fuera de alcance (YAGNI)

- Nuevas opciones de configuración (moneda por defecto, formato de fecha, borrar
  todos los datos).
- Modal de confirmación (se eligió toast).
- Tocar el formulario Web3Forms o los emojis de Feedback.
