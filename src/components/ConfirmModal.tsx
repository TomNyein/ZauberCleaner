import type { CleanupItemState } from '../types';
import { formatBytes } from '../utils';

interface ConfirmModalProps {
  item: CleanupItemState;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ item, onConfirm, onCancel }: ConfirmModalProps) {
  const isDestructive = item.safetyLevel === 'destructive';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isDestructive ? '⚠ ' : ''}Delete {item.name}?</h2>

        {isDestructive && (
          <div className="modal-warning">
            This action is destructive. Data may not be recoverable.
          </div>
        )}

        <div className="modal-command">{item.deleteCommandDisplay}</div>

        <div className="modal-note">
          {item.regenerateNote}
          {item.size !== null && item.size > 0 && (
            <> This will free approximately {formatBytes(item.size)}.</>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-delete" onClick={onConfirm}>
            {isDestructive ? 'Delete permanently' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
