const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
    getAll: (table) => ipcRenderer.invoke('db:getAll', table),
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
  },
  print: {
    receipt: (html, options) => ipcRenderer.invoke('print:receipt', html, options),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },
  journal: {
    log: (entry) => ipcRenderer.invoke('journal:log', entry),
    getAll: (filters) => ipcRenderer.invoke('journal:getAll', filters),
    getComprehensive: (filters) => ipcRenderer.invoke('journal:getComprehensive', filters),
    getFinancialStats: () => ipcRenderer.invoke('journal:getFinancialStats'),
    getAuditTrail: (tableName, recordId) => ipcRenderer.invoke('journal:getAuditTrail', tableName, recordId),
    refund: (tableName, recordId, userName, reason) => ipcRenderer.invoke('journal:refund', tableName, recordId, userName, reason),
    cancel: (tableName, recordId, userName, reason) => ipcRenderer.invoke('journal:cancel', tableName, recordId, userName, reason),
    onUpdate: (cb) => ipcRenderer.on('journal:update', cb),
    offUpdate: (cb) => ipcRenderer.removeListener('journal:update', cb)
  },
  auth: {
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    setCurrentUser: (id) => ipcRenderer.invoke('auth:setCurrentUser', id),
    getUserRole: (uid) => ipcRenderer.invoke('auth:getUserRole', uid),
    setUserRole: (uid, role) => ipcRenderer.invoke('auth:setUserRole', uid, role)
  },
  qr: {
    upload: (base64Data, fileName) => ipcRenderer.invoke('qr:upload', base64Data, fileName),
  },
});
