import type { CleanupItemState } from '../types';
import { formatBytes } from '../utils';

interface CleanupCardProps {
  item: CleanupItemState;
  onDelete: () => void;
  onReveal: () => void;
}

export default function CleanupCard({ item, onDelete, onReveal }: CleanupCardProps) {
  const isScanning = item.scanStatus === 'scanning';
  const isDone = item.scanStatus === 'done';
  const hasSize = isDone && item.size !== null && item.size > 0;
  const isZero = isDone && (item.size === null || item.size === 0);

  const safetyLabel =
    item.safetyLevel === 'destructive'
      ? 'Destructive'
      : item.safetyLevel === 'caution'
        ? 'Use caution'
        : 'Safe to delete';

  const safetyClass =
    item.safetyLevel === 'destructive'
      ? 'safety-destructive'
      : item.safetyLevel === 'caution'
        ? 'safety-caution'
        : 'safety-safe';

  return (
    <div className="cleanup-row" title={item.tooltip}>
      <div className="cleanup-info">
        <div className="cleanup-name">{item.name}</div>
        <div className="cleanup-meta">
          <span className="cleanup-description">{item.description}</span>
          <span className={`safety-badge ${safetyClass}`}>{safetyLabel}</span>
        </div>
      </div>

      <div className={`cleanup-size ${isScanning ? 'scanning' : ''} ${isZero ? 'zero' : ''}`}>
        {isScanning && 'Scanning…'}
        {isDone && item.size !== null && formatBytes(item.size)}
        {item.scanStatus === 'error' && <span className="size-unavailable">unavailable</span>}
      </div>

      <button className="reveal-btn" onClick={onReveal} title="Show in Finder">
        <svg width="15" height="13" viewBox="0 0 15 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 3.5V10.5C1.5 11.05 1.95 11.5 2.5 11.5H12.5C13.05 11.5 13.5 11.05 13.5 10.5V4.5C13.5 3.95 13.05 3.5 12.5 3.5H7L5.5 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V3.5Z" />
        </svg>
      </button>

      <button
        className={`delete-btn ${item.cleaning ? 'cleaning' : ''} ${item.safetyLevel !== 'safe' ? 'needs-review' : ''}`}
        onClick={onDelete}
        disabled={!hasSize || item.cleaning || !item.available}
        title={hasSize ? 'Click to review and delete' : ''}
      >
        {!item.cleaning && (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4h10M5.5 4V2.5h4V4M3.5 4l.5 8.5h7l.5-8.5M6 6.5v4M9 6.5v4" />
          </svg>
        )}
      </button>
    </div>
  );
}
