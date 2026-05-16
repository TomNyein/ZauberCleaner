import type { DiskInfo } from '../types';
import { formatBytes } from '../utils';

interface HeaderProps {
  diskInfo: DiskInfo;
  scanning: boolean;
  sessionReclaimed: number;
  onRescan: () => void;
  onAbout: () => void;
}

export default function Header({ diskInfo, scanning, sessionReclaimed, onRescan, onAbout }: HeaderProps) {
  const usedPct = diskInfo.total > 0 ? ((diskInfo.total - diskInfo.free) / diskInfo.total) * 100 : 0;

  return (
    <header className="header">
      <div className="header-content">
        <div>
          <h1>Zauber Cleaner</h1>
          <div className="header-meta">
            {diskInfo.total > 0
              ? `${formatBytes(diskInfo.free)} available of ${formatBytes(diskInfo.total)}`
              : 'Calculating…'}
          </div>
          {diskInfo.total > 0 && (
            <div className="disk-bar">
              <div
                className={`disk-bar-fill ${usedPct > 90 ? 'critical' : ''}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="header-actions">
          <div className="header-buttons">
            <button className="info-btn" onClick={onAbout} title="About Zauber Cleaner">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 11V7.5M8 5.5V5" />
              </svg>
            </button>
            <button className="rescan-btn" onClick={onRescan} disabled={scanning}>
              {scanning ? 'Scanning…' : 'Rescan'}
            </button>
          </div>
          {sessionReclaimed > 0 && (
            <div className="session-counter">Reclaimed: {formatBytes(sessionReclaimed)}</div>
          )}
        </div>
      </div>
    </header>
  );
}
