// FinTrack RD — Default Categories for Dominican Republic

import { generateId } from '../utils/formatters';

export const defaultCategories = [
  // ── Income ──────────────────────────────────────────────────
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
    name: 'Inversiones',
    type: 'income',
    icon: '📈',
    color: '#3b82f6',
    keywords: ['darwinex', 'inversión', 'inversiones', 'dividendo', 'intereses', 'trading'],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: generateId(),
    name: 'Otros Ingresos',
    type: 'income',
    icon: '💰',
    color: '#8b5cf6',
    keywords: ['bono', 'regalo', 'reembolso', 'transferencia'],
    isActive: true,
    sortOrder: 3,
  },

  // ── Fixed Expenses ──────────────────────────────────────────
  {
    id: generateId(),
    name: 'Alquiler',
    type: 'fixed_expense',
    icon: '🏠',
    color: '#6366f1',
    keywords: ['alquiler', 'renta', 'apartamento', 'casa', 'ver apartamento'],
    isActive: true,
    sortOrder: 4,
  },
  {
    id: generateId(),
    name: 'Internet/Cable/Teléfono',
    type: 'fixed_expense',
    icon: '📶',
    color: '#3b82f6',
    keywords: ['claro', 'altice', 'teléfono', 'telefono', 'celular', 'plan', 'recarga', 'internet', 'wind', 'viva'],
    isActive: true,
    sortOrder: 5,
  },
  {
    id: generateId(),
    name: 'Seguro',
    type: 'fixed_expense',
    icon: '🏥',
    color: '#10b981',
    keywords: ['seguro médico', 'seguro medico', 'ARS', 'senasa', 'humano', 'palic', 'unigold', 'universal', 'médico', 'doctor', 'hospital', 'clínica', 'dentista', 'óptica', 'cemdoe', 'consulta médica'],
    isActive: true,
    sortOrder: 6,
  },
  {
    id: generateId(),
    name: 'Mantenimiento y Seguro de Vehículo',
    type: 'fixed_expense',
    icon: '🚗',
    color: '#f43f5e',
    keywords: ['pago vehículo', 'pago vehiculo', 'seguro vehículo', 'seguro vehiculo', 'vehicas', 'marbete', 'lavado', 'mantenimiento', 'repuesto', 'taller'],
    isActive: true,
    sortOrder: 7,
  },
  {
    id: generateId(),
    name: 'Suscripciones Digitales',
    type: 'fixed_expense',
    icon: '📺',
    color: '#a855f7',
    keywords: ['apple music', 'netflix', 'spotify', 'disney', 'hbo', 'suscripción', 'youtube premium', 'cvwizard'],
    isActive: true,
    sortOrder: 8,
  },
  {
    id: generateId(),
    name: 'Servicios (Luz/Agua/Gas)',
    type: 'fixed_expense',
    icon: '💡',
    color: '#f59e0b',
    keywords: ['luz', 'edenorte', 'edesur', 'edeeste', 'electricidad', 'cdeee', 'caasd', 'agua', 'gas', 'propano'],
    isActive: true,
    sortOrder: 9,
  },
  {
    id: generateId(),
    name: 'Gimnasio y Deporte',
    type: 'fixed_expense',
    icon: '🏋️',
    color: '#22c55e',
    keywords: ['gimnasio', 'gym', 'crossfit', 'yoga', 'pilates', 'membresía gym', 'deporte'],
    isActive: true,
    sortOrder: 10,
  },
  {
    id: generateId(),
    name: 'Pago de Préstamos y Deudas',
    type: 'fixed_expense',
    icon: '🏛️',
    color: '#dc2626',
    // slug estable: la sincronización Deudas→Transacciones la busca por aquí, no
    // por el nombre (que el usuario puede renombrar).
    slug: 'pago-deuda',
    keywords: ['prestamo', 'préstamo', 'cuota', 'intereses', 'capital', 'abono a deuda', 'financiamiento', 'tarjeta de crédito', 'prestamos'],
    isActive: true,
    sortOrder: 10.5,
  },

  // ── Variable Expenses ───────────────────────────────────────
  {
    id: generateId(),
    name: 'Supermercado',
    type: 'variable_expense',
    icon: '🛒',
    color: '#ef4444',
    keywords: ['supermercado', 'nacional', 'jumbo', 'bravo', 'sirena', 'ole', 'la sirena', 'pricesmart', 'colmado', 'almacen'],
    isActive: true,
    sortOrder: 11,
  },
  {
    id: generateId(),
    name: 'Restaurantes y Delivery',
    type: 'variable_expense',
    icon: '🍕',
    color: '#ec4899',
    keywords: ['restaurante', 'pizza', 'jade', 'teriyaki', 'mcdonald', 'burger', 'eats', 'uber eats', 'pedidosya', 'delivery', 'empanada', 'hotdog', 'cafe', 'american cafe', 'rico hotdog', 'empanadas mañon', 'pasta ubereats'],
    isActive: true,
    sortOrder: 12,
  },
  {
    id: generateId(),
    name: 'Combustible',
    type: 'variable_expense',
    icon: '🛵',
    color: '#f97316',
    keywords: ['gasolina', 'combustible', 'gasoil', 'estacion de servicio', 'texaco', 'shell', 'sunix', 'total'],
    isActive: true,
    sortOrder: 13,
  },
  {
    id: generateId(),
    name: 'Taxi y Transporte',
    type: 'variable_expense',
    icon: '🚕',
    color: '#fbbf24',
    keywords: ['uber', 'taxi', 'didi', 'indriver', 'cabify', 'transporte', 'pasaje', 'peajes', 'parqueo', 'estacionamiento'],
    isActive: true,
    sortOrder: 14,
  },
  {
    id: generateId(),
    name: 'Ropa y Calzado',
    type: 'variable_expense',
    icon: '👗',
    color: '#e11d48',
    keywords: ['ropa', 'zapatos', 'calzado', 'tenis', 'zapatillas', 'camisa', 'pantalón', 'vestido', 'zara', 'hm', 'forever 21', 'tienda ropa'],
    isActive: true,
    sortOrder: 16,
  },
  {
    id: generateId(),
    name: 'Hogar y Reparaciones',
    type: 'variable_expense',
    icon: '🛠️',
    color: '#14b8a6',
    keywords: ['ferreteria', 'ferretería', 'pintor', 'instalacion', 'reparacion', 'nevera', 'corripio', 'ikea', 'colchones', 'gabetero', 'mueble', 'decoración', 'casa cuesta', 'plomero', 'electricista'],
    isActive: true,
    sortOrder: 17,
  },
  {
    id: generateId(),
    name: 'Tecnología y Accesorios',
    type: 'variable_expense',
    icon: '🎧',
    color: '#6366f1',
    keywords: ['amazon headset', 'cable hdmi', 'air duster', 'tecnología', 'gadget', 'computadora', 'audifonos', 'celular nuevo'],
    isActive: true,
    sortOrder: 18,
  },
  {
    id: generateId(),
    name: 'Farmacia y Medicamentos',
    type: 'variable_expense',
    icon: '💊',
    color: '#ef4444',
    keywords: ['farmacia', 'medicamento', 'carol', 'suchel', 'medicina', 'pastilla'],
    isActive: true,
    sortOrder: 19,
  },
  {
    id: generateId(),
    name: 'Belleza',
    type: 'variable_expense',
    icon: '💅',
    color: '#f472b6',
    keywords: ['belleza', 'maquillaje', 'uñas', 'manicure', 'pedicure', 'cosméticos', 'crema', 'skincare', 'perfume', 'nail'],
    isActive: true,
    sortOrder: 21,
  },
  {
    id: generateId(),
    name: 'Viajes',
    type: 'variable_expense',
    icon: '✈️',
    color: '#0891b2',
    keywords: ['vuelo', 'hotel', 'airbnb', 'excursión', 'viaje', 'aeropuerto', 'maleta', 'resort', 'playa', 'turismo', 'booking'],
    isActive: true,
    sortOrder: 23,
  },
  {
    id: generateId(),
    name: 'Mascotas',
    type: 'variable_expense',
    icon: '🐾',
    color: '#a3e635',
    keywords: ['mascota', 'veterinario', 'perro', 'gato', 'comida mascota', 'veterinaria', 'pet'],
    isActive: true,
    sortOrder: 24,
  },
  {
    id: generateId(),
    name: 'Regalos y Donaciones',
    type: 'variable_expense',
    icon: '🎁',
    color: '#d946ef',
    keywords: ['regalo', 'regalos', 'donación', 'donacion', 'cumpleaños'],
    isActive: true,
    sortOrder: 25,
  },

  // ── Savings ─────────────────────────────────────────────────
  {
    id: generateId(),
    name: 'Ahorro General',
    type: 'savings',
    icon: '🏦',
    color: '#06b6d4',
    keywords: ['ahorro', 'depósito', 'inversión'],
    isActive: true,
    sortOrder: 27,
  },
  {
    id: generateId(),
    name: 'Fondo de Emergencia',
    type: 'savings',
    icon: '🆘',
    color: '#f59e0b',
    keywords: ['emergencia', 'reserva'],
    isActive: true,
    sortOrder: 28,
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

/**
 * Find exact duplicate categories (same normalized name + type). Keeps the
 * FIRST occurrence of each group as canonical and returns the remapping needed
 * to reassign references (transactions, budgets) before deleting the rest.
 *
 * @param {Array} categories - list of {id, name, type}
 * @returns {{ remap: {fromId: string, toId: string}[], deleteIds: string[] }}
 */
export function findDuplicateCategories(categories) {
  const groups = new Map();
  for (const c of categories) {
    const key = `${(c.name || '').trim().toLowerCase()}|${c.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const remap = [];
  const deleteIds = [];
  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    const keeper = list[0];
    for (let i = 1; i < list.length; i++) {
      remap.push({ fromId: list[i].id, toId: keeper.id });
      deleteIds.push(list[i].id);
    }
  }

  return { remap, deleteIds };
}
