const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('tonea', { isElectron: true, platform: process.platform });
