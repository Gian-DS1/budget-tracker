import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.agents', '.claude']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Funciones serverless de Vercel y archivos de configuración: corren en
    // Node, no en el navegador.
    files: ['api/**/*.js', '**/*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Archivos legítimamente "mixtos" donde `react-refresh/only-export-components`
    // es ruido, no una mejora:
    //   - *Ui.jsx: barriles de re-export de formUi compartido (convención del
    //     proyecto), no definen componentes propios.
    //   - ModalShell.jsx: co-ubica el componente con su hook acompañante
    //     (useModalClose), patrón estándar.
    // La regla sigue activa en el resto de la app (su valor real está en las
    // pantallas/componentes con estado). Apagarla aquí no afecta producción:
    // solo gobierna el Fast Refresh del dev server.
    files: ['src/**/*Ui.jsx', 'src/stitch/ModalShell.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
