import { useId } from 'react';
import MS from './MS';
import ModalShell from './ModalShell';
import { tr } from '../i18n/runtime';

export const inputCls =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface transition-colors focus:outline-none focus:border-primary inner-glow';

// El <label> ENVUELVE al control (asociación implícita): los lectores de
// pantalla anuncian el nombre del campo y hacer click en el texto enfoca el
// input. Los elementos interactivos de `extra` (ej. InfoTip) no disparan la
// activación del label porque son interactive content por sí mismos.
export function Field({ label, children, hint, error, extra }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="flex flex-col gap-xs">
        <span className="font-mono-data text-mono-data text-text-muted uppercase flex items-center gap-sm">
          {label}{extra}
        </span>
        {children}
      </label>
      {hint && <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{hint}</span>}
      {error && <span className="font-label-sm text-label-sm text-accent-error">{tr('common.required')}</span>}
    </div>
  );
}

export function FormActions({ onCancel, label, disabled }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">{tr('common.cancel')}</button>
      <button type="submit" disabled={disabled} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow disabled:opacity-40">{label}</button>
    </div>
  );
}

export function Modal({ title, onClose, children, width = '480px' }) {
  const titleId = useId();
  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      className="stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-h-[85vh] overflow-y-auto p-lg"
      style={{ maxWidth: width }}
    >
      {(requestClose) => (
        <>
          <div className="flex justify-between items-center mb-lg">
            <h3 id={titleId} className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
            <button onClick={requestClose} aria-label={tr('common.close')} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
          </div>
          {typeof children === 'function' ? children(requestClose) : children}
        </>
      )}
    </ModalShell>
  );
}
