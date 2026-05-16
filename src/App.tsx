import { useState, useEffect, useCallback } from 'react';
import type { CleanupItemState, DiskInfo, ScanResult, CleanResult, CleanupItemDef, CleanupDetail } from './types';
import { formatBytes } from './utils';
import Header from './components/Header';
import CategoryGroup from './components/CategoryGroup';
import CleanupCard from './components/CleanupCard';
import ConfirmModal from './components/ConfirmModal';
import DetailModal from './components/DetailModal';
import AboutModal from './components/AboutModal';

export default function App() {
  const [diskInfo, setDiskInfo] = useState<DiskInfo>({ total: 0, free: 0 });
  const [items, setItems] = useState<CleanupItemState[]>([]);
  const [scanning, setScanning] = useState(false);
  const [confirmItem, setConfirmItem] = useState<CleanupItemState | null>(null);
  const [detailView, setDetailView] = useState<{ item: CleanupItemState; details: CleanupDetail[] | null } | null>(null);
  const [sessionReclaimed, setSessionReclaimed] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  }, []);

  const loadDiskInfo = useCallback(async () => {
    const info = await window.api.getDiskInfo();
    setDiskInfo(info);
  }, []);

  const startScan = useCallback(async () => {
    setScanning(true);
    const defs: CleanupItemDef[] = await window.api.getCleanupItems();
    setItems(
      defs.map((def) => ({
        ...def,
        scanStatus: 'scanning' as const,
        size: null,
        available: true,
        cleaning: false,
      })),
    );
    await window.api.startScan();
    setScanning(false);
  }, []);

  useEffect(() => {
    const unsub = window.api.onScanResult((result: ScanResult) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === result.id
            ? {
                ...item,
                scanStatus: result.error ? ('error' as const) : ('done' as const),
                size: result.size,
                available: result.available,
              }
            : item,
        ),
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadDiskInfo();
    startScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteClick = useCallback(async (item: CleanupItemState) => {
    setDetailView({ item, details: null });

    const details = await window.api.scanDetails(item.id);

    if (details.length > 0) {
      setDetailView({ item, details });
    } else {
      setDetailView(null);
      setConfirmItem(item);
    }
  }, []);

  const handleCleanCommand = useCallback(
    async (item: CleanupItemState) => {
      setConfirmItem(null);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, cleaning: true } : i)),
      );

      const result: CleanResult = await window.api.cleanItem(item.id);

      if (result.success) {
        const scanResult = await window.api.scanItem(item.id);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, cleaning: false, size: scanResult.size, available: scanResult.available }
              : i,
          ),
        );
        setSessionReclaimed((prev) => prev + result.bytesFreed);
        showToast(`Freed ${formatBytes(result.bytesFreed)} from ${item.name}`);
        loadDiskInfo();
      } else {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, cleaning: false } : i)),
        );
        showToast(`Error: ${result.error}`);
      }
    },
    [loadDiskInfo, showToast],
  );

  const handleCleanSelected = useCallback(
    async (item: CleanupItemState, paths: string[]) => {
      setDetailView(null);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, cleaning: true } : i)),
      );

      const result: CleanResult = await window.api.cleanSelected(paths);

      if (result.success) {
        const scanResult = await window.api.scanItem(item.id);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, cleaning: false, size: scanResult.size, available: scanResult.available }
              : i,
          ),
        );
        setSessionReclaimed((prev) => prev + result.bytesFreed);
        showToast(`Freed ${formatBytes(result.bytesFreed)} from ${item.name}`);
        loadDiskInfo();
      } else {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, cleaning: false } : i)),
        );
        showToast(`Error: ${result.error}`);
      }
    },
    [loadDiskInfo, showToast],
  );

  const groups: { key: string; label: string; items: CleanupItemState[] }[] = [];
  const groupMap = new Map<string, (typeof groups)[0]>();
  for (const item of items) {
    let group = groupMap.get(item.group);
    if (!group) {
      group = { key: item.group, label: item.groupLabel, items: [] };
      groupMap.set(item.group, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  for (const group of groups) {
    group.items.sort((a, b) => (b.size ?? -1) - (a.size ?? -1));
  }

  const handleReveal = (id: string) => {
    window.api.revealInFinder(id);
  };

  return (
    <div className="app">
      <Header
        diskInfo={diskInfo}
        scanning={scanning}
        sessionReclaimed={sessionReclaimed}
        onRescan={startScan}
        onAbout={() => setShowAbout(true)}
      />

      <div className="content">
        {groups.map((group) => (
          <CategoryGroup key={group.key} label={group.label}>
            {group.items.map((item) => (
              <CleanupCard
                key={item.id}
                item={item}
                onDelete={() => handleDeleteClick(item)}
                onReveal={() => handleReveal(item.id)}
              />
            ))}
          </CategoryGroup>
        ))}

        {!scanning && items.length === 0 && (
          <div className="empty-state">Click Rescan to find reclaimable space.</div>
        )}
      </div>

      {confirmItem && (
        <ConfirmModal
          item={confirmItem}
          onConfirm={() => handleCleanCommand(confirmItem)}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {detailView && (
        <DetailModal
          item={detailView.item}
          details={detailView.details}
          onConfirm={(paths) => handleCleanSelected(detailView.item, paths)}
          onCancel={() => setDetailView(null)}
        />
      )}


      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <div className={`toast ${toast.visible ? 'visible' : ''}`}>{toast.message}</div>
    </div>
  );
}
