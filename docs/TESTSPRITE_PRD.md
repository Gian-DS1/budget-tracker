# FinTrack — Descripción de Producto para Testing (PRD)

## Qué es
FinTrack es una aplicación web de finanzas personales para República Dominicana
(idioma: español). Reemplaza las hojas de cálculo con presupuesto, control de
deudas y tarjetas de crédito, metas de ahorro, análisis y recordatorios. SPA en
React; datos en Supabase (Postgres + Auth).

## Cómo acceder para probar (IMPORTANTE)
La app requiere iniciar sesión. Para pruebas, usar el **modo demo**:
1. En la pantalla de login hay un botón **"Entrar como demo"**.
2. Al pulsarlo, la app entra con **datos de ejemplo en memoria** (categorías,
   transacciones, una tarjeta, dos deudas, cuatro metas de ahorro) sin necesidad
   de cuenta.
3. En modo demo, navegar y leer todas las páginas funciona; crear/editar/borrar
   funciona en memoria (no persiste tras recargar) y muestra toasts de
   confirmación. Esto es esperado.
4. Para salir del demo: menú del avatar (arriba a la derecha) → "Salir del demo".

> Idioma de la UI: **español**. Moneda: pesos dominicanos (RD$). Los textos a
> verificar están en español.

## Navegación principal
- **Barra lateral izquierda** (desktop) con secciones: Resumen (Dashboard),
  Transacciones, Presupuesto, Ahorros, Deudas, Tarjetas, Calendario, Reportes.
- **Avatar arriba a la derecha** → menú de cuenta con: Ajustes, Feedback, Cerrar
  sesión / Salir del demo.
- En móvil, la barra lateral se abre con un botón hamburguesa.

## Páginas y flujos a probar

### 1. Landing + Autenticación (públicas)
- Landing page con presentación del producto y botón para entrar/registrarse.
- Login: email + contraseña; opción de registrarse; recuperar contraseña.
- Botón "Entrar como demo" (debe llevar al Dashboard con datos de ejemplo).

### 2. Dashboard / Resumen
- KPIs: "Puedes gastar", "Tarjetas por pagar", "Tasa de ahorro".
- Gráfico de flujo del mes (área) con un **selector de mes** (cambiar el mes
  recalcula el flujo, presupuesto, etc.; patrimonio/salud/recordatorios siguen
  siendo de hoy).
- Anillo de **salud financiera** (número 0–100 + etiqueta).
- **Donut de gastos por categoría** (hover resalta el segmento).
- Barra de **patrimonio** (ahorro vs deuda).
- Panel de **recordatorios** (pagos próximos) — clic navega a la página relevante.
- Íconos de información (ⓘ) en los KPIs: hover muestra cómo se calcula el número.

### 3. Transacciones
- Tabla de transacciones con filtros (búsqueda, tipo, categoría, rango de fechas).
- Crear transacción: monto, categoría (con buscador y emojis), fecha (datepicker),
  descripción. El tipo se deriva de la categoría.
- Editar y borrar (el borrado ofrece "Deshacer" por unos segundos).

### 4. Presupuesto
- Tres niveles: Seguimiento, Regla 50/30/20, Base cero (se elige en Ajustes).
- En base cero: asignar montos por categoría; ver planificado vs real.
- Botones para auto-sugerir presupuesto y copiar el del mes anterior.

### 5. Ahorros (metas)
- Tarjetas de metas con saldo, % de progreso, proyección de fecha.
- Crear meta: nombre, monto objetivo, saldo inicial, aporte mensual, fecha límite,
  moneda, horizonte (corto/mediano/largo), ícono.
- "Abonar" a una meta (registra un aporte). Ver historial de aportes. Editar y
  borrar (con "Deshacer"). Filtro por horizonte.

### 6. Deudas
- Tarjetas de deudas (estrategia avalancha). Saldo, interés, cuota, proyección de
  liquidación.
- Crear deuda; registrar pago; ver historial; editar; borrar (con "Deshacer").

### 7. Tarjetas de crédito
- Tarjetas con ciclo de corte/pago, saldo pendiente, cashback.
- Crear tarjeta (o desde catálogo); registrar pago / abono parcial; ver historial.

### 8. Calendario
- Vista mensual; selector de mes/año + flechas. El día de HOY está marcado.
- Días con movimientos muestran montos; días con vencimientos muestran puntos de
  color (deuda/tarjeta/meta/recurrente — hay una leyenda).
- Clic en un día abre el detalle (movimientos + vencimientos del día).
- Panel "Próximos vencimientos" (lo que vence en los próximos ~30 días).

### 9. Reportes
- Selector de rango (6/12/24 meses) que recalcula todo.
- KPIs de salud. Panel "Análisis inteligente" con recomendaciones priorizadas.
- Gráfico de barras "Ingresos vs gastos por mes".
- Tarjetas de insight (gasto promedio, mes de mayor gasto, etc.).
- "Cambios vs mes anterior" (barras divergentes por categoría con +/- %).

### 10. Ajustes
- Selector de nivel de presupuesto (Seguimiento / 50-30-20 / Base cero).
- Tasa de cambio USD→DOP (automática o fijar manual).
- Datos: importar CSV/Excel, exportar a CSV/Excel. (En demo, el import muestra un
  aviso de que no está disponible.)

### 11. Feedback
- Formulario para reportar error / sugerir mejora / comentario (tipo, asunto,
  descripción) + botón enviar.

## Qué verificar de forma transversal
- La UI carga sin errores de consola tras entrar en modo demo.
- Navegar entre todas las páginas de la barra lateral funciona.
- Los formularios validan campos requeridos (mostrar error si falta el asunto/monto).
- Los botones de acción responden (crear/editar/borrar muestran toasts).
- No hay scroll horizontal en las páginas; el contenido es responsive.
- Los montos se muestran formateados (RD$ con separador de miles), sin cortarse.

## No probar / fuera de alcance
- Persistencia real en backend (en demo no persiste; es esperado).
- Pagos reales, envío real de feedback (usa un servicio externo).
