// @ts-check
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig: getExpoConfig } = require('expo/metro-config');
const { resolve } = require('node:path');

module.exports = mergeConfig(getDefaultConfig(__dirname), getExpoConfig(__dirname), {
    watchFolders: [resolve(__dirname, '../js')]
});
