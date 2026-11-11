#!/usr/bin/env node
/**
 * Submit the current app version to App Store review.
 *
 *   npm run submit:ios               # asks for confirmation before changing anything
 *   npm run submit:ios -- --dry-run  # read-only: shows what would happen
 *   npm run submit:ios -- --yes      # no confirmation prompt
 *   npm run submit:ios -- --wait     # wait (up to 60 min) for the build to show up and finish processing
 *   npm run submit:ios -- --check    # only check the version can still be submitted
 *   npm run submit:ios -- --build 3  # attach exactly this build number (default: newest processed)
 *
 * What it does, for the version in app.json:
 *   1. finds (or creates) that App Store version — a new version copies screenshots,
 *      description and keywords from the previous one; this script never touches them
 *   2. sets "What's New" for every locale listed under `## <version>` in docs/WHATS_NEW.md
 *   3. attaches the TestFlight build of that version (--build, or the newest processed one)
 *   4. submits the version for App Review
 *
 * Needs (in .env, never committed):
 *   ASC_ISSUER_ID  App Store Connect → Users and Access → Integrations → App Store Connect API
 * Optional:
 *   PITCHGYM_ASC_KEY_PATH  default ./AuthKey_AFM47GC9H2.p8
 *   PITCHGYM_ASC_KEY_ID    default: taken from the key file name
 * (Project-prefixed on purpose: a global ASC_KEY_ID in ~/.zshrc for another key
 * would otherwise be paired with this key file and give a 401.)
 * The app ID comes from eas.json (submit.production.ios.ascAppId).
 */
import { readFileSync } from 'node:fs';
import { sign } from 'node:crypto';
import { basename } from 'node:path';
import { appVersion, argValue, confirm, fail, fetchWithRetry, readReleaseNotes } from './lib.mjs';

const API = 'https://api.appstoreconnect.apple.com/v1';
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const YES = argv.includes('--yes');
const WAIT = argv.includes('--wait');
/** only check that this version can still be submitted (used by `npm run ship` before building) */
const CHECK = argv.includes('--check');
/** exact build number (CFBundleVersion) to attach; default = newest processed build */
const BUILD = argValue(argv, '--build');
const WAIT_MINUTES = 60;

// Versions in these states can still be edited and submitted.
const EDITABLE_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);

// ---------------------------------------------------------------- config

const version = appVersion();
const appId = JSON.parse(readFileSync('eas.json', 'utf8')).submit?.production?.ios?.ascAppId;
if (!appId || !/^\d+$/.test(appId)) fail('eas.json is missing submit.production.ios.ascAppId');

const keyPath = process.env.PITCHGYM_ASC_KEY_PATH ?? './AuthKey_AFM47GC9H2.p8';
const keyId = process.env.PITCHGYM_ASC_KEY_ID ?? basename(keyPath).match(/^AuthKey_(\w+)\.p8$/)?.[1];
const issuerId = process.env.ASC_ISSUER_ID;
if (!issuerId) fail('Set ASC_ISSUER_ID in .env (App Store Connect → Users and Access → Integrations).');
if (!keyId) fail('Set PITCHGYM_ASC_KEY_ID in .env (could not read it from the key file name).');
let privateKey;
try {
  privateKey = readFileSync(keyPath, 'utf8');
} catch {
  fail(`App Store Connect API key not found at ${keyPath}`);
}

// ---------------------------------------------------------------- API

function token() {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({
    iss: issuerId,
    iat: now,
    exp: now + 15 * 60,
    aud: 'appstoreconnect-v1',
  })}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function api(method, path, body) {
  const res = await fetchWithRetry(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = (json.errors ?? [])
      .map((e) => `  ${e.status} ${e.code}: ${e.title}${e.detail ? ` — ${e.detail}` : ''}`)
      .join('\n');
    fail(`${method} ${path} failed (${res.status})\n${details}`);
  }
  return json;
}

const get = (path) => api('GET', path);
const write = (method, path, body) => (DRY_RUN ? Promise.resolve(null) : api(method, path, body));

// ---------------------------------------------------------------- steps

async function findVersion() {
  const { data } = await get(
    `/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20&fields[appStoreVersions]=versionString,appStoreState,appVersionState,releaseType`,
  );
  const state = (v) => v.attributes.appVersionState ?? v.attributes.appStoreState;
  const exact = data.find((v) => v.attributes.versionString === version);
  if (exact) {
    if (!EDITABLE_STATES.has(state(exact))) {
      fail(`Version ${version} is already "${state(exact)}" — nothing to submit.`);
    }
    return { id: exact.id, action: 'use existing', releaseType: exact.attributes.releaseType };
  }
  // An unsubmitted draft with another number (e.g. an abandoned 1.3.8) is renamed instead.
  const draft = data.find((v) => EDITABLE_STATES.has(state(v)));
  if (draft) {
    return {
      id: draft.id,
      action: `rename draft ${draft.attributes.versionString} → ${version}`,
      rename: true,
      releaseType: draft.attributes.releaseType,
    };
  }
  return { id: null, action: 'create new version' };
}

async function findBuild() {
  const deadline = Date.now() + WAIT_MINUTES * 60 * 1000;
  const buildFilter = BUILD ? `&filter[version]=${BUILD}` : '';
  for (;;) {
    const { data } = await get(
      `/builds?filter[app]=${appId}&filter[preReleaseVersion.version]=${version}${buildFilter}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,expired,uploadedDate`,
    );
    const ready = data.find((b) => b.attributes.processingState === 'VALID' && !b.attributes.expired);
    if (ready) return ready;
    const failed = data.find((b) => ['FAILED', 'INVALID'].includes(b.attributes.processingState));
    if (failed) fail(`Build ${failed.attributes.version} of ${version} failed Apple's processing (${failed.attributes.processingState}).`);
    const what = BUILD ? `build ${BUILD} of ${version}` : `a build of ${version}`;
    if (!WAIT) {
      fail(data.length
        ? `${what} is still processing. Try again later, or add --wait.`
        : `No TestFlight upload of ${what} found. Upload it first, or add --wait if it was just uploaded.`);
    }
    if (Date.now() > deadline) fail(`Gave up after ${WAIT_MINUTES} min waiting for ${what} to finish processing.`);
    console.log(`  waiting for ${what} — ${data.length ? 'processing' : 'not listed yet'}, checking again in 30s…`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

async function main() {
  console.log(`App Store review submission — PitchGym ${version}${DRY_RUN ? ' (dry run)' : ''}\n`);

  const notes = readReleaseNotes(version);
  const target = await findVersion();
  if (CHECK) {
    console.log(`✔ App Store: ${version} can be submitted (${target.action})`);
    return;
  }
  const build = await findBuild();

  let existingLocales = null;
  if (target.id) {
    const { data } = await get(
      `/appStoreVersions/${target.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale`,
    );
    existingLocales = data.map((l) => l.attributes.locale);
  }

  console.log(`  version:        ${target.action}`);
  console.log(`  build:          ${version} (${build.attributes.version})`);
  console.log(`  what's new:     ${Object.keys(notes).join(', ')}`);
  if (existingLocales) {
    const missing = Object.keys(notes).filter((l) => !existingLocales.includes(l));
    if (missing.length) console.log(`  ⚠ not on the store listing, skipped: ${missing.join(', ')}`);
  }
  console.log(`  release:        ${target.releaseType ?? 'store default'} (unchanged)`);
  console.log('  screenshots, description, keywords: untouched\n');

  if (DRY_RUN) {
    console.log('Dry run — nothing was changed.');
    return;
  }
  if (!YES) await confirm('Submit to App Review?');

  // 1. version
  let versionId = target.id;
  if (!versionId) {
    const created = await write('POST', '/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: { platform: 'IOS', versionString: version },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    versionId = created.data.id;
    console.log(`✔ created version ${version}`);
  } else if (target.rename) {
    await write('PATCH', `/appStoreVersions/${versionId}`, {
      data: { type: 'appStoreVersions', id: versionId, attributes: { versionString: version } },
    });
    console.log(`✔ renamed draft to ${version}`);
  }

  // 2. what's new
  const { data: localizations } = await get(
    `/appStoreVersions/${versionId}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale`,
  );
  for (const loc of localizations) {
    const text = notes[loc.attributes.locale];
    if (!text) {
      console.log(`  ⚠ no release notes for ${loc.attributes.locale} in docs/WHATS_NEW.md — left as is`);
      continue;
    }
    await write('PATCH', `/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { whatsNew: text } },
    });
    console.log(`✔ what's new: ${loc.attributes.locale}`);
  }

  // 3. build
  await write('PATCH', `/appStoreVersions/${versionId}/relationships/build`, {
    data: { type: 'builds', id: build.id },
  });
  console.log(`✔ attached build ${build.attributes.version}`);

  // 4. review submission (reuse an unsent one left over from an earlier attempt)
  const { data: open } = await get(
    `/reviewSubmissions?filter[app]=${appId}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&include=items`,
  );
  let submissionId = open[0]?.id;
  if (!submissionId) {
    const created = await write('POST', '/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    submissionId = created.data.id;
  }
  const { data: items } = await get(
    `/reviewSubmissions/${submissionId}/items?include=appStoreVersion&fields[reviewSubmissionItems]=appStoreVersion`,
  );
  const alreadyAdded = items.some((i) => i.relationships?.appStoreVersion?.data?.id === versionId);
  if (!alreadyAdded) {
    await write('POST', '/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
  }
  await write('PATCH', `/reviewSubmissions/${submissionId}`, {
    data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } },
  });
  console.log(`\n✔ ${version} submitted for App Review.`);
}

main().catch((err) => fail(err?.stack ?? String(err)));
