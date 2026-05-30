# FinTrack RD — Presupuesto Inteligente 🇩🇴

Aplicación web de finanzas personales pensada para República Dominicana. Reemplaza las hojas de cálculo con **presupuesto base cero**, control de deudas y tarjetas de crédito, metas de ahorro, transacciones recurrentes, análisis inteligente y recordatorios — todo sincronizado en la nube.

> Los datos se guardan en **Supabase** (Postgres + Auth) y se cachean localmente para que la app cargue al instante y funcione sin fricción.

---

## ✨ Características

- **Presupuesto base cero** — asigna cada peso por categoría hasta que "Por Asignar" llegue a 0; compara planificado vs. real.
- **Transacciones** — registro rápido con auto-categorización, descripción con formato automático, soporte multimoneda (USD→DOP a la tasa del día) y **transacciones recurrentes** que se crean solas.
- **Tarjetas de crédito** — ciclos de corte/pago automáticos, cálculo de cashback por reglas, **historial de estados de cuenta** y cashback acumulado de por vida.
- **Deudas** — saldos, intereses, historial de pagos, estimación de meses para liquidar y fecha de pago con recordatorio.
- **Ahorros** — metas tipo "sobre" con progreso y proyección.
- **Plan financiero inteligente** — cruza tus datos reales para estimar tu capacidad de ahorro y la viabilidad de tus metas.
- **Dashboard y Calendario** — KPIs, tendencias de 6 meses, distribución de gastos y actividad diaria.
- **Reportes** — detección de anomalías, proyecciones, estrategia de pago de deudas, import/export Excel/CSV.
- **Recordatorios 🔔** — avisos de pagos próximos (tarjetas, deudas, recurrentes).
- **Tasa USD→DOP** — automática (Banco Popular vía función serverless) con opción de fijarla manualmente.
- **UI moderna** — modo claro/oscuro, glassmorphism, responsive (móvil y escritorio) y tour guiado integrado.

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 (Rolldown) |
| Enrutamiento | React Router v7 |
| Estado | Zustand 5 (con persistencia en `localStorage`) |
| Backend / Datos | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | CSS plano (Custom Properties) |
| Gráficos | Recharts |
| Iconos | Lucide React |
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

### 2. Crear el proyecto Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta el contenido completo de [`supabase/schema.sql`](supabase/schema.sql). Esto crea las 9 tablas, activa **Row Level Security** y configura las políticas y permisos. **Es obligatorio**: sin RLS, la llave anónima permitiría leer datos de otros usuarios.
3. En **Authentication → Providers** habilita **Email** (y opcionalmente **Google** si quieres login con Google; configura el redirect a tu dominio / `http://localhost:5173`).

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
3. *(Opcional)* Para obtener la tasa del dólar del Banco Popular, agrega `TASAREAL_API_KEY` (variable **del servidor**, no `VITE_`). Sin ella, la app usa la tasa de mercado global como respaldo. Ver [`api/rate.js`](api/rate.js).
4. El archivo [`vercel.json`](vercel.json) ya configura el rewrite SPA (excluyendo `/api`).

---

## 🔒 Seguridad y privacidad

- **Aislamiento de datos por RLS.** Toda consulta filtra por `user_id` y la base de datos lo refuerza con Row Level Security (`auth.uid() = user_id`). Ejecutar `supabase/schema.sql` deja esto configurado.
- **Secretos.** El archivo `.env` está en `.gitignore` y nunca se commitea. La `anon key` es pública por diseño (segura gracias a RLS). La `TASAREAL_API_KEY` vive solo como variable de entorno del servidor en Vercel — jamás en el bundle del cliente.
- **Caché local.** Para velocidad, los datos se cachean en `localStorage`. Al **cerrar sesión** se limpian todas las cachés sensibles (transacciones, presupuestos, deudas, etc.).
- **Feedback.** La página de Feedback envía mensajes al correo del desarrollador vía el servicio externo FormSubmit.co (no almacena datos en tu base).

---

## 📁 Estructura del proyecto

```
budget-tracker/
├── api/                  # Funciones serverless de Vercel (tasa USD→DOP)
├── supabase/
│   └── schema.sql        # Esquema completo de la base de datos (replicación)
├── src/
│   ├── components/       # UI reutilizable y layout (Sidebar, Header, Modal…)
│   ├── contexts/         # AuthContext (sesión Supabase)
│   ├── data/             # Categorías por defecto (RD)
│   ├── lib/              # Cliente de Supabase
│   ├── pages/            # Vistas: Dashboard, Transacciones, Presupuesto…
│   ├── stores/           # Estado global Zustand (uno por dominio)
│   └── utils/            # Cálculos financieros, formato, ciclos de tarjeta, tour
├── .env.example
└── vercel.json
```

### Tablas (ver `supabase/schema.sql`)
`categories` · `transactions` · `budgets` · `savings` · `debts` · `debt_payments` · `plans` · `credit_cards` · `recurring_transactions`

---

## 🧪 Tests

Lógica financiera pura cubierta con Vitest (presupuesto base cero, botes acumulativos, capacidad de ahorro, ciclos y cashback de tarjetas, recurrencia):
```bash
npm run test
```
