## Qué cambia

<!-- Una o dos frases: qué hace este PR y por qué. -->

## Cómo probarlo

<!-- Pasos concretos. Si aplica: `npm run dev` → "Ver demo" → pantalla X. -->

1.
2.

## Checklist

- [ ] `npm run lint` pasa
- [ ] `npm run test` pasa (y hay tests nuevos si cambió lógica financiera)
- [ ] `npm run test:e2e` pasa si el cambio toca un flujo de pantalla
- [ ] La lógica nueva vive en un selector puro y testeable, no dentro del componente
- [ ] Si cambió la UI: capturas actualizadas (`npm run screenshots`)
- [ ] Si cambió el esquema: migración en `supabase/` + entrada en `supabase/MIGRATIONS.md`
