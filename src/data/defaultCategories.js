// FinTrack RD — Default Categories for Dominican Republic

import { generateId } from '../utils/formatters';

export const defaultCategories = [
  // Income
  {
    id: generateId(),
    name: 'Salario',
    type: 'income',
    icon: '💼',
    color: '#10b981',
    keywords: ['salario', 'sueldo', 'nómina', 'quincena', 'pago'],
    isActive: true,
    sortOrder: 0,
  },
  {
    id: generateId(),
    name: 'Freelance',
    type: 'income',
    icon: '💻',
    color: '#06b6d4',
    keywords: ['freelance', 'proyecto', 'consultoría', 'cliente'],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: generateId(),
    name: 'Otros Ingresos',
    type: 'income',
    icon: '💰',
    color: '#8b5cf6',
    keywords: ['bono', 'regalo', 'reembolso', 'transferencia'],
    isActive: true,
    sortOrder: 2,
  },

  // Fixed Expenses
  {
    id: generateId(),
    name: 'Alquiler',
    type: 'fixed_expense',
    icon: '🏠',
    color: '#6366f1',
    keywords: ['alquiler', 'renta', 'apartamento', 'casa'],
    isActive: true,
    sortOrder: 3,
  },
  {
    id: generateId(),
    name: 'Servicios (Luz/Agua/Gas)',
    type: 'fixed_expense',
    icon: '💡',
    color: '#f59e0b',
    keywords: ['edenorte', 'edesur', 'edeeste', 'luz', 'agua', 'gas', 'CAASD', 'electricidad'],
    isActive: true,
    sortOrder: 4,
  },
  {
    id: generateId(),
    name: 'Internet/Cable/Teléfono',
    type: 'fixed_expense',
    icon: '📱',
    color: '#3b82f6',
    keywords: ['claro', 'altice', 'internet', 'cable', 'teléfono', 'celular', 'plan'],
    isActive: true,
    sortOrder: 5,
  },
  {
    id: generateId(),
    name: 'Seguro',
    type: 'fixed_expense',
    icon: '🛡️',
    color: '#14b8a6',
    keywords: ['seguro', 'ARS', 'salud', 'vida', 'vehículo'],
    isActive: true,
    sortOrder: 6,
  },

  // Variable Expenses
  {
    id: generateId(),
    name: 'Alimentación',
    type: 'variable_expense',
    icon: '🛒',
    color: '#ef4444',
    keywords: ['supermercado', 'colmado', 'mercado', 'comida', 'nacional', 'jumbo', 'bravo', 'sirena', 'ole'],
    isActive: true,
    sortOrder: 7,
  },
  {
    id: generateId(),
    name: 'Transporte',
    type: 'variable_expense',
    icon: '🚗',
    color: '#f97316',
    keywords: ['gasolina', 'uber', 'didi', 'indriver', 'taxi', 'guagua', 'metro', 'teleférico', 'peaje'],
    isActive: true,
    sortOrder: 8,
  },
  {
    id: generateId(),
    name: 'Restaurantes',
    type: 'variable_expense',
    icon: '🍽️',
    color: '#ec4899',
    keywords: ['restaurante', 'delivery', 'pedidos ya', 'hugo', 'comida rápida', 'fast food'],
    isActive: true,
    sortOrder: 9,
  },
  {
    id: generateId(),
    name: 'Entretenimiento',
    type: 'variable_expense',
    icon: '🎬',
    color: '#a855f7',
    keywords: ['cine', 'netflix', 'spotify', 'disney', 'hbo', 'juego', 'fiesta', 'bar', 'discoteca'],
    isActive: true,
    sortOrder: 10,
  },
  {
    id: generateId(),
    name: 'Salud',
    type: 'variable_expense',
    icon: '🏥',
    color: '#22c55e',
    keywords: ['médico', 'doctor', 'farmacia', 'medicina', 'hospital', 'clínica', 'dentista', 'óptica'],
    isActive: true,
    sortOrder: 11,
  },
  {
    id: generateId(),
    name: 'Educación',
    type: 'variable_expense',
    icon: '📚',
    color: '#0ea5e9',
    keywords: ['universidad', 'curso', 'libro', 'udemy', 'platzi', 'escuela', 'colegio', 'matrícula'],
    isActive: true,
    sortOrder: 12,
  },
  {
    id: generateId(),
    name: 'Ropa y Calzado',
    type: 'variable_expense',
    icon: '👕',
    color: '#d946ef',
    keywords: ['ropa', 'zapatos', 'calzado', 'tienda', 'zara', 'forever'],
    isActive: true,
    sortOrder: 13,
  },
  {
    id: generateId(),
    name: 'Cuidado Personal',
    type: 'variable_expense',
    icon: '💈',
    color: '#f472b6',
    keywords: ['barbería', 'peluquería', 'salon', 'spa', 'gym', 'gimnasio'],
    isActive: true,
    sortOrder: 14,
  },
  {
    id: generateId(),
    name: 'Otros Gastos',
    type: 'variable_expense',
    icon: '📦',
    color: '#94a3b8',
    keywords: [],
    isActive: true,
    sortOrder: 15,
  },

  // Savings
  {
    id: generateId(),
    name: 'Ahorro General',
    type: 'savings',
    icon: '🏦',
    color: '#06b6d4',
    keywords: ['ahorro', 'depósito', 'inversión'],
    isActive: true,
    sortOrder: 16,
  },
  {
    id: generateId(),
    name: 'Fondo de Emergencia',
    type: 'savings',
    icon: '🆘',
    color: '#f59e0b',
    keywords: ['emergencia', 'reserva'],
    isActive: true,
    sortOrder: 17,
  },
];

/**
 * Auto-categorize a transaction description based on keywords
 */
export function autoCategorize(description, categories) {
  if (!description) return null;
  const lowerDesc = description.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const category of categories) {
    if (!category.isActive || !category.keywords) continue;

    for (const keyword of category.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        const score = keyword.length; // Longer keywords = more specific match
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
  }

  return bestMatch;
}
