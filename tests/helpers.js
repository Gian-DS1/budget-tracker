import { expect } from '@playwright/test';

// Utilidades compartidas por los E2E. Ambos specs necesitaban lo mismo (entrar
// en demo y quitarse el tutorial de encima) y lo tenían copiado; aquí vive una
// sola vez.

/**
 * Abre la landing pública. Punto de partida de todos los flujos.
 */
export async function openLanding(page) {
  await page.goto('/');
}

/**
 * Desde la landing ya abierta, entra en modo demo y espera al dashboard.
 * El botón "Ver demo" solo existe en localhost, que es donde corre el preview.
 * No navega por su cuenta: enterDemo() recarga la página, y encadenar ese reload
 * con un goto() a la misma URL deja la carga a medias y el dashboard no monta.
 */
export async function enterDemo(page) {
  await page.getByRole('button', { name: /Ver demo/i }).click();
  await expect(page.locator('[data-tour="dashboard-grid"]')).toBeVisible({ timeout: 15_000 });
}

/**
 * Cierra el tutorial guiado, que se abre solo sobre el dashboard ~700 ms después
 * de montar y cuyo overlay intercepta los clicks de cualquier test posterior.
 * Espera acotada: si no llega a salir, seguimos sin fallar.
 */
export async function skipTour(page) {
  const skip = page.getByText('Saltar tutorial');
  await skip.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await skip.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }
}
