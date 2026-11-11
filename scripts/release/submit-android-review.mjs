#!/usr/bin/env node
/**
 * Upload an Android App Bundle to the Google Play production track and send it to review.
 *
 *   npm run submit:android -- --aab path/to/app.aab
 *   npm run submit:android -- --aab app.aab --dry-run       # read-only: checks access, shows the plan
 *   npm run submit:android -- --aab app.aab --yes           # no confirmation prompt
 *   npm run submit:android -- --check                       # only check the version isn't released yet
 *   npm run submit:android -- --aab app.aab --rollout 0.2   # staged rollout to 20% after approval
 *
 * What it does, for the version in app.json:
 *   1. uploads the .aab (Play reads the version code from it)
 *   2. creates a production release named after the version, with release notes for every
 *      locale under `## <version>` in docs/WHATS_NEW.md
 *   3. commits the change — Google reviews it and then rolls it out (100% unless --rollout)
 * The store listing (screenshots, descriptions) is never touched.
 *
 * Needs ./play-store-service-account.json (gitignored) with release access in Play Console.
 */
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { request } from 'node:https';
import { sign } from 'node:crypto';
import { appVersion, argValue, confirm, fail, fetchWithRetry, readReleaseNotes } from './lib.mjs';

const PACKAGE = JSON.parse(readFileSync('app.json', 'utf8')).expo.android.package;
const SERVICE_ACCOUNT_PATH = process.env.PITCHGYM_PLAY_KEY_PATH ?? './play-store-service-account.json';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}`;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const YES = argv.includes('--yes');
const AAB = argValue(argv, '--aab');
const ROLLOUT = argValue(argv, '--rollout');
/** only check that this version isn't on the production track yet (used by `npm run ship`) */
const CHECK = argv.includes('--check');

if (!AAB && !CHECK) fail('Pass the bundle to upload: --aab path/to/app.aab');
let aabSize;
if (AAB) {
  try {
    aabSize = statSync(AAB).size;
  } catch {
    fail(`Bundle not found: ${AAB}`);
  }
}
const userFraction = ROLLOUT === undefined ? undefined : Number(ROLLOUT);
if (userFraction !== undefined && !(userFraction > 0 && userFraction < 1)) {
  fail('--rollout must be a fraction between 0 and 1, e.g. 0.2 for 20%');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch {
  fail(`Play service account key not found at ${SERVICE_ACCOUNT_PATH}`);
}

// ---------------------------------------------------------------- API

async function accessToken() {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const assertion = `${unsigned}.${sign('sha256', Buffer.from(unsigned), serviceAccount.private_key).toString('base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const json = await res.json();
  if (!json.access_token) fail(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

let bearer;
async function api(method, url, { body } = {}) {
  const res = await fetchWithRetry(url, {
    method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${url.replace(/^https:\/\/[^/]+/, '')} failed (${res.status})\n  ${json?.error?.message ?? text}`);
  }
  return json;
}

/**
 * Streams the bundle with node:https instead of fetch: Google answers only after it has
 * processed the upload, which for a large bundle can outlast fetch's 5-minute header timeout.
 */
function uploadBundle(editId) {
  return new Promise((resolve, reject) => {
    const req = request(
      `${UPLOAD_API}/edits/${editId}/bundles?uploadType=media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': aabSize,
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300 && json?.versionCode) resolve(json);
          else reject(new Error(`Bundle upload failed (${res.statusCode})\n  ${json?.error?.message ?? text}`));
        });
      },
    );
    req.on('error', reject);
    createReadStream(AAB).on('error', reject).pipe(req);
  });
}

// ---------------------------------------------------------------- main

async function main() {
  const version = appVersion();
  console.log(`Google Play review submission — PitchGym ${version}${DRY_RUN ? ' (dry run)' : ''}\n`);
  const notes = readReleaseNotes(version);

  bearer = await accessToken();
  const edit = await api('POST', `${API}/edits`);
  const editUrl = `${API}/edits/${edit.id}`;
  // Abandon the draft edit on any failure so nothing half-done is left in Play Console.
  const discard = () => api('DELETE', editUrl).catch(() => {});

  try {
    const { listings = [] } = await api('GET', `${editUrl}/listings`);
    const listingLocales = listings.map((l) => l.language);
    const usable = Object.keys(notes).filter((l) => listingLocales.includes(l));
    const missing = Object.keys(notes).filter((l) => !listingLocales.includes(l));
    const production = await api('GET', `${editUrl}/tracks/production`);
    const current = production.releases?.find((r) => r.status !== 'draft');
    if (production.releases?.some((r) => r.name === version && r.status !== 'draft')) {
      throw new Error(`${version} is already on the production track. Bump "version" in app.json.`);
    }
    if (CHECK) {
      await discard();
      console.log(`✔ Google Play: ${version} can be submitted (live now: ${current?.name ?? 'nothing'})`);
      return;
    }

    console.log(`  bundle:         ${AAB} (${(aabSize / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`  release:        ${version} → production`);
    console.log(`  currently live: ${current ? `${current.name} (${current.versionCodes?.join(', ')}, ${current.status})` : 'nothing'}`);
    console.log(`  release notes:  ${usable.join(', ')}`);
    if (missing.length) console.log(`  ⚠ not on the store listing, skipped: ${missing.join(', ')}`);
    console.log(`  rollout:        ${userFraction ? `${userFraction * 100}% after approval` : '100% after approval'}`);
    console.log('  store listing:  untouched\n');

    if (DRY_RUN) {
      await discard();
      console.log('Dry run — nothing was changed.');
      return;
    }
    if (!YES) await confirm('Upload and send to Google Play review?');

    console.log('  uploading bundle…');
    const bundle = await uploadBundle(edit.id);
    console.log(`✔ uploaded version code ${bundle.versionCode}`);

    await api('PUT', `${editUrl}/tracks/production`, {
      body: {
        track: 'production',
        releases: [
          {
            name: version,
            versionCodes: [String(bundle.versionCode)],
            status: userFraction ? 'inProgress' : 'completed',
            ...(userFraction ? { userFraction } : {}),
            releaseNotes: usable.map((language) => ({ language, text: notes[language] })),
          },
        ],
      },
    });
    console.log('✔ production release created');

    await api('POST', `${editUrl}:commit`);
    console.log(`\n✔ ${version} (${bundle.versionCode}) sent to Google Play review.`);
  } catch (err) {
    await discard();
    throw err;
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
