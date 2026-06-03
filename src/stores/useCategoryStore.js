import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { defaultCategories, findDuplicateCategories } from '../data/defaultCategories';
import toast from 'react-hot-toast';

// Shared across all calls: dedupes concurrent fetchCategories invocations so the
// seeding logic can never run twice in parallel and double-seed categories.
let fetchInFlight = null;

const useCategoryStore = create(
  persist(
    (set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    if (fetchInFlight) return fetchInFlight;
    fetchInFlight = (async () => {
    set({ loading: true, error: null });
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      set({ categories: [], loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      set({ categories: defaultCategories, loading: false });
      return;
    }

    // Seed default categories if user has none
    if (!data || data.length === 0) {
      try {
        const seedData = defaultCategories.map((c, index) => ({
          user_id: user.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          slug: c.slug || null,
          keywords: c.keywords || [],
          is_active: true,
          sort_order: index
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('categories')
          .insert(seedData)
          .select();

        if (insertError) {
          console.error("Supabase insert error:", insertError);
          toast.error("Error cargando categorías iniciales");
          set({ categories: defaultCategories, loading: false });
          return;
        }

        if (insertedData) {
          const formattedData = insertedData.map(c => ({
            ...c,
            isActive: c.is_active,
            sortOrder: c.sort_order
          }));
          set({ categories: formattedData.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })), loading: false });
          return;
        }
      } catch (err) {
        console.error("Failed to seed categories", err);
        set({ categories: defaultCategories, loading: false });
        return;
      }
    }
    // ── Auto-clean duplicates already in the database ───────────
    const { remap, deleteIds } = findDuplicateCategories(data);
    if (deleteIds.length > 0) {
      try {
        for (const { fromId, toId } of remap) {
          await supabase.from('transactions').update({ category_id: toId }).eq('user_id', user.id).eq('category_id', fromId);
          await supabase.from('budgets').update({ category_id: toId }).eq('user_id', user.id).eq('category_id', fromId);
        }
        await supabase.from('categories').delete().in('id', deleteIds);
      } catch (err) {
        console.error('Auto-dedupe error:', err);
      }
    }

    // After cleaning, work only with the de-duplicated list.
    const cleanData = data.filter((c) => !deleteIds.includes(c.id));

    // Build a set of (normalised name|type) keys from existing DB categories so
    // the missing-check is resilient to duplicates already in the database.
    const existingKeys = new Set(
      cleanData.map((c) => `${(c.name || '').trim().toLowerCase()}|${c.type}`)
    );

    const missingCategories = defaultCategories.filter(
      (dc) => !existingKeys.has(`${dc.name.trim().toLowerCase()}|${dc.type}`)
    );

    let finalCategories = [...cleanData];

    if (missingCategories.length > 0) {
      try {
        // Dedupe the insert payload itself so we never send two rows with
        // the same name|type in a single batch.
        const seen = new Set();
        const uniqueMissing = missingCategories.filter((c) => {
          const k = `${c.name.trim().toLowerCase()}|${c.type}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        const seedMissing = uniqueMissing.map((c, index) => ({
          user_id: user.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          slug: c.slug || null,
          keywords: c.keywords || [],
          is_active: true,
          sort_order: cleanData.length + index
        }));

        const { data: insertedMissing, error: insertError } = await supabase
          .from('categories')
          .insert(seedMissing)
          .select();

        if (!insertError && insertedMissing) {
          finalCategories = [...finalCategories, ...insertedMissing];
        } else if (insertError) {
          console.error("Failed to auto-insert missing categories:", insertError);
        }
      } catch (err) {
        console.error("Error auto-inserting missing categories:", err);
      }
    }

    const formattedData = finalCategories.map(c => ({
      ...c,
      isActive: c.is_active,
      sortOrder: c.sort_order,
      isAccumulative: c.is_accumulative || false,
      accumulationStart: c.accumulation_start || null
    }));
    set({ categories: formattedData.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })), loading: false });
    })();

    try {
      await fetchInFlight;
    } finally {
      fetchInFlight = null;
    }
  },

  resetCategoriesToDefault: async () => {
    set({ loading: true, error: null });
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      set({ loading: false });
      return false;
    }

    try {
      // 1. Delete all existing categories for this user
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error("Error deleting categories:", deleteError);
        toast.error("Error al borrar categorías existentes");
        set({ loading: false });
        return false;
      }

      // 2. Insert new default categories
      const seedData = defaultCategories.map((c, index) => ({
        user_id: user.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        slug: c.slug || null,
        keywords: c.keywords || [],
        is_active: true,
        sort_order: index
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('categories')
        .insert(seedData)
        .select();

      if (insertError) {
        console.error("Error seeding default categories:", insertError);
        toast.error("Error insertando nuevas categorías por defecto");
        set({ loading: false });
        return false;
      }

      if (insertedData) {
        const formattedData = insertedData.map(c => ({
          ...c,
          isActive: c.is_active,
          sortOrder: c.sort_order
        }));
        set({ categories: formattedData.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })), loading: false });
        toast.success("Categorías restablecidas con éxito");
        return true;
      }
    } catch (err) {
      console.error("Failed to reset categories", err);
      toast.error("Error al restablecer categorías");
      set({ loading: false });
      return false;
    }
  },

  addCategory: async (category) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    
    const dbCategory = {
      user_id: user.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      keywords: category.keywords || [],
      is_active: category.isActive !== undefined ? category.isActive : true,
      sort_order: get().categories.length
    };

    const { data, error } = await supabase.from('categories').insert(dbCategory).select().single();
    if (!error && data) {
      const newCat = { ...data, isActive: data.is_active, sortOrder: data.sort_order };
      set((state) => ({
        categories: [...state.categories, newCat].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
        ),
      }));
    }
  },

  // Crea (si no existe) una categoría a partir de una definición
  // {slug, name, type, icon, color, keywords} y devuelve su id. Si ya existe (por
  // slug o nombre+tipo) devuelve el id existente sin duplicar. Al crear una
  // categoría de ecosistema, quita sus keywords del Supermercado del usuario para
  // que el auto-categorizador rutee la compra a la categoría dedicada.
  ensureCategory: async (def) => {
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    const found = get().categories.find(
      (c) => (def.slug && c.slug === def.slug) || (norm(c.name) === norm(def.name) && c.type === def.type)
    );
    if (found) return found.id;

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const payload = {
      user_id: user.id,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      slug: def.slug || null,
      keywords: def.keywords || [],
      is_active: true,
      sort_order: get().categories.length,
    };

    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error || !data) {
      console.error('ensureCategory error:', error);
      return null;
    }

    const newCat = { ...data, isActive: data.is_active, sortOrder: data.sort_order };
    set((state) => ({
      categories: [...state.categories, newCat].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })),
    }));

    // Quitar del Supermercado del usuario las keywords que ahora pertenecen a esta
    // categoría dedicada (solo afecta a usuarios cuyo Supermercado aún las tenga).
    const ecoKeys = new Set((def.keywords || []).map(norm));
    const sup = get().categories.find(
      (c) => c.slug === 'supermercado' || (norm(c.name) === 'supermercado' && c.type === 'variable_expense')
    );
    if (sup && Array.isArray(sup.keywords)) {
      const filtered = sup.keywords.filter((k) => !ecoKeys.has(norm(k)));
      if (filtered.length !== sup.keywords.length) {
        await get().updateCategory(sup.id, { keywords: filtered });
      }
    }

    return data.id;
  },

  updateCategory: async (id, updates) => {
    const dbUpdates = { ...updates };
    if (updates.isActive !== undefined) {
      dbUpdates.is_active = updates.isActive;
      delete dbUpdates.isActive;
    }
    if (updates.sortOrder !== undefined) {
      dbUpdates.sort_order = updates.sortOrder;
      delete dbUpdates.sortOrder;
    }
    if (updates.isAccumulative !== undefined) {
      dbUpdates.is_accumulative = updates.isAccumulative;
      delete dbUpdates.isAccumulative;
    }
    if (updates.accumulationStart !== undefined) {
      dbUpdates.accumulation_start = updates.accumulationStart;
      delete dbUpdates.accumulationStart;
    }

    const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
    if (!error) {
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    }
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    }
  },

  toggleCategory: async (id) => {
    const cat = get().categories.find(c => c.id === id);
    if (!cat) return;
    await get().updateCategory(id, { isActive: !cat.isActive });
  },

  getActiveCategories: () => get().categories.filter((c) => c.isActive),
  getCategoriesByType: (type) => get().categories.filter((c) => c.type === type && c.isActive),
  getCategoryById: (id) => get().categories.find((c) => c.id === id),
}),
{
  name: 'fintrack-categories-cache',
  partialize: (state) => ({ categories: state.categories }),
}
)
);

export default useCategoryStore;
