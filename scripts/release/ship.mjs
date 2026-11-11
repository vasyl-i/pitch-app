#!/usr/bin/env node
/**
 * One command: build locally, upload, and send the app version in app.json to store review.
 *
 *   npm run ship                       # iOS + Android
 *   npm run ship -- --platform ios     # or android
 *   npm run ship -- --yes              # no confirmation prompt
 *   npm run ship -- --rollout 0.2      # Android staged rollout (20%) after approval
 *   npm run ship -- --ipa x.ipa        # reuse an existing build instead of building (same for --aab)
 *
 * Before running: bump "version" in app.json and add a `## <version>` section to docs/WHATS_NEW.md.
 *
 * Order (so Apple processes the upload while Android builds):
 *   1. check both stores can take this version + validate release notes   (seconds)
 *   2. iOS: local EAS build → upload to TestFlight (eas submit)
 *   3. Android: local EAS build → upload to Play production + release notes → Google review
 *   4. iOS: wait for Apple's processing → What's New → attach build → App Review
 *
 * Builds run on this Mac (`eas build --local`, no EAS queue) with EAS-managed signing and
 * EAS env vars; build numbers still auto-increment on EAS. Artifacts go to ../pitchgym-builds.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { appVersion, argValue, confirm, fail, readReleaseNotes } from './lib.mjs';

const argv = process.argv.slice(2);
const PLATFORM = argValue(argv, '--platform') ?? 'all';
const YES = argv.includes('--yes');
const ROLLOUT = argValue(argv, '--rollout');
const EXISTING_IPA = argValue(argv, '--ipa');
const EXISTING_AAB = argValue(argv, '--aab');
if (!['all', 'ios', 'android'].includes(PLATFORM)) fail('--platform must be ios, android or all');
const IOS = PLATFORM !== 'android';
const ANDROID = PLATFORM !== 'ios';

const OUT_DIR = resolve('..', 'pitchgym-builds');

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const { status } = spawnSync(cmd, args, { stdio: 'inherit' });
  if (status !== 0) fail(`"${cmd} ${args[0]} ${args[1] ?? ''}" failed (exit ${status}).`);
}

const script = (name, args) => run(process.execPath, [`scripts/release/${name}`, ...args]);

function step(title) {
  console.log(`\n━━━ ${title} ${'━'.repeat(Math.max(0, 60 - title.length))}`);
}

function localBuild(platform, outFile) {
  run('eas', [
    'build',
    '--platform', platform,
    '--profile', 'production',
    '--local',
    '--non-interactive',
    '--output', outFile,
  ]);
  return outFile;
}

/** CFBundleVersion inside the .ipa — tells the review script which TestFlight build to wait for. */
function ipaBuildNumber(ipa) {
  const plist = execFileSync('unzip', ['-p', ipa, 'Payload/*.app/Info.plist']);
  return execFileSync('plutil', ['-extract', 'CFBundleVersion', 'raw', '-o', '-', '-'], { input: plist })
    .toString()
    .trim();
}

async function main() {
  const version = appVersion();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  mkdirSync(OUT_DIR, { recursive: true });

  step(`Checks — PitchGym ${version}`);
  const notes = readReleaseNotes(version);
  console.log(`✔ release notes: ${Object.keys(notes).join(', ')}`);
  if (IOS) script('submit-ios-review.mjs', ['--check']);
  if (ANDROID) script('submit-android-review.mjs', ['--check']);

  const targets = [IOS && 'App Store', ANDROID && 'Google Play'].filter(Boolean).join(' and ');
  if (!YES) await confirm(`\nBuild ${version} locally and send it to ${targets} review?`);

  let ipa;
  if (IOS) {
    step('iOS build');
    ipa = EXISTING_IPA ?? localBuild('ios', `${OUT_DIR}/pitchgym-${version}-${stamp}.ipa`);
    step('iOS upload to TestFlight');
    run('eas', ['submit', '--platform', 'ios', '--profile', 'production', '--path', ipa, '--non-interactive']);
  }

  if (ANDROID) {
    step('Android build');
    const aab = EXISTING_AAB ?? localBuild('android', `${OUT_DIR}/pitchgym-${version}-${stamp}.aab`);
    step('Android → Google Play review');
    script('submit-android-review.mjs', ['--aab', aab, '--yes', ...(ROLLOUT ? ['--rollout', ROLLOUT] : [])]);
  }

  if (IOS) {
    step('iOS → App Review');
    script('submit-ios-review.mjs', ['--build', ipaBuildNumber(ipa), '--wait', '--yes']);
  }

  step('Done');
  console.log(`${version} is in review on ${targets}. Builds are in ${OUT_DIR}`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
