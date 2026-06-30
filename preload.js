const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPrinters: () => new Promise((resolve) => {
    ipcRenderer.once('printers-list', (event, printers) => resolve(printers));
    ipcRenderer.send('get-printers');
  }),
  setDefaultPrinter: (selectedPrinter) => {
    ipcRenderer.send('set-default-printer', selectedPrinter.deviceName);
  },
  sendPrintData: (printOptions) => ipcRenderer.send('print-data', printOptions),
  onPrintError: (callback) => ipcRenderer.once('print-error', callback),
  onPrintSuccess: (callback) => ipcRenderer.once('print-success', callback),
  isUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
  updateNow: () => ipcRenderer.send("update_now"),
  onProgress: (callback) => ipcRenderer.on("update_progress", callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on("update_downloaded", callback),
  restartApp: () => ipcRenderer.send("restart_app"),
  checkForUpdate: () => ipcRenderer.send("check_for_update"),
  onNoUpdate: (callback) => ipcRenderer.on("no_update_available", (event, data) => callback(data)),
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', callback),
  generatePDF: (htmlContent) => ipcRenderer.invoke('generate-pdf', htmlContent),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, version) => callback(version)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, version) => callback(version)),
  installUpdate: () => ipcRenderer.invoke('install-update')
});
