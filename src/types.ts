export interface CleanupItemDef {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  description: string;
  tooltip: string;
  safetyLevel: 'safe' | 'caution' | 'destructive';
  regenerateNote: string;
  deleteCommandDisplay: string;
}

export interface ScanResult {
  id: string;
  size: number;
  available: boolean;
  error?: string;
}

export interface CleanResult {
  id: string;
  bytesFreed: number;
  success: boolean;
  output?: string;
  error?: string;
}

export interface DiskInfo {
  total: number;
  free: number;
}

export interface CleanupItemState extends CleanupItemDef {
  scanStatus: 'idle' | 'scanning' | 'done' | 'error';
  size: number | null;
  available: boolean;
  cleaning: boolean;
}

export interface CleanupDetail {
  path: string;
  displayName: string;
  size: number;
  lastModified: number;
}

declare global {
  interface Window {
    api: {
      getDiskInfo: () => Promise<DiskInfo>;
      getCleanupItems: () => Promise<CleanupItemDef[]>;
      startScan: () => Promise<void>;
      scanItem: (id: string) => Promise<ScanResult>;
      cleanItem: (id: string) => Promise<CleanResult>;
      scanDetails: (id: string) => Promise<CleanupDetail[]>;
      cleanSelected: (paths: string[]) => Promise<CleanResult>;
      revealInFinder: (id: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      onScanResult: (callback: (result: ScanResult) => void) => () => void;
    };
  }
}
