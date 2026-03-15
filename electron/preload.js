const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  makeRequest: (method, endpoint, data) => 
    ipcRenderer.invoke('api-request', { method, endpoint, data }),
  uploadFile: (endpoint, fileData) => 
    ipcRenderer.invoke('file-upload', { endpoint, ...fileData }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});