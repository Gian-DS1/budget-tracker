// FinTrack — ConfirmDialog Component

import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  danger = true,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>{message}</p>
      <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
