// Tema Stitch (Romer) — config de Tailwind + tokens, extraído 1:1 de las pantallas
// generadas por Google Stitch para el proyecto "FinTrack RD".
//
// RECONSTRUCCIÓN 1:1: esta es la "carrocería" cruda de Stitch. La lógica de negocio
// (stores, cálculos) se vuelve a cablear encima DESPUÉS, usando docs/logic/.
//
// Se inyecta el script de Tailwind CDN + esta config + las fuentes en index.html
// (o vía StitchHead). Aquí exportamos la config para reutilizarla y documentarla.

export const stitchTailwindConfig = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-background': '#070708',
        'surface-panel': '#050505',
        'surface-card': '#101112',
        'surface-container-lowest': '#0e0e0f',
        'surface-container-low': '#1c1b1d',
        'surface-container': '#201f21',
        'surface-container-high': '#2a2a2b',
        'surface-container-highest': '#353436',
        'surface': '#131314',
        'surface-dim': '#131314',
        'surface-bright': '#3a393a',
        'surface-variant': '#353436',
        'border-subtle': '#232426',
        'outline': '#8f8fa1',
        'outline-variant': '#454655',
        'on-surface': '#e5e2e3',
        'on-surface-variant': '#c6c5d8',
        'on-background': '#e5e2e3',
        'background': '#131314',
        'text-muted': '#9A9DA3',
        // Acentos Stitch
        'primary': '#bec2ff',
        'primary-container': '#7a85ff',
        'primary-fixed': '#e0e0ff',
        'primary-fixed-dim': '#bec2ff',
        'on-primary': '#000ba6',
        'secondary': '#50d8e9',
        'secondary-container': '#00b1c1',
        'secondary-fixed': '#91f1ff',
        'on-secondary': '#00363c',
        'tertiary': '#bdd200',
        'tertiary-fixed': '#d8ef00',
        'tertiary-container': '#8a9900',
        'on-tertiary': '#2e3400',
        'accent-warning': '#FFB689',
        'accent-error': '#FFB4AB',
        'error': '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
      },
      borderRadius: { DEFAULT: '0.125rem', lg: '0.25rem', xl: '0.5rem', full: '0.75rem' },
      spacing: {
        'section-padding': '120px', xl: '40px', 'margin-safe': '32px',
        lg: '24px', xs: '4px', sm: '8px', md: '16px', gutter: '20px',
      },
      fontFamily: {
        'mono-data': ['Inter'], 'label-sm': ['Inter'],
        'hero-headline': ['Manrope'], 'headline-md': ['Manrope'], 'headline-lg': ['Manrope'],
        'body-lg': ['Inter'], 'body-md': ['Inter'],
      },
      fontSize: {
        'mono-data': ['10px', { lineHeight: '1', letterSpacing: '0.2em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1', letterSpacing: '0.02em', fontWeight: '500' }],
        'hero-headline': ['76px', { lineHeight: '1.1', letterSpacing: '-0.055em', fontWeight: '520' }],
        'headline-md': ['32px', { lineHeight: '1.2', letterSpacing: '-0.05em', fontWeight: '520' }],
        'headline-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.05em', fontWeight: '520' }],
        'body-lg': ['19px', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '400' }],
      },
    },
  },
};
