// FinTrack — Preferencias del usuario (híbrido Supabase + caché local).
//
// budgetLevel: nivel de presupuesto elegido por el usuario.
//   'tracking' (Seguimiento) | '503020' (regla 50/30/20) | 'zero' (base cero).
//   Default para usuarios nuevos = 'tracking' (la entrada más simple).
//
// Persistencia: caché local con persist (para que aplique al instante y funcione
// en modo demo/QA sin sesión) + tabla `profiles` en Supabase como fuente de verdad
// cuando hay sesión. En demo NUNCA toca Supabase. fetchPrefs sobrescribe el caché
// con el valor de Supabase al cargar (igual que fetchBudgets reemplaza budgets).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, getCurrentUser } from '../lib/supabase';
import { isDemoActive } from '../stitch/demoMode';
import { setRuntimeCurrency } from '../utils/currencyRuntime';

export const BUDGET_LEVELS = ['tracking', '503020', 'zero'];
const DEFAULT_LEVEL = 'tracking';

const usePrefsStore = create(
  persist(
    (set, get) => ({
      budgetLevel: DEFAULT_LEVEL,
      // ¿El usuario ya vio el tutorial guiado? Controla el auto-arranque (solo la
      // 1ª vez). En demo vive solo en caché local; con sesión, en profiles.
      tutorialSeen: false,
      currency: null,
      loading: false,
      // ¿Ya resolvió fetchPrefs al menos una vez? El auto-arranque del tutorial
      // espera a esto para no decidir con el caché provisional (evita disparar el
      // tour a quien ya lo vio en otro dispositivo, y evita la carrera con OAuth
      // donde loading hace false→true→false tras el primer paint).
      prefsLoaded: false,
      // Efectivo líquido inicial declarado por el usuario (modo demo). NO se
      // persiste (no está en partialize) ni se sincroniza a Supabase en esta fase.
      initialCashBalance: 0,

      /** Carga prefs desde Supabase (si hay sesión). Sin sesión deja el caché. */
      fetchPrefs: async () => {
        if (isDemoActive()) { set({ prefsLoaded: true }); return; } // demo: solo caché local
        const user = await getCurrentUser();
        if (!user) { set({ prefsLoaded: true }); return; }
        set({ loading: true });
        const { data, error } = await supabase
          .from('profiles')
          .select('budget_level, tutorial_seen, currency, initial_cash_balance')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!error && data) {
          const next = { loading: false, prefsLoaded: true };
          if (data.budget_level && BUDGET_LEVELS.includes(data.budget_level)) next.budgetLevel = data.budget_level;
          if (typeof data.tutorial_seen === 'boolean') next.tutorialSeen = data.tutorial_seen;
          if (data.initial_cash_balance != null) next.initialCashBalance = Number(data.initial_cash_balance);
          if (data.currency) {
            next.currency = data.currency;
            setRuntimeCurrency(data.currency);
          } else {
            // Perfil sin moneda elegida: resetea (un usuario nuevo no debe
            // heredar el runtime del usuario/caché anterior).
            next.currency = null;
            setRuntimeCurrency(null);
          }
          set(next);
        } else {
          // Usuario nuevo sin fila en profiles (data null): tutorialSeen queda
          // en false → el tutorial debe arrancar.
          set({ loading: false, prefsLoaded: true });
        }
      },

      /** Marca el tutorial como visto (optimista). En demo solo caché. */
      setTutorialSeen: async (seen = true) => {
        const prev = get().tutorialSeen;
        set({ tutorialSeen: seen }); // optimista
        if (isDemoActive()) return;
        const user = await getCurrentUser();
        if (!user) return; // sin sesión, solo caché local
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, tutorial_seen: seen, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          if (import.meta.env.DEV) console.error('Error guardando tutorial_seen:', error);
          set({ tutorialSeen: prev }); // rollback
        }
      },

      /** Cambia el nivel (optimista). En demo solo caché; con sesión hace upsert. */
      setBudgetLevel: async (level) => {
        if (!BUDGET_LEVELS.includes(level)) return;
        const prev = get().budgetLevel;
        set({ budgetLevel: level }); // optimista
        if (isDemoActive()) return;
        const user = await getCurrentUser();
        if (!user) return; // sin sesión, solo caché local
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, budget_level: level, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          if (import.meta.env.DEV) console.error('Error guardando nivel de presupuesto:', error);
          set({ budgetLevel: prev }); // rollback
        }
      },

      /** Fija la moneda del usuario (optimista). En demo solo caché. */
      setCurrency: async (code) => {
        const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
        if (!/^[A-Z]{3}$/.test(c)) return;
        const prev = get().currency;
        set({ currency: c });
        setRuntimeCurrency(c);
        if (isDemoActive()) return;
        const user = await getCurrentUser();
        if (!user) return;
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, currency: c, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          if (import.meta.env.DEV) console.error('Error guardando moneda:', error);
          set({ currency: prev });
          setRuntimeCurrency(prev);
        }
      },

      /** Fija el efectivo inicial (optimista). En demo solo caché; con sesión upsert. */
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
    }),
    {
      name: 'fintrack-prefs-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen, currency: state.currency, initialCashBalance: state.initialCashBalance }),
      onRehydrateStorage: () => (state) => { if (state?.currency) setRuntimeCurrency(state.currency); },
    },
  ),
);

export default usePrefsStore;
