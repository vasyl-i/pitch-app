/**
 * Expo config plugin fixing two iOS build failures that occur when the
 * project path contains a space (this repo lives under ".../Pitch app/").
 * Applied automatically on every `expo prebuild`, so the generated ios/
 * directory stays disposable (Continuous Native Generation safe).
 *
 * 1. The app target's "Bundle React Native code and images" phase executes a
 *    command-substitution result unquoted:
 *      `"$NODE_BINARY" --print "...react-native-xcode.sh'"`
 *    The returned path splits on the space. Rewritten to capture the path in
 *    a variable and invoke it quoted.
 *
 * 2. EXConstants' "Generate app.config" script phase passes
 *    $PODS_TARGET_SRCROOT to `bash -c` unquoted. Fixed via a Podfile
 *    post_install hook that rewrites the phase's shell script.
 *
 * Also disables ENABLE_USER_SCRIPT_SANDBOXING on the app target, which
 * Xcode's script sandbox otherwise uses to block the RN bundling / Expo
 * codegen script phases from writing into DerivedData (unrelated to the
 * space-in-path issue, but the app target's project.pbxproj is regenerated
 * by prebuild the same way, so it lives here too).
 */
const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BUNDLE_PHASE_BACKTICK = /`(\\"\$NODE_BINARY\\"[^`]*react-native-xcode\.sh'\\")`/;

const PODFILE_PATCH = `
    # with-spaces-in-path-fix: quote EXConstants' app.config script invocation
    installer.pods_project.targets.each do |t|
      next unless t.name == 'EXConstants'
      t.shell_script_build_phases.each do |phase|
        next unless phase.name&.include?('Generate app.config')
        phase.shell_script = phase.shell_script.gsub(
          '"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"',
          %q{'"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"'}
        )
      end
    end
`;

function fixBundlePhase(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    let patched = false;
    for (const key of Object.keys(phases)) {
      const phase = phases[key];
      if (!phase || typeof phase !== 'object' || !phase.shellScript) continue;
      if (!String(phase.name || '').includes('Bundle React Native code')) continue;
      if (BUNDLE_PHASE_BACKTICK.test(phase.shellScript)) {
        phase.shellScript = phase.shellScript.replace(
          BUNDLE_PHASE_BACKTICK,
          'RN_XCODE_SH=\\"$($1)\\"\\n/bin/sh \\"$RN_XCODE_SH\\"'
        );
        patched = true;
      }
    }
    if (!patched) {
      console.warn(
        '[with-spaces-in-path-fix] Bundle RN phase pattern not found — template may have changed; verify quoting manually.'
      );
    }
    return cfg;
  });
}

function fixUserScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.hash.project.objects.XCBuildConfiguration || {};
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (!entry || typeof entry !== 'object' || !entry.buildSettings) continue;
      // Xcode's script sandboxing blocks the app target's RN bundling /
      // Expo codegen build phases from writing into DerivedData; CocoaPods
      // already disables it for pod targets, the app target needs it too.
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return cfg;
  });
}

function fixPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      if (!podfile.includes('with-spaces-in-path-fix')) {
        const anchor = 'post_install do |installer|';
        if (!podfile.includes(anchor)) {
          throw new Error('[with-spaces-in-path-fix] post_install block not found in Podfile');
        }
        podfile = podfile.replace(anchor, anchor + PODFILE_PATCH);
        fs.writeFileSync(podfilePath, podfile);
      }
      return cfg;
    },
  ]);
}

module.exports = function withSpacesInPathFix(config) {
  return fixPodfile(fixUserScriptSandboxing(fixBundlePhase(config)));
};
