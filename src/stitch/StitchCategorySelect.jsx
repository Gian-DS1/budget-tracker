// Select de CATEGORÍA custom — reemplaza al <select> nativo para poder mostrar
// emojis JoyPixels (<img>) en cada opción, cosa que el <option> nativo no admite.
//
// Por qué existe: queríamos coherencia visual — los emojis JoyPixels en la tabla
// y en los desplegables. El <select> nativo solo renderiza texto en sus opciones,
// así que se construye un dropdown accesible a mano.
//
// Soporta: búsqueda (37 categorías), teclado (↑/↓ Enter Esc, type-ahead vía
// buscador), cierre al clic fuera / Escape, animación origin-aware (filosofía
// Emil: ease-out, <200ms, scale desde 0.96, respeta reduced-motion).
//
// API: <StitchCategorySelect
//         value={categoryId} onChange={(id)=>...} options={categories}
//         placeholder="Elige una categoría…" includeAllOption allLabel="Todas…"
//         className error id />
//   options: [{ id, name, icon, isActive }]. Se filtran las inactivas.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import MS from './MS';
import Emoji from './Emoji';
import { TRIGGER_BASE, TRIGGER_COMPACT } from './dropdownShared';
import DropdownPanel from './DropdownPanel';

export default function StitchCategorySelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Elige una categoría…',
  includeAllOption = false,
  allLabel = 'Todas las categorías',
  compact = false,
  className = '',
  id,
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1); // índice resaltado por teclado
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();

  const active_options = useMemo(() => options.filter((c) => c.isActive !== false), [options]);

  // Lista final (con opción "todas" opcional al inicio), filtrada por búsqueda.
  const items = useMemo(() => {
    const base = includeAllOption ? [{ id: '', name: allLabel, icon: null, _all: true }, ...active_options] : active_options;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    // La opción "todas" siempre visible; el resto filtra por nombre.
    return base.filter((c) => c._all || c.name.toLowerCase().includes(q));
  }, [active_options, includeAllOption, allLabel, query]);

  const selected = useMemo(() => active_options.find((c) => c.id === value) || null, [active_options, value]);

  // Abrir/cerrar/elegir. La inicialización de estado al abrir va en el handler
  // (no en un efecto) para no disparar renders en cascada. Al abrir, limpia la
  // búsqueda y resalta el valor actual (o el primero).
  const openMenu = () => {
    setQuery('');
    const idx = items.findIndex((c) => c.id === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const toggle = () => (open ? close() : openMenu());
  const choose = (item) => { onChange(item.id); close(); };

  // Cerrar al hacer clic fuera (considera el panel en portal además del trigger).
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

  // Al abrir: foco al buscador (side-effect del DOM, apropiado para un efecto).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  // Si el filtro deja el índice activo fuera de rango, lo recortamos al navegar
  // (en el propio handler de teclado más abajo), no en un efecto.

  // Mantener visible la opción activa al navegar con teclado.
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); openMenu(); return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active]); }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={toggle}
        className={compact ? TRIGGER_COMPACT : TRIGGER_BASE}
      >
        <span className="flex items-center gap-sm min-w-0">
          {selected ? (
            <>
              <Emoji e={selected.icon} size={compact ? 15 : 18} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-text-muted truncate">{includeAllOption ? allLabel : placeholder}</span>
          )}
        </span>
        <MS name="expand_more" className={`${compact ? 'text-[16px]' : 'text-[20px]'} text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <DropdownPanel triggerRef={triggerRef} panelRef={panelRef} open={open} reduce={reduce} scroll={false} role="listbox" id={listboxId}>
            {/* Buscador (fijo arriba) */}
            <div className="relative border-b border-border-subtle shrink-0">
              <MS name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted !text-[14px]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKeyDown}
                placeholder="Buscar…"
                className="w-full bg-transparent py-sm pl-[32px] pr-sm font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-text-muted"
              />
            </div>

            {/* Opciones (solo esta zona scrollea) */}
            <div ref={listRef} className="overflow-y-auto py-xs min-h-0">
              {items.length === 0 ? (
                <div className="px-md py-sm font-label-sm text-label-sm text-text-muted">Sin coincidencias</div>
              ) : (
                items.map((c, i) => {
                  const isSel = c.id === value;
                  const isActive = i === active;
                  return (
                    <button
                      type="button"
                      key={c.id || '__all'}
                      data-idx={i}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(c)}
                      className={`w-full flex items-center gap-sm px-md py-sm text-left font-body-md text-body-md transition-colors ${
                        isActive ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      {c._all ? <MS name="apps" className="text-[18px] text-text-muted" /> : <Emoji e={c.icon} size={18} />}
                      <span className="truncate flex-1">{c.name}</span>
                      {isSel && <MS name="check" className="text-[16px] text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </DropdownPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
