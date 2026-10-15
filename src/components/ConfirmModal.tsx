import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  isDanger = true,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const titleId = 'confirm-modal-title';
  const descriptionId = 'confirm-modal-description';

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      overlayClassName="modal-overlay-top"
      panelClassName="card animate-in modal-panel modal-panel-sm modal-text-center"
    >
        <div style={{
          padding: 16,
          background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          borderRadius: '50%',
          color: isDanger ? 'var(--accent-red)' : 'var(--accent)',
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={32} />
        </div>

        <h2 id={titleId} style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>{title}</h2>
        <p id={descriptionId} style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem', lineHeight: 1.5 }}>{description}</p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button data-modal-initial-focus className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      <style>{`
        .btn-danger {
          background: #ef4444;
          color: white;
          border: 1px solid #ef4444;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
      `}</style>
    </Modal>
  );
}
