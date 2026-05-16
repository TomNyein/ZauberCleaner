import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getDiskInfo: () => ipcRenderer.invoke('disk:info'),
  getCleanupItems: () => ipcRenderer.invoke('cleanup:items'),
  startScan: () => ipcRenderer.invoke('scan:start'),
  scanItem: (id: string) => ipcRenderer.invoke('scan:item', id),
  cleanItem: (id: string) => ipcRenderer.invoke('clean:item', id),
  scanDetails: (id: string) => ipcRenderer.invoke('scan:details', id),
  cleanSelected: (paths: string[]) => ipcRenderer.invoke('clean:selected', paths),
  revealInFinder: (id: string) => ipcRenderer.invoke('reveal:finder', id),
  openExternal: (url: string) => ipcRenderer.invoke('open:external', url),
  onScanResult: (callback: (result: any) => void) => {
    const handler = (_event: any, result: any) => callback(result);
    ipcRenderer.on('scan:result', handler);
    return () => {
      ipcRenderer.removeListener('scan:result', handler);
    };
  },
});
