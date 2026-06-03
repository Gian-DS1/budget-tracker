# FinTrack — Presupuesto Inteligente 🇩🇴

Aplicación web de finanzas personales pensada para República Dominicana. Reemplaza las hojas de cálculo con **presupuesto base cero**, control de deudas y tarjetas de crédito, metas de ahorro, transacciones recurrentes, análisis inteligente y recordatorios — todo sincronizado en la nube.

> Los datos se guardan en **Supabase** (Postgres + Auth) y se cachean localmente para que la app cargue al instante y funcione sin fricción.

---

## ✨ Características

- **Presupuesto** — niveles progresivos: Seguimiento (solo registrar), Regla 50/30/20, y **base cero** (asigna cada peso por categoría hasta que "Por Asignar" llegue a 0). Incluye **auto-sugerencia** con el promedio de tus últimos 3 meses y copiar el del mes anterior.
- **Transacciones** — registro rápido con auto-categorización, soporte multimoneda (USD→DOP a la tasa del día) y **transacciones recurrentes** que se crean solas.
- **Tarjetas de crédito** — ciclos de corte/pago automáticos, cashback por reglas, abonos parciales, **historial de estados de cuenta** y catálogo de tarjetas con cashback predefinido.
- **Deudas** — saldos, intereses, historial de pagos con transacción enlazada, estrategia avalancha y estimación de meses para liquidar.
- **Ahorros y metas** — metas con aportes registrados (cada aporte crea su transacción enlazada), proyección de fecha de cumplimiento, horizonte temporal opcional (corto/mediano/largo) e historial con deshacer.
- **Dashboard** — bento grid con KPIs, flujo del mes, anillo de salud financiera, donut de gastos, patrimonio neto y recordatorios. Selector de mes para revisar el pasado.
- **Reportes** — centro de análisis: ingresos vs gastos por mes, comparativa contra el mes anterior, insights (promedios y récords) y un **análisis inteligente** que recomienda acciones según tus datos.
- **Calendario** — vista mensual con movimientos pasados y **vencimientos futuros** (cuotas de deuda, pago de tarjetas, metas y recurrentes) + panel de próximos vencimientos.
- **Tasa USD→DOP** — automática (Banco Popular vía función serverless) con opción de fijarla manualmente.
- **Ajustes** — nivel de presupuesto, tasa de cambio, import/export CSV/Excel, gestión de categorías.

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 (Rolldown) |
| Enrutamiento | React Router v7 |
| Estado | Zustand 5 (con persistencia en `localStorage`) |
| Backend / Datos | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | Tailwind CSS v4 (`@theme` con tokens, tema oscuro "Stitch" periwinkle) |
| Gráficos | Recharts |
| Iconos | Material Symbols (UI) + JoyPixels v10 vía emoji-toolkit (emojis de categoría) |
| Animación | Framer Motion |
| Serverless | Funciones de Vercel (`/api/rate`) |
| Tests | Vitest |

---

## 🚀 Replicar el proyecto desde cero

### 1. Clonar e instalar
```bash
git clone https://github.com/Gian-DS1/budget-tracker.git
cd budget-tracker
npm install
```
> Nota: la dependencia `xlsx` se instala desde el **CDN oficial de SheetJS** (build mantenido y sin las vulnerabilidades del paquete publicado en npm). `npm install` la descarga automáticamente — solo necesita acceso a `cdn.sheetjs.com`.

### 2. Crear el proyecto Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta el contenido completo de [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas, activa **Row Level Security** y configura políticas y permisos. **Es obligatorio**: sin RLS, la llave anónima permitiría leer datos de otros usuarios.
3. En **Authentication → Providers** habilita **Email** (y opcionalmente **Google**; configura el redirect a tu dominio / `http://localhost:5173`).

> **Migraciones:** una base nueva creada desde `schema.sql` ya está completa. Para una base **existente** que predate el rediseño, corre las migraciones en orden — ver [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md).

### 3. Variables de entorno
```bash
cp .env.example .env
```
Rellena `.env` con los valores de **Supabase → Project Settings → API**:
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Ejecutar en local
```bash
npm run dev      # http://localhost:5173
```
Al registrarte por primera vez, la app **siembra automáticamente** las categorías por defecto adaptadas a RD.

### 5. Scripts disponibles
```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción (carpeta dist/)
npm run preview    # previsualizar el build
npm run lint       # ESLint
npm run test       # tests (Vitest)
```

---

## ☁️ Despliegue (Vercel)

1. Importa el repo en Vercel.
2. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Production + Preview).
3. *(Opcional)* Para la tasa del dólar del Banco Popular, agrega `TASAREAL_API_KEY` (variable **del servidor**, no `VITE_`). Sin ella, la app usa la tasa de mercado global como respaldo. Ver [`api/rate.js`](api/rate.js).
4. El archivo [`vercel.json`](vercel.json) ya configura el rewrite SPA (excluyendo `/api`).

---

## 🔒 Seguridad y privacidad

- **Aislamiento de datos por RLS.** Toda consulta filtra por `user_id` y la base lo refuerza con Row Level Security (`auth.uid() = user_id`). Ejecutar `supabase/schema.sql` deja esto configurado.
- **Secretos.** El archivo `.env` está en `.gitignore` y nunca se commitea. La `anon key` es pública por diseño (segura gracias a RLS). La `TASAREAL_API_KEY` vive solo como variable de entorno del servidor en Vercel — jamás en el bundle del cliente.
- **Caché local.** Para velocidad, los datos se cachean en `localStorage`. Al **cerrar sesión** se limpian las cachés sensibles.
- **Feedback.** La página de Feedback envía mensajes al correo del desarrollador vía el servicio externo **Web3Forms** (no almacena datos en tu base).

---

## 📁 Estructura del proyecto

```
budget-tracker/
├── api/                  # Funciones serverless de Vercel (tasa USD→DOP)
├── supabase/
│   ├── schema.sql        # Esquema completo (fuente de verdad, idempotente)
│   ├── MIGRATIONS.md     # Orden de migraciones para bases existentes
│   └── *.sql             # Migraciones puntuales + scripts de validación
├── src/
│   ├── stitch/           # Toda la UI: shell, pantallas (screens/), componentes y stitch.css
│   ├── contexts/         # AuthContext (sesión Supabase)
│   ├── data/             # Categorías por defecto (RD) + autocategorización
│   ├── lib/              # Cliente de Supabase
│   ├── stores/           # Estado global Zustand (uno por dominio)
│   └── utils/            # Cálculos financieros, formato, ciclos de tarjeta, constantes
├── docs/                 # Specs y planes de diseño/implementación
├── .env.example
└── vercel.json
```

> La UI vive íntegramente en `src/stitch/`. Cada pantalla con sub-componentes usa el patrón "shell delgado + carpeta `screens/<página>/`" con selectores puros testeables.

### Tablas (ver `supabase/schema.sql`)
`categories` · `transactions` · `budgets` · `savings` · `savings_contributions` · `debts` · `debt_payments` · `plans` *(legada; fusionada en `savings`)* · `credit_cards` · `recurring_transactions`

> `profiles` (preferencias del usuario, p. ej. nivel de presupuesto) se crea con su propia migración [`supabase/add_profiles_table.sql`](supabase/add_profiles_table.sql), no en `schema.sql`.

---

## 🧪 Tests

Lógica financiera y selectores de UI puros cubiertos con Vitest (presupuesto base cero, botes acumulativos, capacidad de ahorro, ciclos y cashback de tarjetas, recurrencia, proyección de metas, análisis de reportes, calendario):
```bash
npm run test
```
