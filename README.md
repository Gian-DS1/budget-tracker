# FinTrack RD — Presupuesto Inteligente

Aplicación web de gestión financiera personal diseñada para reemplazar y superar trackers de hojas de cálculo, automatizando el presupuesto base cero con análisis inteligente, visualizaciones interactivas y proyecciones predictivas.

## Características Principales

*   **Presupuesto Base Cero:** Planificación mensual detallada (Estimado vs Actual) con barras de progreso por categoría.
*   **Gestión de Transacciones:** Registro rápido de ingresos y gastos, con auto-categorización inteligente y soporte para transacciones recurrentes.
*   **Metas de Ahorro:** Control visual del progreso hacia tus metas financieras, con cálculos de proyección y fechas estimadas.
*   **Control de Deudas:** Seguimiento de saldos, historial de pagos, y estimación de meses restantes para liquidación.
*   **Plan Financiero:** Organización de metas a corto, mediano y largo plazo estilo Kanban.
*   **Dashboard Interactivo:** Resumen visual de tu salud financiera usando gráficos avanzados (tendencias de 6 meses, distribución de gastos) y un mini-calendario de actividad.
*   **Dark Mode Premium:** Interfaz de usuario moderna con soporte nativo para temas oscuros y claros usando *glassmorphism* y micro-animaciones.
*   **Privacidad Local:** Actualmente los datos se almacenan de forma segura en el navegador (`localStorage`) sin necesidad de un backend o servidor.

## Stack Tecnológico

*   **Frontend:** React 19 + Vite 6
*   **Enrutamiento:** React Router v7
*   **Estado:** Zustand (con persistencia local)
*   **Estilos:** Vanilla CSS (CSS Custom Properties)
*   **Gráficos:** Recharts
*   **Iconos:** Lucide React

## Cómo Ejecutar en Local

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```
2.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```
3.  Abre `http://localhost:5173` en tu navegador.

## Estructura del Proyecto

El código está organizado en `src/`:
*   `/components`: Componentes reutilizables de UI y layout.
*   `/pages`: Vistas principales de la aplicación.
*   `/stores`: Gestión del estado global y persistencia con Zustand.
*   `/utils`: Funciones de formato (moneda, fechas) y cálculos financieros.
*   `/data`: Datos predeterminados, incluyendo las categorías iniciales adaptadas a RD.

## Siguientes Pasos (Roadmap)
*   [x] Fase 1: Setup inicial, diseño base, stores y layout.
*   [x] Fase 2: Transacciones y Presupuesto (CRUD principal).
*   [x] Fase 3: Módulos de Ahorro, Deudas y Plan Financiero.
*   [x] Fase 4: Dashboard analítico con gráficos.
*   [x] Fase 5: Analytics avanzados (Proyecciones, anomalías).
*   [x] Fase 6: Importación y Exportación de CSV/PDF.
*   [x] Fase 7: Pulido UX final y ajustes.
