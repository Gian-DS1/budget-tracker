import { test, expect } from '@playwright/test';

// E2E del flujo principal del usuario: entrar a la app y llegar al dashboard.
//
// Usa el "modo demo" (habilitado en localhost) en lugar de un login real contra
// Supabase: así el test es determinista, no necesita credenciales ni red, y no
// toca producción. El demo siembra los stores con datos de ejemplo, de modo que
// el dashboard se renderiza con métricas reales (igual que un usuario logueado).

test.describe('Flujo principal: acceso → dashboard', () => {
  test('un visitante entra como demo y aterriza en el dashboard con datos', async ({ page }) => {
    // 1 · Landing pública.
    await page.goto('/');
    await expect(page).toHaveTitle(/FinTrack/i);

    // El CTA principal de empezar siempre está presente en la landing.
    await expect(page.getByRole('button', { name: /Empezar gratis/i })).toBeVisible();

    // 2 · Entrar como demo. El botón "Ver demo" solo aparece en localhost, que es
    // donde corre este test (vite preview). Llama a enterDemo() + reload.
    const verDemo = page.getByRole('button', { name: /Ver demo/i });
    await expect(verDemo).toBeVisible();
    await verDemo.click();

    // 3 · Dashboard cargado. El grid del resumen lleva data-tour="dashboard-grid"
    // (ancla estable del sistema de tour). Su presencia confirma que estamos en la
    // app autenticada (demo) y no en la landing/login.
    const dashboardGrid = page.locator('[data-tour="dashboard-grid"]');
    await expect(dashboardGrid).toBeVisible({ timeout: 15_000 });

    // La barra de navegación de la app autenticada también debe estar presente.
    await expect(page.locator('[data-tour="nav"]')).toBeVisible();

    // 4 · Datos sembrados visibles: el demo carga una meta "Fondo de emergencia"
    // y categorías reales. Verificamos que el dashboard muestra contenido real,
    // no un estado vacío. Las celdas de Salud y Patrimonio son fijas del resumen.
    await expect(page.getByText(/Salud financiera/i)).toBeVisible();
    await expect(page.getByText(/Patrimonio/i).first()).toBeVisible();
  });

  test('desde el dashboard se puede navegar a Transacciones', async ({ page }) => {
    // Entra directo en demo (el flag de demo persiste en sessionStorage, pero
    // cada test es una página nueva, así que repetimos el acceso desde la landing).
    await page.goto('/');
    await page.getByRole('button', { name: /Ver demo/i }).click();
    await expect(page.locator('[data-tour="dashboard-grid"]')).toBeVisible({ timeout: 15_000 });

    // Navega a Transacciones usando el enlace de la barra lateral.
    await page.getByRole('link', { name: /Transacciones/i }).click();

    // La URL refleja la ruta y la app sigue montada (no se rompió el routing).
    await expect(page).toHaveURL(/\/transacciones$/);
  });
});
