/**
 * The weak-spot engine: turn accumulated practice history into a ranked list
 * of *specific, named* things this singer struggles with, each backed by the
 * measurement that produced it.
 *
 * The whole value of Premium rests on this being concrete. "Work on your pitch
 * accuracy" is a horoscope. "You land descending minor thirds 31 cents flat,
 * across 14 attempts" is coaching. So every weak spot must carry:
 *
 *   - evidence: the measured fact, stated in plain language
 *   - observations: how much data backs it (nothing fires on one bad day)
 *   - an activity that actually targets it
 *
 * A signal with too little data produces *no* weak spot rather than a hedged
 * one. An empty list is an honest answer; an invented weakness is not.
 *
 * Pure — plain data in, plain data out, no React, no storage, no clock beyond
 * the injected `now`. Runs under `node --test`.
 */
import type { Activity, SkillId, SkillState } from '../model/types';
import { SKILL_LABELS } from '../model/types';

/* ------------------------------------------------------------------ *
 * Inputs                                                              *
 * ------------------------------------------------------------------ */

/** the accumulating shape the progress store persists per bucket */
export interface Tally {
  /** sum of signed cents (positive = sharp) */
  centsSum: number;
  count: number;
  perfect: number;
}

export interface WeakSpotInput {
  /** long-term skill profile */
  skills: Record<SkillId, SkillState>;
  /** merged across history, keyed by exact MIDI note */
  byMidi: Record<number, Tally>;
  /** merged across history, keyed by signed semitones ("-3", "+7") */
  byInterval: Record<string, Tally>;
  /** merged across history, keyed by pitch class 0–11 */
  byPitchClass: Record<number, Tally>;
  /** average stability score 0–100 across recent sessions, null if unknown */
  avgStability: number | null;
  /** average rhythm score 0–100 across recent sessions, null if unknown */
  avgRhythm: number | null;
  /** activities the user may actually be given */
  catalog: Activity[];
}

/* ------------------------------------------------------------------ *
 * Output                                                              *
 * ------------------------------------------------------------------ */

// TODO: add a 'song-fragment' kind ("difficult fragments of a song") once
// instrumental sing sessions produce real per-segment timelines to mine.
export type WeakSpotKind = 'interval' | 'register' | 'note' | 'stability' | 'rhythm' | 'skill';

export interface WeakSpot {
  id: string;
  kind: WeakSpotKind;
  /** the drill's name, e.g. "Descending minor 3rds" */
  title: string;
  /** the measurement behind it, in plain language — always shown with the title */
  evidence: string;
  /** 0–100; higher means weaker. Used only for ranking, never displayed raw. */
  severity: number;
  /** graded observations backing this spot */
  observations: number;
  /** the skill this trains, for mastery attribution */
  skill: SkillId;
  /** what to practise — absent if the catalog has nothing suitable (locked tier) */
  activity?: Activity;
}

/* ------------------------------------------------------------------ *
 * Thresholds                                                          *
 * ------------------------------------------------------------------ */

/**
 * Minimum observations before a bucket may become a weak spot. Set high
 * enough that normal noise — one hoarse morning, one late entry — cannot
 * manufacture a "weakness" the singer doesn't have.
 */
const MIN_INTERVAL_OBS = 6;
const MIN_NOTE_OBS = 8;
const MIN_REGISTER_OBS = 10;

/** accuracy below this (fraction of notes hit cleanly) is worth training */
const WEAK_ACCURACY = 0.6;
/** average absolute deviation, in cents, that counts as a real tendency */
const WEAK_CENTS = 20;
/** scores below this are worth calling out */
const WEAK_SCORE = 70;
/** a skill this far below the singer's own average is a relative weakness */
const SKILL_GAP = 12;

const PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** interval names by absolute semitones */
const INTERVAL_NAMES = [
  'unison',
  'minor 2nds',
  'major 2nds',
  'minor 3rds',
  'major 3rds',
  'perfect 4ths',
  'tritones',
  'perfect 5ths',
  'minor 6ths',
  'major 6ths',
  'minor 7ths',
  'major 7ths',
  'octaves',
];

export function midiName(midi: number): string {
  return `${PITCH_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/** `"-3"` → `"Descending minor 3rds"` */
export function intervalName(key: string): string {
  const semitones = Number(key);
  if (!Number.isFinite(semitones) || semitones === 0) return key;
  const abs = Math.abs(semitones);
  const name = INTERVAL_NAMES[abs] ?? `${abs}-semitone leaps`;
  if (abs > 12) return `${semitones > 0 ? 'Ascending' : 'Descending'} leaps over an octave`;
  return `${semitones > 0 ? 'Ascending' : 'Descending'} ${name}`;
}

const accuracy = (t: Tally): number => (t.count === 0 ? 1 : t.perfect / t.count);
const avgCents = (t: Tally): number => (t.count === 0 ? 0 : t.centsSum / t.count);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const sharpFlat = (cents: number) => (cents > 0 ? 'sharp' : 'flat');

/* ------------------------------------------------------------------ *
 * Activity matching                                                   *
 * ------------------------------------------------------------------ */

/** the catalog activity that best trains a skill, easiest first for weak areas */
function activityForSkill(catalog: Activity[], skill: SkillId): Activity | undefined {
  const primary = catalog.filter((a) => a.skills[0] === skill);
  const secondary = catalog.filter((a) => a.skills.includes(skill));
  const pool = primary.length > 0 ? primary : secondary;
  // weak spots are remedial: start gentle, don't pile difficulty on a struggle
  return [...pool].sort((a, b) => a.challenge - b.challenge)[0];
}

/* ------------------------------------------------------------------ *
 * The engine                                                          *
 * ------------------------------------------------------------------ */

/**
 * Rank this singer's weak spots, strongest evidence first.
 *
 * @param limit maximum spots to return; the practice section shows a few, the
 *              full list is available for a "see all" view.
 */
export function findWeakSpots(input: WeakSpotInput, limit = 5): WeakSpot[] {
  const spots: WeakSpot[] = [];
  const { catalog } = input;

  /* -- 1. intervals: the most specific and most actionable signal ---- */
  for (const [key, tally] of Object.entries(input.byInterval)) {
    if (tally.count < MIN_INTERVAL_OBS) continue;
    const acc = accuracy(tally);
    const cents = avgCents(tally);
    if (acc >= WEAK_ACCURACY && Math.abs(cents) < WEAK_CENTS) continue;

    const skill: SkillId = 'interval-singing';
    spots.push({
      id: `interval:${key}`,
      kind: 'interval',
      title: intervalName(key),
      evidence:
        Math.abs(cents) >= WEAK_CENTS
          ? `You land these about ${Math.round(Math.abs(cents))}¢ ${sharpFlat(cents)}, across ${tally.count} attempts.`
          : `You hit these cleanly ${Math.round(acc * 100)}% of the time, across ${tally.count} attempts.`,
      severity: clamp((1 - acc) * 60 + Math.min(Math.abs(cents), 50), 0, 100),
      observations: tally.count,
      skill,
      activity: activityForSkill(catalog, skill),
    });
  }

  /* -- 2. register: where in the voice accuracy falls apart ---------- */
  const registerSpot = findRegisterWeakness(input.byMidi, catalog);
  if (registerSpot) spots.push(registerSpot);

  /* -- 3. individual notes ------------------------------------------ */
  for (const [midiKey, tally] of Object.entries(input.byMidi)) {
    if (tally.count < MIN_NOTE_OBS) continue;
    const cents = avgCents(tally);
    const acc = accuracy(tally);
    if (Math.abs(cents) < WEAK_CENTS && acc >= WEAK_ACCURACY) continue;
    const midi = Number(midiKey);
    // the register spot already covers this stretch of the voice
    if (registerSpot && midi >= registerFloor(registerSpot)) continue;

    const skill: SkillId = 'pitch-accuracy';
    spots.push({
      id: `note:${midiKey}`,
      kind: 'note',
      title: `${midiName(midi)} accuracy`,
      evidence: `On ${midiName(midi)} you average ${Math.round(Math.abs(cents))}¢ ${sharpFlat(cents)} over ${tally.count} notes.`,
      severity: clamp((1 - acc) * 50 + Math.min(Math.abs(cents), 45), 0, 100),
      observations: tally.count,
      skill,
      activity: activityForSkill(catalog, skill),
    });
  }

  /* -- 4. sustained-note stability ----------------------------------- */
  if (input.avgStability !== null && input.avgStability < WEAK_SCORE) {
    const skill: SkillId = 'pitch-stability';
    spots.push({
      id: 'stability',
      kind: 'stability',
      title: 'Sustained note stability',
      evidence: `Your held notes score ${Math.round(input.avgStability)}/100 — the pitch drifts while you hold it.`,
      severity: clamp(WEAK_SCORE - input.avgStability + 25, 0, 100),
      observations: input.skills[skill].exercisesCompleted,
      skill,
      activity: activityForSkill(catalog, skill),
    });
  }

  /* -- 5. rhythm ----------------------------------------------------- */
  if (input.avgRhythm !== null && input.avgRhythm < WEAK_SCORE) {
    const skill: SkillId = 'rhythm-accuracy';
    spots.push({
      id: 'rhythm',
      kind: 'rhythm',
      title: 'Timing & rhythm',
      evidence: `Your rhythm scores average ${Math.round(input.avgRhythm)}/100 — notes land early or late.`,
      severity: clamp(WEAK_SCORE - input.avgRhythm + 20, 0, 100),
      observations: input.skills[skill].exercisesCompleted,
      skill,
      activity: activityForSkill(catalog, skill),
    });
  }

  /* -- 6. relative skill gaps: the backstop ------------------------- *
   * Fires when the fine-grained signals are still too thin, so a newer
   * Premium user always sees something real rather than an empty screen.
   * ------------------------------------------------------------------ */
  const trained = (Object.keys(input.skills) as SkillId[]).filter((s) => input.skills[s].exercisesCompleted >= 3);
  if (trained.length >= 2) {
    const mean = trained.reduce((sum, s) => sum + input.skills[s].mastery, 0) / trained.length;
    for (const skill of trained) {
      const state = input.skills[skill];
      if (mean - state.mastery < SKILL_GAP) continue;
      spots.push({
        id: `skill:${skill}`,
        kind: 'skill',
        title: SKILL_LABELS[skill],
        evidence: `At ${state.mastery}/100 this trails your other skills, which average ${Math.round(mean)}.`,
        severity: clamp(mean - state.mastery, 0, 100),
        observations: state.exercisesCompleted,
        skill,
        activity: activityForSkill(catalog, skill),
      });
    }
  }

  return spots
    .sort((a, b) => b.severity - a.severity || b.observations - a.observations || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Register analysis                                                   *
 * ------------------------------------------------------------------ */

/** the MIDI floor a register weak spot refers to, parsed back from its id */
function registerFloor(spot: WeakSpot): number {
  const n = Number(spot.id.split(':')[1]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/**
 * Find the point in the voice above (or below) which accuracy measurably
 * drops — "pitch stability decreases above G4", stated only when the data
 * genuinely shows a split.
 *
 * Method: sort the sung notes, then for each candidate boundary compare
 * accuracy below it against accuracy above it. The boundary with the biggest
 * honest gap wins, provided both sides carry enough observations for the
 * comparison to mean anything.
 */
function findRegisterWeakness(
  byMidi: Record<number, Tally>,
  catalog: Activity[]
): WeakSpot | undefined {
  const entries = Object.entries(byMidi)
    .map(([k, t]) => ({ midi: Number(k), tally: t }))
    .filter((e) => Number.isFinite(e.midi))
    .sort((a, b) => a.midi - b.midi);

  const total = entries.reduce((sum, e) => sum + e.tally.count, 0);
  if (entries.length < 4 || total < MIN_REGISTER_OBS * 2) return undefined;

  const agg = (slice: typeof entries) =>
    slice.reduce(
      (acc, e) => ({
        count: acc.count + e.tally.count,
        perfect: acc.perfect + e.tally.perfect,
        centsSum: acc.centsSum + e.tally.centsSum,
      }),
      { count: 0, perfect: 0, centsSum: 0 }
    );

  let best: { boundary: number; gap: number; high: Tally; direction: 'above' | 'below' } | null = null;

  for (let i = 1; i < entries.length; i++) {
    const low = agg(entries.slice(0, i));
    const high = agg(entries.slice(i));
    if (low.count < MIN_REGISTER_OBS || high.count < MIN_REGISTER_OBS) continue;

    const upperGap = accuracy(low) - accuracy(high);
    const lowerGap = accuracy(high) - accuracy(low);
    if (upperGap > (best?.gap ?? 0)) {
      best = { boundary: entries[i].midi, gap: upperGap, high, direction: 'above' };
    }
    if (lowerGap > (best?.gap ?? 0)) {
      best = { boundary: entries[i - 1].midi, gap: lowerGap, high: low, direction: 'below' };
    }
  }

  // a small gap is just noise — only a clear split is worth naming
  if (!best || best.gap < 0.2) return undefined;

  const skill: SkillId = 'pitch-stability';
  const where = `${best.direction} ${midiName(best.boundary)}`;
  return {
    id: `register:${best.boundary}`,
    kind: 'register',
    title: best.direction === 'above' ? 'High register stability' : 'Low register control',
    evidence: `Your accuracy drops from ${Math.round(
      (accuracy(best.high) + best.gap) * 100
    )}% to ${Math.round(accuracy(best.high) * 100)}% ${where}, across ${best.high.count} notes.`,
    severity: clamp(best.gap * 120, 0, 100),
    observations: best.high.count,
    skill,
    activity: activityForSkill(catalog, skill),
  };
}

/* ------------------------------------------------------------------ *
 * History aggregation                                                 *
 * ------------------------------------------------------------------ */

/** the subset of a persisted session record the weak-spot engine reads */
export interface SessionLike {
  at: number;
  stability: number;
  rhythm: number;
  notes: Record<number, Tally>;
  notesByMidi?: Record<number, Tally>;
  intervals?: Record<string, Tally>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Only recent history counts. A tendency the singer fixed three months ago is
 * not a weak spot, and surfacing it as one destroys trust in the whole
 * feature — they *know* they fixed it.
 */
export const WEAK_SPOT_WINDOW_DAYS = 60;

function mergeTallies<K extends string | number>(
  into: Record<K, Tally>,
  from: Record<K, Tally> | undefined
): void {
  if (!from) return;
  for (const key of Object.keys(from) as K[]) {
    const src = from[key];
    const cur = into[key] ?? { centsSum: 0, count: 0, perfect: 0 };
    into[key] = {
      centsSum: cur.centsSum + src.centsSum,
      count: cur.count + src.count,
      perfect: cur.perfect + src.perfect,
    };
  }
}

/** Fold recent sessions into the aggregate buckets `findWeakSpots` consumes. */
export function aggregateHistory(
  sessions: SessionLike[],
  now: number = Date.now(),
  windowDays: number = WEAK_SPOT_WINDOW_DAYS
): Pick<WeakSpotInput, 'byMidi' | 'byInterval' | 'byPitchClass' | 'avgStability' | 'avgRhythm'> {
  const recent = sessions.filter((s) => now - s.at <= windowDays * DAY_MS);

  const byMidi: Record<number, Tally> = {};
  const byInterval: Record<string, Tally> = {};
  const byPitchClass: Record<number, Tally> = {};

  for (const s of recent) {
    mergeTallies(byMidi, s.notesByMidi);
    mergeTallies(byInterval, s.intervals);
    mergeTallies(byPitchClass, s.notes);
  }

  const avg = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

  return {
    byMidi,
    byInterval,
    byPitchClass,
    avgStability: avg(recent.map((s) => s.stability)),
    avgRhythm: avg(recent.map((s) => s.rhythm)),
  };
}
