interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <span className="about-icon">Z</span>
          <div>
            <h2>Zauber Cleaner</h2>
            <span className="about-version">Version 1.0.0</span>
          </div>
        </div>

        <div className="about-warning">
          This tool deletes files from your system. Only use it if you understand what each
          category does. The author assumes no responsibility for data loss.
          Use at your own risk.
        </div>

        <p className="about-description">
          A developer-focused Mac storage cleaner. Scans for reclaimable disk space across
          build caches, package stores, and dev tools — and lets you review exactly what
          will be deleted before anything is removed.
        </p>

        <div className="about-section">
          <h3>How it works</h3>
          <ul>
            <li>Each category runs a specific shell command to measure size</li>
            <li>Click the trash icon to see individual folders before deleting</li>
            <li>Items marked <strong>Safe to delete</strong> regenerate on next build or install</li>
            <li>Items marked <strong>Destructive</strong> are permanent — review carefully</li>
          </ul>
        </div>

        <div className="about-section">
          <h3>What it never touches</h3>
          <ul>
            <li>Documents, Downloads, Desktop, or any user content</li>
            <li>Application data in ~/Library/Application Support</li>
            <li>System files or anything requiring sudo</li>
            <li>Source code or git repositories</li>
          </ul>
        </div>

        <div className="about-credit">
          Made by <a href="https://tomnyein.com" className="about-link" onClick={(e) => { e.preventDefault(); window.api.openExternal('https://tomnyein.com'); }}>Tom Nyein</a>
        </div>

        <div className="about-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
