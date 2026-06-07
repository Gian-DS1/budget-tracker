import { defineConfig, devices } from '@playwright/test';

// Configuración E2E de FinTrack.
//
// El test corre contra `vite preview` en localhost: ahí el "modo demo" está
// habilitado (isLocalhost() en src/stitch/demoMode.js), así que el flujo
// principal login→dashboard se valida con datos sembrados, SIN tocar Supabase
// ni producción y sin necesidad de credenciales/secretos en CI.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // Falla la build de CI si alguien dejó un test.only.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Arranca la app real (build + preview) antes de los tests y la apaga al final.
  // reuseExistingServer evita reconstruir si ya tienes un preview corriendo en local.
  webServer: {
    command: 'npm run build && npm run preview -- --port ' + PORT + ' --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
