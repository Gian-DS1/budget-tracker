import { test, expect } from '@playwright/test';

// Flujo de gestión de categorías en modo demo (localhost). Crea una categoría,
// confirma que aparece, la elimina y confirma que desaparece. Usa el data-testid
// de la fila de categoría para localizar y borrar sin selectores frágiles.
test('crear y eliminar una categoría personalizada', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Ver demo/i }).click();
  await expect(page.locator('[data-tour="dashboard-grid"]')).toBeVisible({ timeout: 15_000 });

  // El tutorial automático se abre sobre el dashboard ~700ms después de montar y
  // su overlay intercepta los clicks. Esperar a que aparezca y cerrarlo con
  // "Saltar tutorial" (espera acotada: si por alguna razón no sale, seguimos).
  const skipTour = page.getByText('Saltar tutorial');
  await skipTour.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
    await skipTour.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  // Ir a Categorías desde el menú.
  await page.getByRole('link', { name: /Categorías/i }).click();
  await expect(page).toHaveURL(/\/categorias$/);

  // Esperar a que la pantalla monte (el título es estable, no animado) antes de
  // interactuar: el grid usa una animación de entrada (Stagger) que re-monta
  // elementos y puede desprender el botón del header a mitad del click.
  await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();

  // Crear una categoría nueva.
  await page.getByRole('button', { name: /Nueva categoría/i }).click();
  await page.getByPlaceholder('Ej. Gimnasio').fill('Café de prueba E2E');
  await page.getByRole('button', { name: /^Crear$/i }).click();

  // Aparece en la lista (su fila por data-attribute).
  const row = page.locator('[data-testid="category-row"][data-category-name="Café de prueba E2E"]');
  await expect(row).toBeVisible();

  // Eliminarla con el botón de su propia fila.
  await row.getByRole('button', { name: 'Eliminar' }).click();

  // Desaparece de la lista.
  await expect(row).toHaveCount(0);
});
