import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { defaultCategories } from '../data/defaultCategories';
import toast from 'react-hot-toast';

const useCategoryStore = create((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    const { data: { user } } = await supabase.auth.getUser();
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
          set({ categories: formattedData, loading: false });
          return;
        }
      } catch (err) {
        console.error("Failed to seed categories", err);
        set({ categories: defaultCategories, loading: false });
        return;
      }
    }

    const formattedData = data.map(c => ({
      ...c, 
      isActive: c.is_active, 
      sortOrder: c.sort_order 
    }));
    set({ categories: formattedData, loading: false });
  },

  addCategory: async (category) => {
    const { data: { user } } = await supabase.auth.getUser();
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
      set((state) => ({ categories: [...state.categories, newCat] }));
    }
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
}));

export default useCategoryStore;
