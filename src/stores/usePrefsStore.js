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
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { isDemoActive } from '../stitch/demoMode';

export const BUDGET_LEVELS = ['tracking', '503020', 'zero'];
const DEFAULT_LEVEL = 'tracking';

const usePrefsStore = create(
  persist(
    (set, get) => ({
      budgetLevel: DEFAULT_LEVEL,
      loading: false,

      /** Carga el nivel desde Supabase (si hay sesión). Sin sesión deja el caché. */
      fetchPrefs: async () => {
        if (isDemoActive()) return; // demo: solo caché local
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        set({ loading: true });
        const { data, error } = await supabase
          .from('profiles')
          .select('budget_level')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!error && data?.budget_level && BUDGET_LEVELS.includes(data.budget_level)) {
          set({ budgetLevel: data.budget_level, loading: false });
        } else {
          set({ loading: false });
        }
      },

      /** Cambia el nivel (optimista). En demo solo caché; con sesión hace upsert. */
      setBudgetLevel: async (level) => {
        if (!BUDGET_LEVELS.includes(level)) return;
        const prev = get().budgetLevel;
        set({ budgetLevel: level }); // optimista
        if (isDemoActive()) return;
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return; // sin sesión, solo caché local
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, budget_level: level, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
          console.error('Error guardando nivel de presupuesto:', error);
          set({ budgetLevel: prev }); // rollback
        }
      },
    }),
    {
      name: 'fintrack-prefs-cache',
      partialize: (state) => ({ budgetLevel: state.budgetLevel }),
    },
  ),
);

export default usePrefsStore;
