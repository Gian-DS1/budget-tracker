// FinTrack RD — Category Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultCategories } from '../data/defaultCategories';
import { generateId } from '../utils/formatters';

const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: defaultCategories,

      addCategory: (category) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { ...category, id: generateId(), isActive: true, sortOrder: state.categories.length },
          ],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      toggleCategory: (id) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          ),
        })),

      getActiveCategories: () => get().categories.filter((c) => c.isActive),

      getCategoriesByType: (type) => get().categories.filter((c) => c.type === type && c.isActive),

      getCategoryById: (id) => get().categories.find((c) => c.id === id),
    }),
    {
      name: 'fintrack-categories',
    }
  )
);

export default useCategoryStore;
