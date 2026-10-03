/**
 * Expo config plugin that configures the Podfile for react-native-firebase:
 * 1. Disables SPM (static linkage conflict with firebase-ios-sdk)
 * 2. Enables modular headers for deps that FirebaseCrashlytics Swift pods need
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseDisableSPM(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // 1. Disable SPM before any target block
      if (!podfile.includes('$RNFirebaseDisableSPM')) {
        podfile = podfile.replace(
          "prepare_react_native_project!",
          "prepare_react_native_project!\n\n$RNFirebaseDisableSPM = true"
        );
      }

      // 2. Add modular headers inside the target block
      if (!podfile.includes('GoogleDataTransport')) {
        podfile = podfile.replace(
          "use_expo_modules!",
          [
            "use_expo_modules!",
            "",
            "  # Modular headers required by FirebaseCrashlytics/FirebaseSessions Swift pods",
            "  pod 'GoogleDataTransport', :modular_headers => true",
            "  pod 'nanopb', :modular_headers => true",
          ].join("\n")
        );
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
