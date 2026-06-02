// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Expo Router için gerekli
  isCSSEnabled: true,
});

// require.context — Expo Router web desteği için zorunlu
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
