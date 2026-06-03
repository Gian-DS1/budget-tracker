// Primitivas de UI compartidas por los modales de Ahorros (patrón local, sin
// acoplar a otras carpetas de screens).
import MS from '../../MS';

export const inputCls =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow';

export function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-mono-data text-mono-data text-text-muted uppercase">{label}</label>
      {children}
      {hint && <span className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">{hint}</span>}
    </div>
  );
}

export function FormActions({ onCancel, label, disabled }) {
  return (
    <div className="flex gap-sm justify-end mt-sm">
      <button type="button" onClick={onCancel} className="px-md py-sm border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high">Cancelar</button>
      <button type="submit" disabled={disabled} className="px-md py-sm bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold rounded hover:bg-primary-container inner-glow disabled:opacity-40">{label}</button>
    </div>
  );
}

export function Modal({ title, onClose, children, width = '480px' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md" style={{ background: 'rgba(0,0,0,0.66)' }} onClick={onClose}>
      <div className="stitch-scroll bg-surface-card border border-border-subtle rounded-lg inner-glow w-full max-h-[85vh] overflow-y-auto p-lg" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="font-headline-md text-[20px] font-bold text-on-surface tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-on-surface p-xs"><MS name="close" className="text-[20px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
