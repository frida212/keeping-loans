import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  importCSV: (filePath: string) => ipcRenderer.invoke('importCSV', filePath),
  getLoans: () => ipcRenderer.invoke('getLoans'),
  getTasks: () => ipcRenderer.invoke('getTasks')
});
