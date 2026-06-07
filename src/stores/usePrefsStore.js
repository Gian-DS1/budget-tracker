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

export const BUDGET_LEVELS = ['tracking', '503020', 'zero'];
const DEFAULT_LEVEL = 'tracking';

const usePrefsStore = create(
  persist(
    (set, get) => ({
      budgetLevel: DEFAULT_LEVEL,
      // ¿El usuario ya vio el tutorial guiado? Controla el auto-arranque (solo la
      // 1ª vez). En demo vive solo en caché local; con sesión, en profiles.
      tutorialSeen: false,
      loading: false,

      /** Carga prefs desde Supabase (si hay sesión). Sin sesión deja el caché. */
      fetchPrefs: async () => {
        if (isDemoActive()) return; // demo: solo caché local
        const user = await getCurrentUser();
        if (!user) return;
        set({ loading: true });
        const { data, error } = await supabase
          .from('profiles')
          .select('budget_level, tutorial_seen')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!error && data) {
          const next = { loading: false };
          if (data.budget_level && BUDGET_LEVELS.includes(data.budget_level)) next.budgetLevel = data.budget_level;
          if (typeof data.tutorial_seen === 'boolean') next.tutorialSeen = data.tutorial_seen;
          set(next);
        } else {
          set({ loading: false });
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
    }),
    {
      name: 'fintrack-prefs-cache',
  storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ budgetLevel: state.budgetLevel, tutorialSeen: state.tutorialSeen }),
    },
  ),
);

export default usePrefsStore;
