-- ============================================================================
-- Migración: tipo genérico 'expense' → 'variable_expense'
-- ============================================================================
-- Qué hace:
--   Convierte todas TUS transacciones con el tipo legado 'expense' (que la UI
--   mostraba como "Gasto" suelto) al tipo 'variable_expense'. Tras esto solo
--   quedan 4 tipos: income, fixed_expense, variable_expense, savings.
--
-- Por qué es seguro: el resto del sistema (presupuesto, dashboard, reportes,
-- cashback) ya trataba 'expense' como gasto variable, así que el comportamiento
-- numérico no cambia; solo se unifica la etiqueta. Idempotente: correrlo más de
-- una vez no hace nada adicional.
--
-- NOTA: auth.uid() retorna null en el SQL Editor (sin sesión activa). Se usa el
-- UUID hardcodeado del usuario en su lugar.
-- ============================================================================

update public.transactions
set type = 'variable_expense'
where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid
  and type = 'expense';

-- ── Verificación (opcional) ──────────────────────────────────────────────────
-- Debe devolver 0 filas tras la migración.
-- select count(*) as quedan_expense
-- from public.transactions
-- where user_id = '24e05fb8-dac4-45bc-9cdf-22cb4c707a81'::uuid and type = 'expense';
