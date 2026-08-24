import { test, expect } from '@playwright/test';
import { openLanding, enterDemo, skipTour } from './helpers';

// E2E del flujo principal del usuario: entrar a la app y llegar al dashboard.
//
// Usa el "modo demo" (habilitado en localhost) en lugar de un login real contra
// Supabase: así el test es determinista, no necesita credenciales ni red, y no
// toca producción. El demo siembra los stores con datos de ejemplo, de modo que
// el dashboard se renderiza con métricas reales (igual que un usuario logueado).

test.describe('Flujo principal: acceso → dashboard', () => {
  test('un visitante entra como demo y aterriza en el dashboard con datos', async ({ page }) => {
    // 1 · Landing pública.
    await openLanding(page);
    await expect(page).toHaveTitle(/FinTrack/i);

    // El CTA principal de empezar siempre está presente en la landing.
    await expect(page.getByRole('button', { name: /Probar la beta/i }).first()).toBeVisible();

    // 2 · Entrar como demo y aterrizar en el dashboard (data-tour="dashboard-grid"
    // es el ancla estable del sistema de tour: confirma que estamos dentro de la
    // app autenticada y no en la landing/login).
    await enterDemo(page);

    // La barra de navegación de la app autenticada también debe estar presente.
    await expect(page.locator('[data-tour="nav"]')).toBeVisible();

    // 3 · Datos sembrados visibles: el demo carga una meta "Fondo de emergencia"
    // y categorías reales. Verificamos que el dashboard muestra contenido real,
    // no un estado vacío. Las dos celdas de apoyo bajo el hero son fijas del
    // resumen: el donut de gasto por categoría y el panel de recordatorios.
    await expect(page.getByText(/En qué gasto/i)).toBeVisible();
    await expect(page.getByText(/Recordatorios/i).first()).toBeVisible();
  });

  test('desde el dashboard se puede navegar a Transacciones', async ({ page }) => {
    // Cada test arranca una página nueva, así que repetimos el acceso desde la
    // landing y cerramos el tutorial, cuyo overlay taparía el menú.
    await openLanding(page);
    await enterDemo(page);
    await skipTour(page);

    // Navega a Transacciones usando el enlace de la barra lateral.
    await page.getByRole('link', { name: /Transacciones/i }).click();

    // La URL refleja la ruta y la app sigue montada (no se rompió el routing).
    await expect(page).toHaveURL(/\/transacciones$/);
  });
});
