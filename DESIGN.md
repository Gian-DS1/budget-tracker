---
name: FinTrack
description: Tablero de finanzas personales para República Dominicana, oscuro por defecto, con acento esmeralda y números monoespaciados.
colors:
  accent-emerald: "#10b981"
  accent-emerald-hover: "#059669"
  accent-cyan: "#06b6d4"
  income: "#10b981"
  expense: "#f43f5e"
  fixed: "#6366f1"
  variable: "#f59e0b"
  savings: "#06b6d4"
  debt: "#ef4444"
  info: "#3b82f6"
  bg-primary: "#0a0e1a"
  bg-secondary: "#111827"
  bg-tertiary: "#141b2d"
  bg-card: "#1a2236"
  bg-card-hover: "#1e2a42"
  text-primary: "#f1f5f9"
  text-secondary: "#94a3b8"
  text-tertiary: "#64748b"
  border-primary: "#ffffff10"
  light-bg-primary: "#e2e8f0"
  light-bg-card: "#f1f5f9"
  light-text-primary: "#0f172a"
  light-accent-emerald: "#059669"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0"
    fontFeature: "tabular-nums"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  "2xl": "1.25rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
  "16": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.25rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.accent-emerald-hover}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.bg-tertiary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  kpi-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "1.25rem 1.5rem"
  input:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  badge:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.label}"
---

# Design System: FinTrack

## 1. Overview

**Creative North Star: "El Tablero de Control"**

FinTrack se lee como el tablero de un instrumento financiero: oscuro, sereno y legible bajo cualquier luz. La superficie base es un azul-pizarra casi negro (`#0a0e1a`); sobre ella, lecturas que brillan en esmeralda (`#10b981`) y cifras en mono tabular que se alinean columna a columna como un display de precisión. El usuario maneja dinero en momentos de fricción (registrar un gasto, decidir un abono, ver cuánto queda por asignar) y el tablero existe para devolverle el timón: cada pantalla pone su lectura principal primero y la rodea de contexto, nunca al revés.

El sistema es **moderno y capaz**: defaults pulidos de fintech, estados nítidos, y las funciones inteligentes (auto-sugerencia, detección de anomalías, ciclos de tarjeta) hechas visibles en vez de escondidas en una caja negra. La densidad es alta donde el dato lo exige (tablas, calendario, KPIs) y suelta donde se respira (héroe "Puedes gastar", estados vacíos). El color semántico hace el trabajo pesado: ingreso/esmeralda, gasto/rosa, fijo/índigo, variable/ámbar, ahorro/cian, deuda/rojo, y siempre acompañado de signo o ícono, nunca solo del color.

Lo que este sistema **rechaza**: la app de banco corporativa y fría (navy estéril, formularios intimidantes); la hoja de cálculo que reemplaza (rejillas densas sin jerarquía); el look genérico de SaaS con IA (degradados morados, glassmorphism por todas partes, rejillas de tarjetas idénticas, plantilla de métrica-héroe); y lo infantil o gamificado (mascotas, confeti por defecto). El glassmorphism existe en el código hoy, pero es herencia a vigilar, no la identidad a amplificar.

**Key Characteristics:**
- Oscuro por defecto, con tema claro como soporte de legibilidad (no como segunda marca).
- Acento esmeralda único; el resto del color es semántico y se gana su lugar.
- Todos los números (montos, fechas, %, contadores) en JetBrains Mono tabular vía `unicode-range`.
- Jerarquía por escala + peso de Inter (300–800), no por familias que compiten.
- Radios contenidos (cards 12–16px, pills full); nada "insanely rounded".

## 2. Colors

Paleta oscura de instrumento: un campo azul-pizarra profundo, una sola voz de acento esmeralda, y una familia semántica de seis colores que codifica el tipo de movimiento de dinero.

### Primary
- **Esmeralda Señal** (`#10b981`, hover `#059669`): el acento único. Acciones primarias, enlace/selección activa en el sidebar, anillo de foco, ingresos, éxito, barra de progreso "good". En tema claro baja a `#059669` para conservar contraste sobre superficies pálidas.

### Secondary
- **Cian Instrumento** (`#06b6d4`): acento secundario y color de ahorros. Aparece en el degradado del logo y en estados informativos suaves. Úsalo con moderación; no compite con la esmeralda.

### Tertiary
Familia semántica de movimientos (cada una con su versión `-bg` a ~10% de opacidad para fondos de badge/alert):
- **Gasto Rosa** (`#f43f5e`): gastos, montos negativos, alert de peligro.
- **Fijo Índigo** (`#6366f1`): gastos fijos / recurrentes.
- **Variable Ámbar** (`#f59e0b`): gastos variables, advertencias, deuda en el dashboard.
- **Deuda Rojo** (`#ef4444`): saldos de deuda, acción destructiva.
- **Info Azul** (`#3b82f6`): balance neto, estados informativos.

### Neutral
- **Pizarra Base** (`#0a0e1a`): fondo de la app (`bg-primary`).
- **Pizarra Panel** (`#111827`): sidebar/segundo nivel (`bg-secondary`).
- **Pizarra Tarjeta** (`#1a2236`, hover `#1e2a42`): superficie de cards e inputs.
- **Tinta Primaria** (`#f1f5f9`): texto principal.
- **Tinta Secundaria** (`#94a3b8`): texto de apoyo, subtítulos.
- **Tinta Terciaria** (`#64748b`): metadatos, placeholders, labels.
- **Borde** (`rgba(255,255,255,0.06–0.10)`): divisores y contornos de superficie.

Tema claro: el fondo sube a pizarra clara (`#e2e8f0`), cards a `#f1f5f9`, tinta a `#0f172a`.

### Named Rules
**La Regla de Una Voz.** El acento esmeralda es el único color "de marca". Todo lo demás es neutral o semántico. Si un color no comunica un estado o un tipo de movimiento, no entra.

**La Regla del Signo.** El color nunca viaja solo. Ingreso vs. gasto, sobre vs. bajo presupuesto: siempre con signo (+/−), ícono o etiqueta, para que funcione sin distinción de color.

## 3. Typography

**Display / Body Font:** Inter (con `-apple-system, Segoe UI, Roboto` de respaldo)
**Number / Mono Font:** JetBrains Mono (con `Fira Code, Courier New` de respaldo)

**Character:** Una sola familia humanista (Inter) carga títulos, UI, labels y prosa; el contraste sale del peso (300–800) y la escala, no de mezclar tipografías. JetBrains Mono se reserva para **todos los números** del sistema, inyectada por `unicode-range` sobre los dígitos y sus separadores, de modo que cada cifra (montos, fechas, %, contadores) se alinea en columnas tabulares sin etiquetar cada elemento.

### Hierarchy
- **Display** (800, `1.875rem`, lh 1.1, ls −0.02em): título de página (`.page-title`). En el héroe del dashboard escala con `clamp(1.6rem, 4vw, 2.4rem)`.
- **Headline** (700, `1.25rem`): título de modal, encabezados de sección destacados.
- **Title** (600–700, `1rem`): título de card y de gráfico.
- **Body** (400, `0.875rem`, lh 1.6): texto base de la UI. Prosa larga a 65–75ch.
- **Label** (500–600, `0.75rem`, ls 0.06em, MAYÚSCULAS): labels de KPI, encabezados de tabla, secciones del sidebar. Reservado a etiquetas cortas, nunca a frases.
- **Mono / Número** (600, JetBrains Mono, `tabular-nums`, ls 0): toda cifra. Montos en una sola línea (`white-space: nowrap`).

### Named Rules
**La Regla del Número Mono.** Todo dígito del sistema sale en JetBrains Mono tabular, pase lo que pase. Es la firma del tablero: cifras que se leen como un instrumento, no como texto corrido.

**La Regla de Una Familia.** Inter para todo lo que no sea número. Prohibido introducir una segunda sans para "variar"; el contraste vive en el peso.

## 4. Elevation

El sistema usa hoy una combinación de **glassmorphism + sombra**: las superficies clave (`.card`, `.kpi-card`, `.chart-container`, sidebar, header) se construyen con `backdrop-filter: blur(16–20px)` sobre un fondo semitransparente (`--glass-bg`), borde sutil claro y una sombra difusa. Las KPI suman una barra de acento de 3px arriba y un `shadow-glow` esmeralda al pasar el mouse. La profundidad, por tanto, es **ambiental**: comunica "esto es una superficie elevada", no jerarquía estructural estricta.

### Shadow Vocabulary
- **Sombra Card** (`0 8px 32px rgba(0,0,0,0.3)` en oscuro; `0 1px 3px + 0 4px 16px` suave en claro): reposo de las superficies de contenido.
- **Sombra Card Hover** (`0 8px 32px rgba(0,0,0,0.4)`): realce al pasar el mouse.
- **Glow Esmeralda** (`0 0 20px rgba(16,185,129,0.15)`): exclusivo de KPI cards en hover; firma de acento.
- **Sombra Modal** (`0 25px 50px rgba(0,0,0,0.25)`): elevación máxima, solo diálogos.

### Named Rules
**La Regla del Glass a Vigilar.** El glassmorphism está en el código por herencia, no por doctrina. Es un acento puntual como máximo, nunca el default de toda superficie nueva. Anti-referencia declarada: "glassmorphism por todas partes" es justo lo que la marca evita. Para superficies nuevas, prefiere un fondo sólido (`--bg-card`) con borde sutil antes que otra tarjeta de vidrio.

## 5. Components

### Buttons
- **Shape:** radio contenido (`0.5rem` / `--radius-md`); variante `btn-lg` sube a `0.75rem`.
- **Primary:** esmeralda sólida, texto blanco, padding `0.75rem 1.25rem`, label en peso 500. Sombra de marca sutil (`0 2px 10px rgba(16,185,129,0.22)`).
- **Hover / Focus:** sube a `#059669`, `translateY(-1px)` y sombra más amplia; `:active` baja `translateY(1px)`. Foco con anillo `0 0 0 3px` del acento sutil.
- **Secondary:** fondo `--bg-tertiary`, borde sutil, texto primario. **Ghost:** transparente, texto secundario, fondo de acento sutil en hover. **Danger:** rojo sólido.

### Cards / Containers
- **Corner Style:** `1rem` (`--radius-xl`); modales a `1.25rem`. Nunca por encima de 16px en una card.
- **Background:** `--bg-card` (`#1a2236`); hoy variante glass con `--glass-bg` + blur.
- **Shadow Strategy:** ver Elevación (Sombra Card en reposo, hover sutil).
- **Border:** 1px del borde sutil claro; **prohibido** combinar borde 1px + sombra ancha como decoración doble en elementos nuevos.
- **Internal Padding:** `1.5rem` (cards), `1.25rem 1.5rem` (KPI).

### KPI Card (signature)
Superficie de lectura del tablero: label en mayúsculas pequeñas arriba, valor grande en mono tabular, un `kpi-change` tipo pill (positivo esmeralda / negativo rosa) y un ícono Lucide en la esquina. Barra de acento de 3px arriba cuyo color se inyecta por `--kpi-accent` según el estado (good/warning/danger). `overflow: visible` para no recortar tooltips.

### Inputs / Fields
- **Style:** fondo `--bg-input`, borde sutil, radio `0.5rem`, padding `0.75rem 1rem`. Números sin spinners (`.no-spinners`).
- **Focus:** borde esmeralda + anillo `0 0 0 3px` del acento sutil.
- **Select:** chevron SVG propio, `appearance: none`.

### Navigation
- **Sidebar** fijo de 260px (colapsa a 72px; off-canvas en móvil), superficie glass con blur. Links: texto secundario en reposo, esmeralda + fondo sutil en activo, con una pastilla de 3px a la izquierda del link activo. Secciones etiquetadas en label mayúscula (Principal / Patrimonio / Herramientas).
- **Header** fijo de 64px, glass, con buscador propio (oculto en móvil).

### Badges & Alerts
- **Badges:** pill (`--radius-full`), fondo semántico a ~10% + texto del color pleno (income/expense/fixed/variable/savings/debt).
- **Alerts:** fila con ícono + texto, fondo semántico suave y borde a juego (warning/danger/success/info).

## 6. Do's and Don'ts

### Do:
- **Do** mantener la app oscura por defecto (`#0a0e1a`) y tratar el tema claro como soporte de legibilidad, no como segunda identidad.
- **Do** usar la esmeralda (`#10b981`) como única voz de acento: acción primaria, selección activa, foco. En tema claro, `#059669`.
- **Do** renderizar todo número en JetBrains Mono tabular; los montos van en una sola línea.
- **Do** acompañar siempre el color de estado con signo (+/−), ícono o etiqueta (daltonismo).
- **Do** mantener radios de card en 12–16px y pills full para tags/botones.
- **Do** poner la lectura principal de cada pantalla primero, con jerarquía clara de escala + peso.

### Don't:
- **Don't** convertir el glassmorphism en el default de superficies nuevas; es herencia a vigilar, no la marca ("glassmorphism por todas partes" es anti-referencia explícita).
- **Don't** caer en el look genérico de SaaS con IA: degradados morados decorativos, rejillas de tarjetas idénticas (icono + título + texto), ni la plantilla de métrica-héroe con gradiente.
- **Don't** parecer banco corporativo frío: navy estéril, formularios densos e intimidantes.
- **Don't** reproducir la hoja de cálculo que reemplaza: rejillas de números del mismo peso sin jerarquía.
- **Don't** introducir confeti por defecto, mascotas ni cuteness caricaturesca sobre datos de dinero.
- **Don't** combinar `border: 1px solid` + `box-shadow` ancho (≥16px) como decoración doble en cards o botones; elige uno.
- **Don't** introducir una segunda familia tipográfica para "variar"; el contraste vive en el peso de Inter.
- **Don't** usar `border-left/right` >1px como franja de acento en cards, alerts o list items.
