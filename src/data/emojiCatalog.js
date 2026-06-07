// src/data/emojiCatalog.js
// Lista curada de emojis para categorías financieras. NO usamos el set completo
// de emoji-toolkit (3,800+) por usabilidad y rendimiento. Cada entry:
//   { char, name, keywords, group }
// `char` es el carácter unicode (lo que <Emoji e=...> y el campo icon esperan).

export const EMOJI_GROUPS = [
  { id: 'finanzas', label: 'Dinero' },
  { id: 'comida', label: 'Comida' },
  { id: 'compras', label: 'Compras' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'hogar', label: 'Hogar' },
  { id: 'salud', label: 'Salud' },
  { id: 'ocio', label: 'Ocio y Tech' },
  { id: 'otros', label: 'Otros' },
];

export const EMOJI_CATALOG = [
  // Dinero / Finanzas
  { char: '💰', name: 'Bolsa de dinero', keywords: ['dinero', 'ahorro', 'ingreso'], group: 'finanzas' },
  { char: '💵', name: 'Billete', keywords: ['dinero', 'efectivo', 'pago'], group: 'finanzas' },
  { char: '💸', name: 'Dinero con alas', keywords: ['gasto', 'pago', 'salida'], group: 'finanzas' },
  { char: '💳', name: 'Tarjeta', keywords: ['tarjeta', 'credito', 'pago'], group: 'finanzas' },
  { char: '🪙', name: 'Moneda', keywords: ['dinero', 'cambio', 'moneda'], group: 'finanzas' },
  { char: '🏦', name: 'Banco', keywords: ['banco', 'cuenta'], group: 'finanzas' },
  { char: '📈', name: 'Gráfico al alza', keywords: ['inversion', 'ganancia', 'subida'], group: 'finanzas' },
  { char: '📉', name: 'Gráfico a la baja', keywords: ['perdida', 'bajada'], group: 'finanzas' },
  { char: '🧾', name: 'Recibo', keywords: ['factura', 'recibo', 'cuenta'], group: 'finanzas' },
  { char: '💼', name: 'Maletín', keywords: ['trabajo', 'negocio', 'salario'], group: 'finanzas' },
  { char: '🤑', name: 'Cara con dinero', keywords: ['dinero', 'ganancia'], group: 'finanzas' },
  { char: '🏧', name: 'Cajero', keywords: ['cajero', 'atm', 'retiro'], group: 'finanzas' },
  { char: '💲', name: 'Símbolo dólar', keywords: ['dolar', 'precio'], group: 'finanzas' },
  { char: '🪪', name: 'Identificación', keywords: ['id', 'documento'], group: 'finanzas' },

  // Comida
  { char: '🍔', name: 'Hamburguesa', keywords: ['comida', 'rapida', 'fast food'], group: 'comida' },
  { char: '🍕', name: 'Pizza', keywords: ['comida', 'delivery'], group: 'comida' },
  { char: '🍟', name: 'Papas fritas', keywords: ['comida', 'rapida'], group: 'comida' },
  { char: '🌮', name: 'Taco', keywords: ['comida', 'mexicana'], group: 'comida' },
  { char: '🍣', name: 'Sushi', keywords: ['comida', 'japonesa'], group: 'comida' },
  { char: '🍜', name: 'Fideos', keywords: ['comida', 'sopa'], group: 'comida' },
  { char: '🥗', name: 'Ensalada', keywords: ['comida', 'saludable'], group: 'comida' },
  { char: '🍱', name: 'Bento', keywords: ['comida', 'almuerzo'], group: 'comida' },
  { char: '☕', name: 'Café', keywords: ['cafe', 'bebida', 'cafeteria'], group: 'comida' },
  { char: '🍺', name: 'Cerveza', keywords: ['bebida', 'alcohol', 'bar'], group: 'comida' },
  { char: '🍷', name: 'Vino', keywords: ['bebida', 'alcohol'], group: 'comida' },
  { char: '🥤', name: 'Refresco', keywords: ['bebida', 'soda'], group: 'comida' },
  { char: '🛒', name: 'Carrito', keywords: ['supermercado', 'compras', 'mercado'], group: 'comida' },
  { char: '🥖', name: 'Pan', keywords: ['panaderia', 'comida'], group: 'comida' },
  { char: '🍦', name: 'Helado', keywords: ['postre', 'dulce'], group: 'comida' },
  { char: '🍩', name: 'Dona', keywords: ['postre', 'dulce'], group: 'comida' },

  // Compras
  { char: '🛍️', name: 'Bolsas de compras', keywords: ['compras', 'tienda', 'ropa'], group: 'compras' },
  { char: '👕', name: 'Camiseta', keywords: ['ropa', 'vestimenta'], group: 'compras' },
  { char: '👗', name: 'Vestido', keywords: ['ropa', 'vestimenta'], group: 'compras' },
  { char: '👟', name: 'Zapato deportivo', keywords: ['calzado', 'tenis'], group: 'compras' },
  { char: '👠', name: 'Tacón', keywords: ['calzado', 'zapatos'], group: 'compras' },
  { char: '💄', name: 'Labial', keywords: ['belleza', 'maquillaje', 'cosmetica'], group: 'compras' },
  { char: '💅', name: 'Manicura', keywords: ['belleza', 'salon', 'uñas'], group: 'compras' },
  { char: '💈', name: 'Barbería', keywords: ['barberia', 'corte', 'pelo'], group: 'compras' },
  { char: '🎁', name: 'Regalo', keywords: ['regalo', 'obsequio'], group: 'compras' },
  { char: '💎', name: 'Joya', keywords: ['joyeria', 'lujo'], group: 'compras' },
  { char: '⌚', name: 'Reloj', keywords: ['accesorio', 'reloj'], group: 'compras' },
  { char: '👜', name: 'Cartera', keywords: ['accesorio', 'bolso'], group: 'compras' },
  { char: '🧴', name: 'Loción', keywords: ['cuidado', 'higiene'], group: 'compras' },

  // Transporte
  { char: '🚗', name: 'Carro', keywords: ['auto', 'vehiculo', 'transporte'], group: 'transporte' },
  { char: '🚕', name: 'Taxi', keywords: ['taxi', 'uber', 'transporte'], group: 'transporte' },
  { char: '⛽', name: 'Gasolinera', keywords: ['combustible', 'gasolina', 'gas'], group: 'transporte' },
  { char: '🚌', name: 'Autobús', keywords: ['bus', 'transporte', 'publico'], group: 'transporte' },
  { char: '🚇', name: 'Metro', keywords: ['metro', 'tren', 'transporte'], group: 'transporte' },
  { char: '✈️', name: 'Avión', keywords: ['vuelo', 'viaje', 'avion'], group: 'transporte' },
  { char: '🏍️', name: 'Motocicleta', keywords: ['moto', 'transporte'], group: 'transporte' },
  { char: '🚲', name: 'Bicicleta', keywords: ['bici', 'transporte'], group: 'transporte' },
  { char: '🅿️', name: 'Parqueo', keywords: ['parqueo', 'estacionamiento'], group: 'transporte' },
  { char: '🛣️', name: 'Carretera', keywords: ['peaje', 'viaje'], group: 'transporte' },
  { char: '🔋', name: 'Carga eléctrica', keywords: ['electrico', 'carga', 'vehiculo'], group: 'transporte' },

  // Hogar / Servicios
  { char: '🏠', name: 'Casa', keywords: ['hogar', 'casa', 'alquiler', 'renta'], group: 'hogar' },
  { char: '💡', name: 'Bombilla', keywords: ['luz', 'electricidad', 'servicio'], group: 'hogar' },
  { char: '🚰', name: 'Agua', keywords: ['agua', 'servicio'], group: 'hogar' },
  { char: '🔥', name: 'Gas', keywords: ['gas', 'servicio'], group: 'hogar' },
  { char: '🔧', name: 'Herramienta', keywords: ['reparacion', 'mantenimiento', 'ferreteria'], group: 'hogar' },
  { char: '🛋️', name: 'Sofá', keywords: ['muebles', 'hogar'], group: 'hogar' },
  { char: '🧹', name: 'Escoba', keywords: ['limpieza', 'hogar'], group: 'hogar' },
  { char: '🧺', name: 'Cesta', keywords: ['lavanderia', 'ropa'], group: 'hogar' },
  { char: '🪑', name: 'Silla', keywords: ['muebles', 'hogar'], group: 'hogar' },
  { char: '🏡', name: 'Casa con jardín', keywords: ['hogar', 'casa'], group: 'hogar' },
  { char: '🔑', name: 'Llave', keywords: ['alquiler', 'renta', 'hogar'], group: 'hogar' },
  { char: '📶', name: 'Señal', keywords: ['internet', 'telefono', 'servicio'], group: 'hogar' },

  // Salud
  { char: '💊', name: 'Pastilla', keywords: ['medicina', 'farmacia', 'salud'], group: 'salud' },
  { char: '🏥', name: 'Hospital', keywords: ['salud', 'medico', 'clinica'], group: 'salud' },
  { char: '🩺', name: 'Estetoscopio', keywords: ['salud', 'medico', 'consulta'], group: 'salud' },
  { char: '🦷', name: 'Diente', keywords: ['dentista', 'salud'], group: 'salud' },
  { char: '👓', name: 'Lentes', keywords: ['optica', 'salud'], group: 'salud' },
  { char: '🩹', name: 'Curita', keywords: ['salud', 'cuidado'], group: 'salud' },
  { char: '🐾', name: 'Huella', keywords: ['mascota', 'veterinaria', 'perro', 'gato'], group: 'salud' },
  { char: '🏋️', name: 'Pesas', keywords: ['gimnasio', 'gym', 'ejercicio'], group: 'salud' },
  { char: '🧘', name: 'Yoga', keywords: ['bienestar', 'salud', 'spa'], group: 'salud' },

  // Ocio / Tech
  { char: '🎬', name: 'Cine', keywords: ['cine', 'pelicula', 'entretenimiento'], group: 'ocio' },
  { char: '🎮', name: 'Videojuego', keywords: ['juego', 'gaming', 'entretenimiento'], group: 'ocio' },
  { char: '🎵', name: 'Música', keywords: ['musica', 'streaming', 'spotify'], group: 'ocio' },
  { char: '📺', name: 'TV', keywords: ['streaming', 'netflix', 'television'], group: 'ocio' },
  { char: '📱', name: 'Celular', keywords: ['telefono', 'movil', 'tech'], group: 'ocio' },
  { char: '💻', name: 'Laptop', keywords: ['computadora', 'tech', 'trabajo'], group: 'ocio' },
  { char: '🎧', name: 'Audífonos', keywords: ['musica', 'audio', 'tech'], group: 'ocio' },
  { char: '🎟️', name: 'Boleto', keywords: ['evento', 'entretenimiento', 'concierto'], group: 'ocio' },
  { char: '🎤', name: 'Micrófono', keywords: ['concierto', 'karaoke'], group: 'ocio' },
  { char: '📷', name: 'Cámara', keywords: ['foto', 'tech'], group: 'ocio' },
  { char: '🎸', name: 'Guitarra', keywords: ['musica', 'hobby'], group: 'ocio' },
  { char: '🕹️', name: 'Joystick', keywords: ['juego', 'gaming'], group: 'ocio' },
  { char: '🎨', name: 'Arte', keywords: ['hobby', 'arte'], group: 'ocio' },
  { char: '📚', name: 'Libros', keywords: ['educacion', 'estudio', 'libros'], group: 'ocio' },
  { char: '🎓', name: 'Graduación', keywords: ['educacion', 'universidad', 'estudio'], group: 'ocio' },

  // Otros
  { char: '🎯', name: 'Diana', keywords: ['meta', 'objetivo'], group: 'otros' },
  { char: '🏖️', name: 'Playa', keywords: ['vacaciones', 'viaje'], group: 'otros' },
  { char: '🐶', name: 'Perro', keywords: ['mascota', 'perro'], group: 'otros' },
  { char: '🐱', name: 'Gato', keywords: ['mascota', 'gato'], group: 'otros' },
  { char: '👶', name: 'Bebé', keywords: ['bebe', 'hijos', 'familia'], group: 'otros' },
  { char: '🎒', name: 'Mochila', keywords: ['escuela', 'estudio'], group: 'otros' },
  { char: '🌳', name: 'Árbol', keywords: ['naturaleza', 'jardin'], group: 'otros' },
  { char: '⛪', name: 'Iglesia', keywords: ['donacion', 'religion'], group: 'otros' },
  { char: '🎉', name: 'Fiesta', keywords: ['celebracion', 'evento'], group: 'otros' },
  { char: '📦', name: 'Paquete', keywords: ['envio', 'courier', 'amazon'], group: 'otros' },
  { char: '🌐', name: 'Globo', keywords: ['internet', 'online', 'web'], group: 'otros' },
  { char: '🧳', name: 'Maleta', keywords: ['viaje', 'vacaciones'], group: 'otros' },
];

// Normaliza para búsqueda: minúsculas sin acentos.
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Devuelve los emojis cuyo nombre o keywords contienen la consulta.
// Consulta vacía → catálogo completo.
export function searchEmojis(query) {
  const q = norm(query);
  if (!q) return EMOJI_CATALOG;
  return EMOJI_CATALOG.filter(
    (e) => norm(e.name).includes(q) || e.keywords.some((k) => norm(k).includes(q))
  );
}
