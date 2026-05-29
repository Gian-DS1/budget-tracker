import { describe, it, expect } from 'vitest';
import { findDuplicateCategories } from './defaultCategories';

describe('findDuplicateCategories', () => {
  it('no devuelve nada cuando no hay duplicados', () => {
    const { remap, deleteIds } = findDuplicateCategories([
      { id: '1', name: 'Salario', type: 'income' },
      { id: '2', name: 'Supermercado', type: 'variable_expense' },
    ]);
    expect(remap).toEqual([]);
    expect(deleteIds).toEqual([]);
  });

  it('conserva el primero y marca los demás del mismo nombre+tipo', () => {
    const { remap, deleteIds } = findDuplicateCategories([
      { id: 'a', name: 'Supermercado', type: 'variable_expense' },
      { id: 'b', name: 'Supermercado', type: 'variable_expense' },
      { id: 'c', name: 'Supermercado', type: 'variable_expense' },
    ]);
    expect(deleteIds).toEqual(['b', 'c']);
    expect(remap).toEqual([
      { fromId: 'b', toId: 'a' },
      { fromId: 'c', toId: 'a' },
    ]);
  });

  it('no fusiona categorías con el mismo nombre pero distinto tipo', () => {
    const { remap, deleteIds } = findDuplicateCategories([
      { id: '1', name: 'Inversiones', type: 'income' },
      { id: '2', name: 'Inversiones', type: 'savings' },
    ]);
    expect(remap).toEqual([]);
    expect(deleteIds).toEqual([]);
  });

  it('compara el nombre ignorando mayúsculas y espacios', () => {
    const { deleteIds } = findDuplicateCategories([
      { id: '1', name: 'Combustible', type: 'variable_expense' },
      { id: '2', name: '  combustible ', type: 'variable_expense' },
    ]);
    expect(deleteIds).toEqual(['2']);
  });
});
