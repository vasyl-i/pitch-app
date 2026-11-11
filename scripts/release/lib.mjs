/** Shared helpers for the release scripts (scripts/release/*.mjs). */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

export function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

/** Marketing version from app.json — the single source of truth. */
export function appVersion() {
  return JSON.parse(readFileSync('app.json', 'utf8')).expo.version;
}

/** Value following a flag, e.g. `--build 3` → "3". */
export function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) fail(`${flag} needs a value`);
  return value;
}

export async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') fail('Cancelled.');
}

/**
 * Store "What's New" texts from docs/WHATS_NEW.md:
 * `## <version>` → `### <locale>` blocks; other `###` blocks (the Play paste block) are skipped.
 * Validated for both stores: Google Play 500 chars, App Store 4000 chars and no emoji.
 */
export function readReleaseNotes(version) {
  const lines = readFileSync('docs/WHATS_NEW.md', 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) fail(`docs/WHATS_NEW.md has no "## ${version}" section.`);
  const notes = {};
  let locale = null;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    const heading = line.match(/^### ([a-z]{2}(?:-[A-Z]{2})?)\s*$/);
    if (heading) {
      locale = heading[1];
      notes[locale] = [];
    } else if (line.startsWith('### ')) {
      locale = null;
    } else if (locale) {
      notes[locale].push(line);
    }
  }
  const result = Object.fromEntries(
    Object.entries(notes).map(([loc, body]) => [loc, body.join('\n').trim()]),
  );
  if (Object.keys(result).length === 0) fail(`No locales found under "## ${version}" in docs/WHATS_NEW.md.`);
  for (const [loc, text] of Object.entries(result)) {
    if (!text) fail(`Empty release notes for ${loc}.`);
    if ([...text].length > 500) fail(`Release notes for ${loc} exceed Google Play's 500 characters.`);
    // App Store rejects emoji in "What's New" (409 INVALID_CHARACTERS).
    const emoji = text.match(/\p{Extended_Pictographic}/gu);
    if (emoji) fail(`Release notes for ${loc} contain emoji, which App Store rejects: ${[...new Set(emoji)].join(' ')}`);
  }
  return result;
}

/**
 * fetch with retries for temporary store-API failures (429, 5xx, network errors).
 * Waits 3s, 10s, 30s between attempts; other errors are returned to the caller as-is.
 */
export async function fetchWithRetry(url, init) {
  const waits = [3, 10, 30];
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (attempt >= waits.length) throw err;
      console.log(`  network error (${err.cause?.code ?? err.message}), retrying in ${waits[attempt]}s…`);
      await new Promise((r) => setTimeout(r, waits[attempt] * 1000));
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < waits.length) {
      console.log(`  ${new URL(url).hostname} answered ${res.status}, retrying in ${waits[attempt]}s…`);
      await new Promise((r) => setTimeout(r, waits[attempt] * 1000));
      continue;
    }
    return res;
  }
}
