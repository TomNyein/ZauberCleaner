import { useState, useMemo, useEffect } from 'react';
import type { CleanupItemState, CleanupDetail } from '../types';
import { formatBytes } from '../utils';

type SortKey = 'size' | 'date' | 'name';

interface DetailModalProps {
  item: CleanupItemState;
  details: CleanupDetail[] | null;
  onConfirm: (paths: string[]) => void;
  onCancel: () => void;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const d = new Date(ts);
  if (days < 365) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function DetailModal({ item, details, onConfirm, onCancel }: DetailModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('size');

  useEffect(() => {
    if (details) {
      setSelected(new Set(details.map((d) => d.path)));
    }
  }, [details]);

  const sorted = useMemo(() => {
    if (!details) return [];
    const copy = [...details];
    switch (sortKey) {
      case 'size':
        copy.sort((a, b) => b.size - a.size);
        break;
      case 'date':
        copy.sort((a, b) => a.lastModified - b.lastModified);
        break;
      case 'name':
        copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
    }
    return copy;
  }, [details, sortKey]);

  const loading = details === null;
  const selectedSize = (details ?? [])
    .filter((d) => selected.has(d.path))
    .reduce((sum, d) => sum + d.size, 0);
  const allSelected = details !== null && selected.size === details.length;

  const toggleItem = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    if (!details) return;
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(details.map((d) => d.path)));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{item.name}</h2>
            <span className="detail-subtitle">
              {loading ? 'Loading folders…' : 'Select items to delete'}
            </span>
          </div>
          <div className="detail-total">{formatBytes(item.size ?? 0)}</div>
        </div>

        {!loading && (
          <div className="detail-toolbar">
            <div className="detail-sort">
              {(['size', 'date', 'name'] as SortKey[]).map((key) => (
                <button
                  key={key}
                  className={`sort-btn ${sortKey === key ? 'active' : ''}`}
                  onClick={() => setSortKey(key)}
                >
                  {key === 'size' ? 'Biggest' : key === 'date' ? 'Oldest' : 'Name'}
                </button>
              ))}
            </div>
            <button className="sort-btn" onClick={toggleAll}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        )}

        <div className="detail-list">
          {loading && (
            <div className="detail-loading">
              <div className="detail-loading-spinner" />
              <span>Scanning individual folders…</span>
            </div>
          )}
          {sorted.map((d) => (
            <label key={d.path} className="detail-item" title={d.path}>
              <input
                type="checkbox"
                checked={selected.has(d.path)}
                onChange={() => toggleItem(d.path)}
              />
              <span className="detail-name">{d.displayName}</span>
              <span className="detail-date">{formatDate(d.lastModified)}</span>
              <span className="detail-item-size">{formatBytes(d.size)}</span>
            </label>
          ))}
        </div>

        <div className="detail-footer">
          <span className="detail-selected-info">
            {loading
              ? ''
              : `${selected.size} of ${details.length} selected (${formatBytes(selectedSize)})`}
          </span>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn-delete"
              disabled={loading || selected.size === 0}
              onClick={() => onConfirm(Array.from(selected))}
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
