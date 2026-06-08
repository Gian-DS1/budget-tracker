# supabase/scratch — scripts históricos de un solo uso

Estos `.sql` **no son parte del esquema ni del flujo de migraciones**. Son scripts
puntuales que se usaron una vez para diagnosticar o ajustar datos de una cuenta
concreta durante el desarrollo (p. ej. cuadrar el saldo real de una tarjeta, migrar
una tarjeta específica, o inspeccionar ciclos). Se conservan por valor histórico.

- **No los corras** en una base nueva ni en producción sin entender exactamente qué
  hacen: varios fijan cifras o identidades específicas de una cuenta real.
- La fuente de verdad del esquema es `../schema.sql`. El orden y las notas de las
  migraciones reales están en `../MIGRATIONS.md`.

Si alguno de estos se vuelve una migración reutilizable, muévelo de vuelta a
`supabase/` y documéntalo en `MIGRATIONS.md`.
