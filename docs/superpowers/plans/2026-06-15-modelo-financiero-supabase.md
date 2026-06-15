# Fase 2: modelo financiero en Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el modelo financiero (efectivo líquido, saldo inicial, cascada efectivo→ahorro) a Supabase para que funcione con cuentas reales en producción, no solo en demo.

**Architecture:** Dos columnas SQL nuevas (`profiles.initial_cash_balance`, `debt_payments.savings_used`; tarjetas usa su JSONB existente). Los stores reales ganan métodos espejo de los `demoXxx` ya probados. Los `PaymentModal` dejan de gatear la cascada a demo. El efectivo inicial se declara en onboarding + Ajustes. Despliegue manual: SQL primero, luego push a main.

**Tech Stack:** React 19, Zustand, Supabase (Postgres + RLS), Vitest, TailwindCSS v4.

**Spec:** [docs/superpowers/specs/2026-06-15-modelo-financiero-supabase-design.md](../specs/2026-06-15-modelo-financiero-supabase-design.md)

---

## Notas de implementación (leer antes de empezar)

- **Patrón demo/real:** cada método real es el gemelo del `demoXxx` ya hecho. La lógica de
  decisión (selectores `getCashShortfall`/`canAffordPayment`) NO se duplica; ya es común.
- **Sin tests unitarios nuevos de I/O:** los stores reales son llamadas a Supabase, que el
  repo no mockea. Se verifican en cuenta real de prueba. Los selectores ya están testeados.
- **Despliegue es manual y NO lo ejecuta el plan:** correr la SQL en Supabase ANTES del
  push a main. El plan deja la SQL lista y documentada; el usuario la corre y despliega.
- **i18n es/en** para cadenas nuevas (onboarding).
- **Commits:** español, imperativo.

---

## File Structure

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `supabase/add_initial_cash_balance.sql` | Crear | Columna `initial_cash_balance` en profiles. |
| `supabase/add_debt_payment_savings_used.sql` | Crear | Columna `savings_used` (jsonb) en debt_payments. |
| `supabase/MIGRATIONS.md` | Modificar | Documentar las 2 migraciones nuevas. |
| `src/stores/usePrefsStore.js` | Modificar | fetch + persistir `initialCashBalance`. |
| `src/stores/useDebtStore.js` | Modificar | `addPaymentWithCascade`, `savingsUsed` en add/fetch/delete. |
| `src/stores/useSavingsStore.js` | (verificar) | `addContribution` ya acepta negativos; sin cambios salvo verificación. |
| `src/stores/useCreditCardStore.js` | Modificar | `addCardPaymentWithCascade`, `savingsUsed` en pago + delete. |
| `src/stitch/screens/debts/PaymentModal.jsx` | Modificar | Quitar gate demo de la cascada; usar método real. |
| `src/stitch/screens/cards/PaymentModal.jsx` | Modificar | Idem. |
| `src/stitch/screens/StitchSettings.jsx` | Modificar | Campo efectivo inicial también en cuenta real. |
| `src/stitch/screens/CurrencyOnboarding.jsx` | Modificar | Campo efectivo inicial en el onboarding. |
| `src/i18n/translations.js` | Modificar | Claves del campo de onboarding. |

---

## Task 1: Migración SQL

**Files:**
- Create: `supabase/add_initial_cash_balance.sql`
- Create: `supabase/add_debt_payment_savings_used.sql`
- Modify: `supabase/MIGRATIONS.md`

- [ ] **Step 1: Crear `add_initial_cash_balance.sql`**

```sql
-- Efectivo inicial declarado por el usuario (lo que tiene "en el banco" al empezar).
-- Aditivo y no destructivo; usuarios existentes arrancan en 0.
alter table public.profiles
  add column if not exists initial_cash_balance numeric not null default 0;
```

- [ ] **Step 2: Crear `add_debt_payment_savings_used.sql`**

```sql
-- Origen del ahorro usado por la cascada al pagar (para revertir el pago exacto).
-- [{ goalId, amount }]. Tarjetas usa su columna payments (jsonb) existente.
alter table public.debt_payments
  add column if not exists savings_used jsonb not null default '[]'::jsonb;
```

- [ ] **Step 3: Documentar en MIGRATIONS.md**

Abrir [supabase/MIGRATIONS.md](../../../supabase/MIGRATIONS.md) y añadir dos entradas al
final, siguiendo el formato existente del archivo (fecha + archivo + qué hace):

```markdown
- `add_initial_cash_balance.sql` — añade `profiles.initial_cash_balance` (numeric, default 0) para el efectivo inicial del usuario.
- `add_debt_payment_savings_used.sql` — añade `debt_payments.savings_used` (jsonb, default []) para la cascada efectivo→ahorro.
```

- [ ] **Step 4: Commit (NO correr la SQL aún — es paso de deploy)**

```bash
git add supabase/add_initial_cash_balance.sql supabase/add_debt_payment_savings_used.sql supabase/MIGRATIONS.md
git commit -m "feat(db): migraciones initial_cash_balance + savings_used"
```

---

## Task 2: Persistir `initialCashBalance` en usePrefsStore

**Files:**
- Modify: `src/stores/usePrefsStore.js`

**Contexto:** `fetchPrefs` lee profiles en [usePrefsStore.js:47](../../../src/stores/usePrefsStore.js#L47). `setInitialCashBalance` hoy solo hace `set()` ([línea ~125](../../../src/stores/usePrefsStore.js#L125)). El patrón de upsert está en `setBudgetLevel`/`setCurrency`.

- [ ] **Step 1: Leer la columna en fetchPrefs**

En [usePrefsStore.js:47](../../../src/stores/usePrefsStore.js#L47), añadir la columna al select:

```javascript
          .select('budget_level, tutorial_seen, currency, initial_cash_balance')
```

Y dentro del `if (!error && data)` (después de mapear tutorial_seen, ~línea 53):

```javascript
          if (data.initial_cash_balance != null) next.initialCashBalance = Number(data.initial_cash_balance);
```

> Defensa: si la columna aún no existe (deploy sin SQL), Supabase devuelve error y cae al
> `else` (usuario nuevo) sin romper. El orden de deploy (SQL primero) lo previene.

- [ ] **Step 2: Persistir en setInitialCashBalance**

Reemplazar el `setInitialCashBalance` actual (que solo hace `set`) por el patrón de
`setCurrency` (optimista + upsert + rollback). Localizar la función y cambiarla a:

```javascript
      setInitialCashBalance: async (amount) => {
        const value = Number(amount) || 0;
        const prev = get().initialCashBalance;
        set({ initialCashBalance: value }); // optimista
        if (isDemoActive()) return; // demo: solo memoria
        const user = await getCurrentUser();
        if (!user) return; // sin sesión, solo caché local
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, initial_cash_balance: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          if (import.meta.env.DEV) console.error('Error guardando efectivo inicial:', error);
          set({ initialCashBalance: prev }); // rollback
        }
      },
```

> Verificar que `getCurrentUser`, `supabase`, `isDemoActive` ya están importados en el
> archivo (sí: los usan setBudgetLevel/setCurrency).

- [ ] **Step 3: Añadir initialCashBalance al partialize**

En el `partialize` ([usePrefsStore.js:~124](../../../src/stores/usePrefsStore.js#L124)):

```javascript
      partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen, currency: state.currency, initialCashBalance: state.initialCashBalance }),
```

- [ ] **Step 4: Verificar build + tests**

Run: `npm run build`
Expected: build OK.
Run: `npm test`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/stores/usePrefsStore.js
git commit -m "feat(prefs): persistir initialCashBalance en profiles (cuenta real)"
```

---

## Task 3: Cascada real en useDebtStore

**Files:**
- Modify: `src/stores/useDebtStore.js`

**Contexto:** `addPayment` ([useDebtStore.js:154](../../../src/stores/useDebtStore.js#L154)) inserta en `debt_payments`. `deletePayment` ([línea 248](../../../src/stores/useDebtStore.js#L248)) revierte. `useSavingsStore.addContribution` ya acepta montos negativos (verificado).

- [ ] **Step 1: Aceptar y persistir `savingsUsed` en addPayment**

En `addPayment`, añadir el parámetro y guardarlo en el insert. Cambiar la firma:

```javascript
  addPayment: async (debtId, amount, date, notes = '', savingsUsed = []) => {
```

En `paymentPayload` ([useDebtStore.js:164](../../../src/stores/useDebtStore.js#L164)):

```javascript
    const paymentPayload = {
      user_id: user.id,
      debt_id: debtId,
      amount: Number(amount),
      date: date,
      remaining_balance: newBalance,
      notes: notes || null,
      savings_used: savingsUsed,
    };
```

Y en `formattedPayment` ([línea 183](../../../src/stores/useDebtStore.js#L183)) añadir:

```javascript
        savingsUsed: paymentData.savings_used || [],
```

- [ ] **Step 2: Mapear savings_used al cargar (fetchDebts)**

Localizar dónde `fetchDebts` mapea las filas de `debt_payments` a objetos (busca el map de
`payments`). En cada pago mapeado, añadir:

```javascript
        savingsUsed: p.savings_used || [],
```

(Si el map usa otra variable que `p`, ajustar al nombre real.)

- [ ] **Step 3: Crear `addPaymentWithCascade`**

Añadir un método nuevo al store, después de `addPayment`:

```javascript
  // Pago de deuda con cascada (cuenta real). Si savingsPick no es null, retira ese
  // monto del ahorro (aporte negativo → baja la meta y devuelve efectivo) y registra
  // el pago con savingsUsed para la reversa. Espejo de applyDebtPaymentWithCascade (demo).
  addPaymentWithCascade: async (debtId, amount, date, notes, savingsPick) => {
    const savingsUsed = [];
    if (savingsPick && savingsPick.amount > 0) {
      await useSavingsStore.getState().addContribution(savingsPick.goalId, -Math.abs(savingsPick.amount), date, 'Retiro para pago de deuda');
      savingsUsed.push({ goalId: savingsPick.goalId, amount: Math.abs(savingsPick.amount) });
    }
    return get().addPayment(debtId, amount, date, notes, savingsUsed);
  },
```

> Verificar que `useSavingsStore` está importado en useDebtStore. Si no, importarlo:
> `import useSavingsStore from './useSavingsStore';` (cuidado con import circular — si lo
> hay, usar `import('./useSavingsStore')` dinámico o requerir dentro de la función vía
> `useSavingsStore.getState()` con el import al tope, que es lo estándar en Zustand).

- [ ] **Step 4: Reversa en deletePayment**

En `deletePayment` ([useDebtStore.js:248](../../../src/stores/useDebtStore.js#L248)), al
inicio (después de encontrar `payment`, antes de revertir la deuda), devolver el ahorro:

```javascript
  deletePayment: async (paymentId) => {
    const payment = get().payments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false };
    // Reversa de cascada: devuelve a cada meta lo que el pago tomó del ahorro.
    for (const s of payment.savingsUsed || []) {
      await useSavingsStore.getState().addContribution(s.goalId, Math.abs(s.amount), payment.date, 'Reversa de retiro por pago');
    }
    const debt = get().debts.find((d) => d.id === payment.debtId);
    // ... (resto igual)
```

- [ ] **Step 5: Verificar build + tests**

Run: `npm run build`
Expected: build OK.
Run: `npm test`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/stores/useDebtStore.js
git commit -m "feat(deudas): cascada real (addPaymentWithCascade + savingsUsed + reversa)"
```

---

## Task 4: Cascada real en useCreditCardStore

**Files:**
- Modify: `src/stores/useCreditCardStore.js`

**Contexto:** Los pagos de tarjeta viven en `card.payments` (jsonb). Hay que: aceptar
`savingsUsed` en el pago, crear `addCardPaymentWithCascade`, revertir en delete. Antes de
implementar, leer cómo `addCardPayment` y `deleteCardPayment` del store real escriben hoy
el array `payments` (patrón: leer card, push/filter, update a Supabase).

- [ ] **Step 1: Leer las firmas reales de addCardPayment/deleteCardPayment**

Abrir [src/stores/useCreditCardStore.js](../../../src/stores/useCreditCardStore.js) y
localizar `addCardPayment` y `deleteCardPayment`. Confirmar la forma del payload y cómo
persisten el array `payments`.

- [ ] **Step 2: Aceptar `savingsUsed` en el pago**

En `addCardPayment`, donde construye la entrada del pago (objeto con id/amount/date/note),
añadir `savingsUsed` (del payload, default `[]`). Persistir el array actualizado a
`credit_cards.payments` como ya lo hace (es jsonb, sin SQL).

```javascript
// en el objeto entry del pago:
savingsUsed: payload.savingsUsed || [],
```

- [ ] **Step 3: Crear `addCardPaymentWithCascade`**

Añadir al store:

```javascript
  // Pago de tarjeta con cascada (cuenta real). Espejo de applyCardPaymentWithCascade (demo).
  addCardPaymentWithCascade: async (cardId, payload, savingsPick) => {
    const savingsUsed = [];
    if (savingsPick && savingsPick.amount > 0) {
      await useSavingsStore.getState().addContribution(savingsPick.goalId, -Math.abs(savingsPick.amount), payload.date, 'Retiro para pago de tarjeta');
      savingsUsed.push({ goalId: savingsPick.goalId, amount: Math.abs(savingsPick.amount) });
    }
    return get().addCardPayment(cardId, { ...payload, savingsUsed });
  },
```

> Verificar/añadir el import de `useSavingsStore` (igual que en Task 3).

- [ ] **Step 4: Reversa en deleteCardPayment**

En `deleteCardPayment`, antes de quitar el pago del array, devolver el ahorro:

```javascript
  deleteCardPayment: async (cardId, paymentId) => {
    const card = get().cards.find((c) => c.id === cardId);
    const entry = card?.payments?.find((p) => p.id === paymentId);
    for (const s of (entry?.savingsUsed || [])) {
      await useSavingsStore.getState().addContribution(s.goalId, Math.abs(s.amount), entry.date, 'Reversa de retiro por pago');
    }
    // ... (resto igual: filtrar el pago y persistir)
```

(Ajustar al cuerpo real de la función leído en Step 1.)

- [ ] **Step 5: Verificar build + tests**

Run: `npm run build`
Expected: build OK.
Run: `npm test`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/stores/useCreditCardStore.js
git commit -m "feat(tarjetas): cascada real (addCardPaymentWithCascade + savingsUsed + reversa)"
```

---

## Task 5: Quitar el gate demo de la cascada en PaymentModal de deudas

**Files:**
- Modify: `src/stitch/screens/debts/PaymentModal.jsx`

**Contexto:** Hoy el `submit` tiene `if (!isDemoActive()) { applyPayment(amt, null); return; }` que SALTA la cascada en cuenta real, y `applyPayment` llama `addPayment` directo en la rama real. Hay que: (1) quitar ese gate para que el cálculo de faltante corra siempre; (2) en `applyPayment`, usar el método real con cascada.

- [ ] **Step 1: Usar el método real con cascada en applyPayment**

Importar `addPaymentWithCascade` del store (ya se usa `addPayment` vía `useDebtStore`).
Localizar dónde el componente obtiene `addPayment`:

```javascript
  const addPayment = useDebtStore((s) => s.addPayment);
  const addPaymentWithCascade = useDebtStore((s) => s.addPaymentWithCascade);
```

En `applyPayment`, la rama `else` (cuenta real) cambia de:

```javascript
    } else {
      addPayment(debt.id, amt, date, note.trim()); // cuenta real: sin cascada (como hoy)
    }
```

a:

```javascript
    } else {
      if (savingsPick) addPaymentWithCascade(debt.id, amt, date, note.trim(), savingsPick);
      else addPayment(debt.id, amt, date, note.trim());
    }
```

- [ ] **Step 2: Quitar el gate que salta la cascada en cuenta real**

En `submit`, eliminar la línea:

```javascript
    // Cuenta real (no demo): sin cascada, comportamiento de hoy.
    if (!isDemoActive()) { applyPayment(amt, null); return; }
```

Así el cálculo `getCashShortfall` + el flujo de decisión corren también en cuenta real.
(El resto de `submit` ya es agnóstico: usa `transactions`, `cards`, `initialCashBalance`,
`goals` de los stores, que en cuenta real vienen de Supabase.)

- [ ] **Step 3: Verificar build + lint**

Run: `npm run build`
Expected: build OK.
Run: `npx eslint src/stitch/screens/debts/PaymentModal.jsx`
Expected: limpio.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/screens/debts/PaymentModal.jsx
git commit -m "feat(deudas): activar cascada en cuenta real (quitar gate demo)"
```

---

## Task 6: Quitar el gate demo de la cascada en PaymentModal de tarjetas

**Files:**
- Modify: `src/stitch/screens/cards/PaymentModal.jsx`

**Contexto:** Mismo patrón que Task 5.

- [ ] **Step 1: Usar el método real con cascada**

```javascript
  const addCardPayment = useCreditCardStore((s) => s.addCardPayment);
  const addCardPaymentWithCascade = useCreditCardStore((s) => s.addCardPaymentWithCascade);
```

En `applyPayment`, la rama `else`:

```javascript
    } else {
      if (savingsPick) addCardPaymentWithCascade(card.id, payload, savingsPick);
      else addCardPayment(card.id, payload);
    }
```

- [ ] **Step 2: Quitar el gate**

En `submit`, eliminar:

```javascript
    if (!isDemoActive()) { applyPayment(amt, null); return; }
```

- [ ] **Step 3: Verificar build + lint**

Run: `npm run build`
Expected: build OK.
Run: `npx eslint src/stitch/screens/cards/PaymentModal.jsx`
Expected: limpio.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/screens/cards/PaymentModal.jsx
git commit -m "feat(tarjetas): activar cascada en cuenta real (quitar gate demo)"
```

---

## Task 7: Campo "Efectivo inicial" en Ajustes para cuenta real

**Files:**
- Modify: `src/stitch/screens/StitchSettings.jsx`

**Contexto:** El campo ya existe pero gateado a `demo &&` y llama `demoSetInitialCashBalance`. Hay que mostrarlo siempre y ramificar el onChange.

- [ ] **Step 1: Importar el setter real**

Asegurar el import del setter real (ya hay `usePrefsStore`):

```javascript
  const setInitialCashBalance = usePrefsStore((s) => s.setInitialCashBalance);
```

(Y conservar `demoSetInitialCashBalance` de demoMode, ya importado.)

- [ ] **Step 2: Quitar el gate `demo &&` y ramificar el onChange**

Localizar la sección del campo (hoy `{demo && (<Stagger.Item>...`). Quitar el `demo &&`
para que se muestre siempre, y cambiar el `onChange`:

```javascript
        <Stagger.Item className="lg:col-span-12 bg-surface-panel border border-border-subtle rounded-lg inner-glow p-lg flex flex-col gap-sm">
          <h2 className="font-mono-data text-mono-data text-on-surface-variant border-b border-border-subtle pb-sm">{t('screens.settings.initialCashLabel').toUpperCase()}</h2>
          <div className="max-w-[280px]">
            <StitchCurrencyInput
              value={initialCashBalance === 0 ? '' : String(initialCashBalance)}
              onChange={(v) => { if (demo) demoSetInitialCashBalance(v); else setInitialCashBalance(v); }}
            />
          </div>
          <span className="font-label-sm text-label-sm text-text-muted">{t('screens.settings.initialCashHelp')}</span>
        </Stagger.Item>
```

> El texto de ayuda `initialCashHelp` dice "(solo demo)". Actualizar esa clave i18n para
> quitar "(solo demo)" ya que ahora aplica a todos. Cambiar en translations.js (es/en):
> es "Tu efectivo líquido al empezar. El Dashboard parte de aquí." / en "Your liquid cash
> at the start. The Dashboard builds from here."

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/screens/StitchSettings.jsx src/i18n/translations.js
git commit -m "feat(ajustes): efectivo inicial tambien en cuenta real"
```

---

## Task 8: Campo "Efectivo inicial" en el onboarding

**Files:**
- Modify: `src/stitch/screens/CurrencyOnboarding.jsx`
- Modify: `src/i18n/translations.js`

**Contexto:** `CurrencyOnboarding` es un overlay bloqueante (gate WCAG con focus trap). Hoy
elige moneda y llama `setCurrency`. Añadir un campo opcional de efectivo inicial que se
persiste tras elegir moneda. CUIDADO: no romper el focus trap ni el gate.

- [ ] **Step 1: Leer el flujo de confirmación del onboarding**

Leer [CurrencyOnboarding.jsx](../../../src/stitch/screens/CurrencyOnboarding.jsx) completo
para ver dónde se llama `setCurrency(picked)` (el botón de confirmar). El campo nuevo va
ANTES de esa confirmación, y al confirmar se persiste el efectivo además de la moneda.

- [ ] **Step 2: Añadir estado e import del setter**

```javascript
  const setInitialCashBalance = usePrefsStore((s) => s.setInitialCashBalance);
  const [cash, setCash] = useState('');
```

Importar `StitchCurrencyInput`:

```javascript
import StitchCurrencyInput from '../StitchCurrencyInput';
```

- [ ] **Step 3: Añadir el campo al panel (tras el selector de moneda)**

Dentro del panel del onboarding, después del `StitchSelect` de moneda, añadir:

```javascript
          <label className="flex flex-col gap-xs mt-md">
            <span className="font-mono-data text-mono-data text-text-muted uppercase">{t('screens.currencyOnboarding.cashLabel')}</span>
            <StitchCurrencyInput value={cash} onChange={setCash} />
            <span className="font-label-sm text-label-sm text-text-muted">{t('screens.currencyOnboarding.cashHelp')}</span>
          </label>
```

> El campo es enfocable, así que el focus trap lo incluirá automáticamente (usa el selector
> FOCUSABLE genérico). Verificar tras implementar que Tab cicla bien entre moneda → cash →
> botón confirmar.

- [ ] **Step 4: Persistir el efectivo al confirmar**

Donde el botón confirma (llama `setCurrency(picked)`), añadir antes o después:

```javascript
    if (cash) setInitialCashBalance(cash);
```

(Si el efectivo está vacío, queda en 0 por default — el usuario lo declara después.)

- [ ] **Step 5: Añadir claves i18n (es/en)**

En `screens.currencyOnboarding` (es):

```javascript
        cashLabel: '¿Cuánto efectivo tienes hoy?',
        cashHelp: 'Lo que tienes disponible ahora (opcional, puedes ponerlo después).',
```

En (en):

```javascript
        cashLabel: 'How much cash do you have today?',
        cashHelp: 'What you have available now (optional, you can set it later).',
```

- [ ] **Step 6: Verificar build + lint**

Run: `npm run build`
Expected: build OK.
Run: `npx eslint src/stitch/screens/CurrencyOnboarding.jsx`
Expected: limpio.

- [ ] **Step 7: Commit**

```bash
git add src/stitch/screens/CurrencyOnboarding.jsx src/i18n/translations.js
git commit -m "feat(onboarding): pedir efectivo inicial al elegir moneda"
```

---

## Task 9: Verificación final

- [ ] **Step 1: Build + tests + lint**

Run: `npm run build`
Expected: build OK.

Run: `npm test`
Expected: verde (selectores siguen pasando; no se tocó su lógica).

Run: `npx eslint src/stores/usePrefsStore.js src/stores/useDebtStore.js src/stores/useCreditCardStore.js src/stitch/screens/debts/PaymentModal.jsx src/stitch/screens/cards/PaymentModal.jsx src/stitch/screens/StitchSettings.jsx src/stitch/screens/CurrencyOnboarding.jsx`
Expected: limpio.

- [ ] **Step 2: Inspección en demo (no-regresión)**

Run: `npm run dev`, Entrar como demo. Verificar que TODO el modelo sigue funcionando
igual que antes (efectivo, cascada, reversa) — la rama demo no debió cambiar de
comportamiento.

- [ ] **Step 3: Inspección en cuenta real de prueba (requiere SQL corrida)**

> Este paso requiere correr la SQL en una base de prueba/staging de Supabase primero.
> Si no hay staging, este paso lo hace el usuario tras el deploy. Documentar.

En una cuenta real (con la SQL aplicada): declarar efectivo en Ajustes → recargar →
persiste; pagar deuda forzando cascada → elige meta → persiste; borrar el pago → revierte;
usuario nuevo ve el campo en onboarding.

- [ ] **Step 4: Commit (si hubo ajustes)**

```bash
git add -A
git commit -m "chore(fase2): ajustes tras verificacion"
```

---

## Despliegue (paso manual del usuario, NO lo ejecuta el plan)

1. **Correr la SQL en Supabase producción**, en orden:
   - `supabase/add_initial_cash_balance.sql`
   - `supabase/add_debt_payment_savings_used.sql`
2. **Verificar** que las columnas existen (`profiles.initial_cash_balance`,
   `debt_payments.savings_used`).
3. **Push a `main`** → Vercel despliega.

> El orden es estricto: SQL primero. Si se despliega antes de correr la SQL, `fetchPrefs`
> leerá una columna inexistente (degrada con gracia al `else`, pero el efectivo inicial no
> se cargará hasta correr la SQL).

---

## Verificación final (todas las tareas completas)

- [ ] `npm run build` pasa.
- [ ] `npm test` verde.
- [ ] ESLint limpio en archivos tocados.
- [ ] Demo: modelo financiero funciona igual que antes (no-regresión).
- [ ] SQL lista en `supabase/` + documentada en MIGRATIONS.md.
- [ ] Cuenta real (tras SQL): efectivo persiste, cascada funciona, reversa funciona,
      onboarding pide el efectivo.
- [ ] Usuarios existentes: efectivo 0 + banner del dashboard (sin migración de datos).

---

## Self-Review (cobertura del spec)

- **Migración SQL (2 columnas, MIGRATIONS.md)** → Task 1. ✅
- **Persistir initialCashBalance (fetch + upsert + partialize)** → Task 2. ✅
- **Cascada real deuda (addPaymentWithCascade + savingsUsed + reversa)** → Task 3. ✅
- **Cascada real tarjeta** → Task 4. ✅
- **Quitar gate demo de la cascada (ambos modales)** → Tasks 5-6. ✅
- **Campo efectivo en Ajustes (real)** → Task 7. ✅
- **Campo efectivo en onboarding** → Task 8. ✅
- **Usuarios existentes en 0 + banner** → Task 2 (default) + el banner ya existe. ✅
- **Aportes negativos reusan addContribution** → Tasks 3-4 (verificado que acepta). ✅
- **Deploy manual SQL-primero** → sección Despliegue. ✅
- **Sin flag (cascada a todos)** → Tasks 5-6 sin flag. ✅
- **i18n** → Tasks 7-8. ✅

**Nota de ejecución:** varias tareas piden "leer/verificar" el cuerpo real de funciones
(`addCardPayment`/`deleteCardPayment` de tarjetas, import de useSavingsStore, el botón de
confirmar del onboarding). Es deliberado: son contratos existentes a confirmar al cablear,
no placeholders. El plan da el patrón exacto a aplicar en cada caso.
