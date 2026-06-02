// Select genérico custom — mismo panel y animación que StitchCategorySelect,
// pero para opciones simples (tipo, moneda, etc.) sin emojis ni buscador.
// Reemplaza al <select> nativo para tener animación y diseño consistentes en
// toda la página.
//
// API: <StitchSelect
//         value onChange options={[{ value, label, icon? }]}
//         placeholder compact className id />
//   - icon (opcional): nombre de Material Symbol mostrado a la izquierda.

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import MS from './MS';
import { TRIGGER_BASE, TRIGGER_COMPACT } from './dropdownShared';
import DropdownPanel from './DropdownPanel';

export default function StitchSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Selecciona…',
  compact = false,
  className = '',
  id,
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value) || null;

  const openMenu = () => {
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const toggle = () => (open ? close() : openMenu());
  const choose = (opt) => { onChange(opt.value); close(); };

  // Cerrar al clic fuera (considera el panel en portal además del trigger).
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

  // Mantener visible la opción activa al navegar.
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
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[active]) choose(options[active]); }
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
          {selected?.icon && <MS name={selected.icon} className={`${compact ? '!text-[14px]' : '!text-[18px]'} text-text-muted`} />}
          {/* Un value vacío (ej. "Todos los tipos") se muestra atenuado, igual que
              el placeholder de los otros campos, para que toda la fila combine. */}
          <span className={`truncate ${selected && selected.value !== '' ? '' : 'text-text-muted'}`}>{selected ? selected.label : placeholder}</span>
        </span>
        <MS name="expand_more" className={`${compact ? '!text-[16px]' : '!text-[20px]'} text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <DropdownPanel triggerRef={triggerRef} panelRef={panelRef} open={open} reduce={reduce} role="listbox" id={listboxId}>
            <div ref={listRef} className="py-xs">
              {options.map((o, i) => {
                const isSel = o.value === value;
                const isActive = i === active;
                return (
                  <button
                    type="button"
                    key={o.value || '__empty'}
                    data-idx={i}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`w-full flex items-center gap-sm px-md py-sm text-left font-body-md text-body-md transition-colors whitespace-nowrap ${
                      isActive ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
                    }`}
                  >
                    {o.icon && <MS name={o.icon} className="text-[18px] text-text-muted" />}
                    <span className="flex-1">{o.label}</span>
                    {isSel && <MS name="check" className="text-[16px] text-primary" />}
                  </button>
                );
              })}
            </div>
          </DropdownPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
