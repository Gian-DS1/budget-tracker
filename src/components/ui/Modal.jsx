// FinTrack — Modal Component

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'default' }) {
  const contentRef = useRef(null);
  const titleId = useId();
  // Guarda el elemento enfocado antes de abrir para restaurarlo al cerrar.
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Foco al abrir + restauración al cerrar.
  useEffect(() => {
    if (!isOpen) return undefined;
    lastFocusedRef.current = document.activeElement;
    const node = contentRef.current;
    if (node) {
      const focusable = node.querySelector(
        'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable || node).focus();
    }
    return () => {
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  // Atrapa el Tab dentro del modal mientras está abierto.
  const handleKeyDownTrap = (e) => {
    if (e.key !== 'Tab') return;
    const node = contentRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownTrap}
        style={size === 'large' ? { maxWidth: '720px' } : {}}
      >
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
