// Permite que la app importe el módulo común de proveedores (../shared) que también usa la versión de PC.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..', 'shared')];

module.exports = config;
