import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Custom hook to handle global keyboard shortcuts
// Pages can pass a callbacks object to override default behavior
export function useKeyboardShortcuts(callbacks = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Esc: Close any open modal
      if (e.key === 'Escape') {
        // Find any open modal and trigger its close button or callback
        const modal = document.querySelector('[role="dialog"]');
        if (modal) {
          e.preventDefault();
          const closeBtn = modal.querySelector('[aria-label="Close"]') || modal.querySelector('.modal-close');
          if (closeBtn) {
            closeBtn.click();
          }
          // Fallback: look for a cancel/close button
          const cancelBtn = modal.querySelector('.btn-secondary, [type="button"]:last-of-type');
          if (cancelBtn) {
            cancelBtn.click();
          }
        }
        // Allow normal Esc behavior if no modal
        return;
      }

      // Cmd/Ctrl + T: New transaction (page-specific or navigate to transactions)
      if (isCtrlOrCmd && e.key === 't') {
        e.preventDefault();
        if (callbacks.newTransaction) {
          callbacks.newTransaction();
        } else {
          navigate('/transacciones');
        }
        return;
      }

      // Cmd/Ctrl + E: Export / Settings
      if (isCtrlOrCmd && e.key === 'e') {
        e.preventDefault();
        navigate('/ajustes');
        return;
      }

      // Cmd/Ctrl + B: Toggle budget view (page-specific)
      if (isCtrlOrCmd && e.key === 'b') {
        e.preventDefault();
        if (callbacks.toggleBudgetView) {
          callbacks.toggleBudgetView();
        }
        return;
      }

      // Arrow keys: Navigate months (page-specific)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.ctrlKey) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' && callbacks.previousMonth) {
          callbacks.previousMonth();
        } else if (e.key === 'ArrowRight' && callbacks.nextMonth) {
          callbacks.nextMonth();
        }
        return;
      }

      // Cmd/Ctrl + /: Open help (future enhancement)
      if (isCtrlOrCmd && e.key === '/') {
        e.preventDefault();
        // TODO: Open help dialog
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, callbacks, location]);
}
