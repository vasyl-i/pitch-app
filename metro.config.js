const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// dotLottie animations are bundled as assets (decoded natively, off the JS/UI hot path)
config.resolver.assetExts.push('lottie');

module.exports = config;
