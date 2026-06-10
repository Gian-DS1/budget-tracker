// src/stitch/EmojiPicker.jsx
// Selector de emoji: trigger que muestra el emoji actual + panel con buscador y
// grid agrupado por sección. Reutiliza DropdownPanel (animación origin-aware) y
// el patrón de buscador de StitchCategorySelect. Devuelve el carácter unicode.
import { useId, useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import MS from './MS';
import Emoji from './Emoji';
import DropdownPanel from './DropdownPanel';
import { tr } from '../i18n/runtime';
import { EMOJI_GROUPS, searchEmojis } from '../data/emojiCatalog';

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

  const grouped = useMemo(() => {
    return EMOJI_GROUPS
      .map((g) => ({ ...g, items: results.filter((e) => e.group === g.id) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  const close = () => setOpen(false);
  const openMenu = () => { setQuery(''); setOpen(true); };
  const toggle = () => (open ? close() : openMenu());
  const choose = (char) => { onChange(char); close(); };

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
        aria-controls={listboxId}
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
                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}
                placeholder={tr('common.searchEmoji')}
                className="w-full bg-transparent py-sm pl-[32px] pr-sm font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-text-muted"
              />
            </div>
            <div className="stitch-scroll overflow-y-auto overflow-x-hidden py-xs min-h-0 max-h-[280px] w-[280px]">
              {grouped.length === 0 ? (
                <div className="px-md py-sm font-label-sm text-label-sm text-text-muted">{tr('common.noMatches')}</div>
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
