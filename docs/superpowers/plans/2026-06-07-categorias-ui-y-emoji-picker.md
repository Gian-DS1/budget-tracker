# Categorías UI + Emoji Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al usuario una pantalla para crear, editar y eliminar sus propias categorías, con un selector de emojis curado reutilizable.

**Architecture:** El CRUD de categorías ya existe en `useCategoryStore` (`addCategory`, `updateCategory`, `deleteCategory`). Este plan construye la capa de UI que falta: una pantalla `StitchCategories` enlazada al menú, un modal `CategoryForm`, un `EmojiPicker` reutilizable alimentado por un catálogo curado (`emojiCatalog.js`), y la migración de `VaultForm` al nuevo picker.

**Tech Stack:** React 19, Zustand, Vite, Vitest, framer-motion, Tailwind v4, react-router-dom v7, react-hot-toast. Emojis renderizados con `<Emoji>` (JoyPixels).

---

## File Structure

- Create: `src/data/emojiCatalog.js` — lista curada `{ char, name, keywords, group }` + helpers.
- Create: `src/data/emojiCatalog.test.js` — tests de integridad del catálogo.
- Create: `src/stitch/EmojiPicker.jsx` — componente selector de emoji (grid agrupado + búsqueda).
- Create: `src/stitch/screens/StitchCategories.jsx` — pantalla de gestión.
- Create: `src/stitch/screens/categories/categoriesUi.jsx` — barril de `formUi`.
- Create: `src/stitch/screens/categories/CategoryForm.jsx` — modal crear/editar.
- Modify: `src/stitch/StitchApp.jsx` — añadir la ruta `categorias`.
- Modify: `src/stitch/StitchShell.jsx:17-29` — añadir entrada al `NAV`.
- Modify: `src/stitch/screens/vaults/VaultForm.jsx:14,81-83` — migrar al EmojiPicker.
- Modify: `src/stitch/demoMode.js` — añadir `demoAddCategory`/`demoUpdateCategory`/`demoDeleteCategory`.

---

## Task 1: Catálogo de emojis curado

**Files:**
- Create: `src/data/emojiCatalog.js`
- Test: `src/data/emojiCatalog.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/data/emojiCatalog.test.js
import { describe, it, expect } from 'vitest';
import { EMOJI_CATALOG, EMOJI_GROUPS, searchEmojis } from './emojiCatalog';

describe('emojiCatalog', () => {
  it('tiene al menos 100 emojis', () => {
    expect(EMOJI_CATALOG.length).toBeGreaterThanOrEqual(100);
  });

  it('cada entry tiene char, name, group y keywords array', () => {
    for (const e of EMOJI_CATALOG) {
      expect(typeof e.char, e.name).toBe('string');
      expect(e.char.length, e.name).toBeGreaterThan(0);
      expect(typeof e.name, e.char).toBe('string');
      expect(typeof e.group, e.char).toBe('string');
      expect(Array.isArray(e.keywords), e.char).toBe(true);
    }
  });

  it('no hay chars duplicados', () => {
    const chars = EMOJI_CATALOG.map((e) => e.char);
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('cada group declarado en EMOJI_GROUPS tiene al menos un emoji', () => {
    for (const g of EMOJI_GROUPS) {
      expect(EMOJI_CATALOG.some((e) => e.group === g.id), g.id).toBe(true);
    }
  });

  it('searchEmojis filtra por nombre y keyword (case/acentos-insensible)', () => {
    const byName = searchEmojis('dinero');
    expect(byName.some((e) => e.char === '💰')).toBe(true);
    const byKeyword = searchEmojis('comida');
    expect(byKeyword.length).toBeGreaterThan(0);
    expect(searchEmojis('')).toEqual(EMOJI_CATALOG);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/emojiCatalog.test.js`
Expected: FAIL ("Failed to resolve import './emojiCatalog'").

- [ ] **Step 3: Write the catalog**

```js
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
  { char: '🪙', name: 'Otra moneda', keywords: ['varios'], group: 'otros' },
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
```

NOTA al implementar: revisar que no haya `char` duplicados (el test lo valida).
Si `🪙` aparece dos veces (finanzas y otros), eliminar la entrada de 'otros'.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/data/emojiCatalog.test.js`
Expected: PASS (5 tests). Si falla "no hay chars duplicados", quitar el duplicado.

- [ ] **Step 5: Commit**

```bash
git add src/data/emojiCatalog.js src/data/emojiCatalog.test.js
git commit -m "feat(emoji): catálogo curado de emojis para categorías"
```

---

## Task 2: Componente EmojiPicker

**Files:**
- Create: `src/stitch/EmojiPicker.jsx`

Este componente no tiene test unitario (es UI con portal/animación; se valida en
el E2E del flujo de categorías más adelante). Sigue el patrón de
`StitchCategorySelect` (trigger + DropdownPanel + buscador).

- [ ] **Step 1: Write the component**

```jsx
// src/stitch/EmojiPicker.jsx
// Selector de emoji: trigger que muestra el emoji actual + panel con buscador y
// grid agrupado por sección. Reutiliza DropdownPanel (animación origin-aware) y
// el patrón de buscador de StitchCategorySelect. Devuelve el carácter unicode.
import { useId, useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import MS from './MS';
import Emoji from './Emoji';
import DropdownPanel from './DropdownPanel';
import { EMOJI_GROUPS, searchEmojis, EMOJI_CATALOG } from '../data/emojiCatalog';

export default function EmojiPicker({ value = '', onChange, id, className = '' }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listboxId = useId();

  const results = useMemo(() => searchEmojis(query), [query]);

  // Agrupa los resultados por sección, preservando el orden de EMOJI_GROUPS.
  const grouped = useMemo(() => {
    return EMOJI_GROUPS
      .map((g) => ({ ...g, items: results.filter((e) => e.group === g.id) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  const close = () => setOpen(false);
  const openMenu = () => { setQuery(''); setOpen(true); };
  const toggle = () => (open ? close() : openMenu());
  const choose = (char) => { onChange(char); close(); };

  // Cerrar al clic fuera (trigger + panel en portal).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Foco al buscador al abrir.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="w-12 h-12 rounded border border-border-subtle bg-surface-container-lowest flex items-center justify-center inner-glow hover:border-primary transition-colors"
      >
        {value ? <Emoji e={value} size={24} /> : <MS name="add_reaction" className="text-[22px] text-text-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <DropdownPanel triggerRef={triggerRef} panelRef={panelRef} open={open} reduce={reduce} scroll={false} role="listbox" id={listboxId}>
            <div className="relative border-b border-border-subtle shrink-0">
              <MS name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted !text-[14px]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar emoji…"
                className="w-full bg-transparent py-sm pl-[32px] pr-sm font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-text-muted"
              />
            </div>
            <div className="stitch-scroll overflow-y-auto overflow-x-hidden py-xs min-h-0 max-h-[280px] w-[280px]">
              {grouped.length === 0 ? (
                <div className="px-md py-sm font-label-sm text-label-sm text-text-muted">Sin coincidencias</div>
              ) : (
                grouped.map((g) => (
                  <div key={g.id} className="px-xs pb-xs">
                    <div className="px-sm py-xs font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{g.label}</div>
                    <div className="grid grid-cols-6 gap-xs">
                      {g.items.map((e) => (
                        <button
                          type="button"
                          key={e.char}
                          role="option"
                          aria-selected={e.char === value}
                          aria-label={e.name}
                          onClick={() => choose(e.char)}
                          className={`w-9 h-9 rounded flex items-center justify-center transition-colors ${e.char === value ? 'bg-primary/15 border border-primary' : 'hover:bg-surface-container-high border border-transparent'}`}
                        >
                          <Emoji e={e.char} size={20} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds (no dedicated test)**

Run: `npx eslint src/stitch/EmojiPicker.jsx`
Expected: exit 0. (Si marca `EMOJI_CATALOG` sin usar, quitarlo del import — solo se
usan `EMOJI_GROUPS` y `searchEmojis`.)

- [ ] **Step 3: Commit**

```bash
git add src/stitch/EmojiPicker.jsx
git commit -m "feat(emoji): componente EmojiPicker con grid agrupado y búsqueda"
```

---

## Task 3: Migrar VaultForm al EmojiPicker

**Files:**
- Modify: `src/stitch/screens/vaults/VaultForm.jsx:14,81-83`

- [ ] **Step 1: Replace the inline emoji list with EmojiPicker**

En `src/stitch/screens/vaults/VaultForm.jsx`:

Eliminar la línea 14:
```js
const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💻', '📱', '👶', '🎓', '💍', '🆘', '🏖️', '🏦'];
```

Cambiar el import de `Emoji` (línea 5) por `EmojiPicker`:
```js
import EmojiPicker from '../../EmojiPicker';
```
(Si `Emoji` no se usa en otro punto del archivo, eliminarlo del import. Verificar
con `grep "Emoji" src/stitch/screens/vaults/VaultForm.jsx` tras el cambio.)

Reemplazar el bloque del campo Ícono (líneas 81-83):
```jsx
        <Field label="Ícono">
          <EmojiPicker value={form.icon} onChange={(char) => set({ icon: char })} />
        </Field>
```

- [ ] **Step 2: Verify lint and tests**

Run: `npx eslint src/stitch/screens/vaults/VaultForm.jsx && npm test`
Expected: lint exit 0; 135 tests siguen pasando (VaultForm no tiene test unitario,
pero nada debe romperse).

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/vaults/VaultForm.jsx
git commit -m "refactor(ahorros): VaultForm usa EmojiPicker compartido"
```

---

## Task 4: Mutadores de categoría en modo demo

**Files:**
- Modify: `src/stitch/demoMode.js`

El store ya tiene `addCategory`/`updateCategory`/`deleteCategory`, pero en demo no
hay sesión: necesitamos mutadores en memoria, como los de otras entidades.

- [ ] **Step 1: Add demo category mutators**

Añadir al final de `src/stitch/demoMode.js` (antes no existían):

```js
// ── Categorías (en demo no hay sesión: el store sale sin efecto) ──────────────
export function demoAddCategory(category) {
  const row = {
    id: demoId(), name: category.name, type: category.type,
    icon: category.icon, color: category.color, slug: category.slug || null,
    keywords: category.keywords || [], isActive: true,
    sortOrder: useCategoryStore.getState().categories.length,
    createdAt: new Date().toISOString(),
  };
  useCategoryStore.setState((s) => ({
    categories: [...s.categories, row].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })),
  }));
  return row;
}
export function demoUpdateCategory(id, updates) {
  useCategoryStore.setState((s) => ({
    categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  }));
}
export function demoDeleteCategory(id) {
  useCategoryStore.setState((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
}
```

`useCategoryStore` y `demoId` ya están importados/definidos en el archivo (se usan
en `seedDemoStores` y otros mutadores).

- [ ] **Step 2: Verify lint**

Run: `npx eslint src/stitch/demoMode.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/demoMode.js
git commit -m "feat(demo): mutadores de categoría en memoria para QA"
```

---

## Task 5: Barril categoriesUi

**Files:**
- Create: `src/stitch/screens/categories/categoriesUi.jsx`

- [ ] **Step 1: Create the barrel (mismo patrón que cardsUi/vaultsUi)**

```jsx
// src/stitch/screens/categories/categoriesUi.jsx
export { inputCls, Field, FormActions, Modal } from '../../formUi';
```

- [ ] **Step 2: Commit**

```bash
git add src/stitch/screens/categories/categoriesUi.jsx
git commit -m "feat(categorias): barril categoriesUi"
```

---

## Task 6: CategoryForm (modal crear/editar)

**Files:**
- Create: `src/stitch/screens/categories/CategoryForm.jsx`

- [ ] **Step 1: Write the form**

```jsx
// src/stitch/screens/categories/CategoryForm.jsx
// Modal crear/editar categoría. Campos: nombre, tipo, emoji, color, keywords.
// Branching demo/real como el resto de forms.
import { useState } from 'react';
import toast from 'react-hot-toast';
import StitchSelect from '../../StitchSelect';
import EmojiPicker from '../../EmojiPicker';
import useCategoryStore from '../../../stores/useCategoryStore';
import { isDemoActive, demoAddCategory, demoUpdateCategory } from '../../demoMode';
import { Modal, Field, FormActions, inputCls } from './categoriesUi';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Ingreso' },
  { value: 'fixed_expense', label: 'Gasto fijo' },
  { value: 'variable_expense', label: 'Gasto variable' },
  { value: 'savings', label: 'Ahorro' },
];
const COLORS = ['#bec2ff', '#50d8e9', '#bdd200', '#ffb689', '#ffb4ab', '#9aa0ff', '#e9a0d8'];
const blank = { name: '', type: 'variable_expense', icon: '🏷️', color: '#bec2ff', keywords: '' };

export default function CategoryForm({ editing, onClose }) {
  const { addCategory, updateCategory } = useCategoryStore();
  const demo = isDemoActive();

  const [form, setForm] = useState(editing
    ? {
        name: editing.name, type: editing.type, icon: editing.icon || '🏷️',
        color: editing.color || '#bec2ff',
        keywords: (editing.keywords || []).join(', '),
      }
    : blank);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Escribe un nombre para la categoría'); return; }
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(), type: form.type, icon: form.icon, color: form.color, keywords,
    };
    if (editing) {
      if (demo) { demoUpdateCategory(editing.id, payload); toast.success('Categoría actualizada'); }
      else { await updateCategory(editing.id, payload); toast.success('Categoría actualizada'); }
    } else {
      if (demo) { demoAddCategory(payload); toast.success('Categoría creada'); }
      else { await addCategory(payload); toast.success('Categoría creada'); }
    }
    onClose();
  };

  return (
    <Modal title={editing ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-md">
        <div className="flex gap-md items-end">
          <Field label="Ícono"><EmojiPicker value={form.icon} onChange={(char) => set({ icon: char })} /></Field>
          <div className="flex-1">
            <Field label="Nombre"><input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder="Ej. Gimnasio" autoFocus /></Field>
          </div>
        </div>
        <Field label="Tipo">
          <StitchSelect value={form.type} onChange={(v) => set({ type: v })} options={TYPE_OPTIONS} />
        </Field>
        <Field label="Color">
          <div className="flex gap-sm">{COLORS.map((c) => <button type="button" key={c} onClick={() => set({ color: c })} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-on-surface' : 'border-transparent'}`} style={{ background: c }} />)}</div>
        </Field>
        <Field label="Palabras clave" hint="Separadas por coma. Auto-clasifican transacciones por su descripción.">
          <input value={form.keywords} onChange={(e) => set({ keywords: e.target.value })} className={inputCls} placeholder="Ej. gym, fitness, gimnasio" />
        </Field>
        <FormActions onCancel={onClose} label={editing ? 'Guardar' : 'Crear'} />
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npx eslint src/stitch/screens/categories/CategoryForm.jsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/categories/CategoryForm.jsx
git commit -m "feat(categorias): modal CategoryForm crear/editar"
```

---

## Task 7: Pantalla StitchCategories

**Files:**
- Create: `src/stitch/screens/StitchCategories.jsx`

- [ ] **Step 1: Write the screen**

```jsx
// src/stitch/screens/StitchCategories.jsx
// Gestión de categorías: lista agrupada por tipo + crear/editar/eliminar.
// El CRUD vive en useCategoryStore; eliminar deja las transacciones sin categoría
// (la BD hace ON DELETE SET NULL).
import { useState } from 'react';
import toast from 'react-hot-toast';
import MS from '../MS';
import Emoji from '../Emoji';
import { Stagger } from '../StitchMotion';
import useCategoryStore from '../../stores/useCategoryStore';
import useTransactionStore from '../../stores/useTransactionStore';
import { isDemoActive, demoDeleteCategory } from '../demoMode';
import CategoryForm from './categories/CategoryForm';

const TYPE_SECTIONS = [
  { type: 'income', label: 'Ingresos' },
  { type: 'fixed_expense', label: 'Gastos fijos' },
  { type: 'variable_expense', label: 'Gastos variables' },
  { type: 'savings', label: 'Ahorro' },
];

export default function StitchCategories() {
  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const transactions = useTransactionStore((s) => s.transactions);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setShowForm(true); };

  const onDelete = async (cat) => {
    const used = transactions.filter((t) => t.categoryId === cat.id).length;
    if (isDemoActive()) demoDeleteCategory(cat.id);
    else await deleteCategory(cat.id);
    toast.success(used > 0
      ? `Categoría eliminada · ${used} transacción${used === 1 ? '' : 'es'} quedaron sin categoría`
      : 'Categoría eliminada');
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-md text-on-surface">Categorías</h1>
          <p className="font-body-md text-on-surface-variant">Crea, edita o elimina las categorías de tus transacciones.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-xs bg-primary text-on-primary px-md py-sm rounded font-label-sm uppercase tracking-widest hover:bg-primary-container transition-colors">
          <MS name="add" className="!text-[18px]" /> Nueva
        </button>
      </div>

      <Stagger className="flex flex-col gap-lg">
        {TYPE_SECTIONS.map((section) => {
          const items = categories.filter((c) => c.type === section.type);
          if (items.length === 0) return null;
          return (
            <div key={section.type} className="flex flex-col gap-sm">
              <h2 className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest">{section.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center gap-sm bg-surface-panel border border-border-subtle rounded p-md inner-glow">
                    <span className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: `${c.color}22` }}>
                      <Emoji e={c.icon} size={18} />
                    </span>
                    <span className="font-body-md text-on-surface truncate flex-1">{c.name}</span>
                    <button onClick={() => openEdit(c)} className="text-text-muted hover:text-on-surface p-xs" aria-label="Editar"><MS name="edit" className="!text-[16px]" /></button>
                    <button onClick={() => onDelete(c)} className="text-text-muted hover:text-accent-error p-xs" aria-label="Eliminar"><MS name="delete" className="!text-[16px]" /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Stagger>

      {showForm && <CategoryForm editing={editing} onClose={() => setShowForm(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npx eslint src/stitch/screens/StitchCategories.jsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/stitch/screens/StitchCategories.jsx
git commit -m "feat(categorias): pantalla de gestión StitchCategories"
```

---

## Task 8: Ruta + entrada de menú

**Files:**
- Modify: `src/stitch/StitchApp.jsx`
- Modify: `src/stitch/StitchShell.jsx:17-29`

- [ ] **Step 1: Add the route in StitchApp.jsx**

Añadir el import junto a las otras pantallas (tras la línea de `StitchSettings`):
```jsx
import StitchCategories from './screens/StitchCategories';
```

Añadir la ruta dentro de `<Routes>` (después de `ajustes`):
```jsx
            <Route path="categorias" element={<StitchCategories />} />
```

- [ ] **Step 2: Add the NAV entry in StitchShell.jsx**

En el array `NAV` (líneas 17-29), añadir bajo la sección 'Herramientas',
después de la entrada de Reportes:
```js
  { to: '/categorias', icon: 'sell', label: 'Categorías' },
```

- [ ] **Step 3: Verify lint, tests, build**

Run: `npx eslint src/stitch/StitchApp.jsx src/stitch/StitchShell.jsx && npm test && npm run build`
Expected: lint exit 0; 135 tests pasan; build ✓.

- [ ] **Step 4: Commit**

```bash
git add src/stitch/StitchApp.jsx src/stitch/StitchShell.jsx
git commit -m "feat(categorias): ruta /categorias y entrada en el menú"
```

---

## Task 9: E2E del flujo de categorías

**Files:**
- Create: `tests/categories.e2e.spec.js`

- [ ] **Step 1: Write the E2E test**

```js
// tests/categories.e2e.spec.js
import { test, expect } from '@playwright/test';

// Flujo de gestión de categorías en modo demo (localhost). Crea una categoría y
// confirma que aparece; la elimina y confirma que desaparece.
test('crear y eliminar una categoría personalizada', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Ver demo/i }).click();
  await expect(page.locator('[data-tour="dashboard-grid"]')).toBeVisible({ timeout: 15_000 });

  // Ir a Categorías desde el menú.
  await page.getByRole('link', { name: /Categorías/i }).click();
  await expect(page).toHaveURL(/\/categorias$/);

  // Crear una categoría nueva.
  await page.getByRole('button', { name: /Nueva/i }).click();
  await page.getByPlaceholder('Ej. Gimnasio').fill('Café de prueba E2E');
  await page.getByRole('button', { name: /^Crear$/i }).click();

  // Aparece en la lista.
  await expect(page.getByText('Café de prueba E2E')).toBeVisible();

  // Eliminarla: el botón "Eliminar" de su fila.
  const row = page.locator('div', { hasText: 'Café de prueba E2E' }).last();
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Café de prueba E2E')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the E2E test**

Run: `npx playwright test tests/categories.e2e.spec.js`
Expected: PASS (1 test). Si el selector de fila es frágil, ajustar usando un
`data-testid` en la fila de StitchCategories.

- [ ] **Step 3: Commit**

```bash
git add tests/categories.e2e.spec.js
git commit -m "test(e2e): flujo crear/eliminar categoría"
```

---

## Self-Review

- **Spec coverage (Sección A):** pantalla de gestión (Task 7), modal crear/editar
  (Task 6), eliminar con aviso de transacciones sin categoría (Task 7), ruta+menú
  (Task 8), demo (Task 4). ✓
- **Spec coverage (Sección B):** emoji catalog curado (Task 1), EmojiPicker (Task 2),
  uso en CategoryForm (Task 6) y migración de VaultForm (Task 3). ✓
- **Placeholders:** ninguno; todo el código está completo.
- **Type consistency:** `demoAddCategory/demoUpdateCategory/demoDeleteCategory`
  (Task 4) coinciden con sus usos en CategoryForm (Task 6) y StitchCategories
  (Task 7). `searchEmojis`/`EMOJI_GROUPS` (Task 1) coinciden con EmojiPicker (Task 2).
  `EmojiPicker` props `{ value, onChange }` consistentes en Tasks 2/3/6.
- **Fuera de alcance:** el motor de cashback CCN (Sección C) tiene su propio plan.
