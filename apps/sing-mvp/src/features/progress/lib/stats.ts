/**
 * Derived progress statistics — pure functions over the session history.
 */
import { SHARP_PITCH_NAMES } from '@/shared/lib/music';
import type { NoteTally, SessionRecord } from '../model/progressStore';

export const PITCH_NAMES = SHARP_PITCH_NAMES;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklyStats {
  sessions: number;
  avgScore: number;
  avgCents: number;
  stars: number;
  /** change in average score vs the previous 7 days (null if no prior data) */
  scoreDelta: number | null;
  /** consecutive days practiced, ending today or yesterday */
  streak: number;
}

export function weeklyStats(sessions: SessionRecord[], now = Date.now()): WeeklyStats {
  const thisWeek = sessions.filter((s) => now - s.at < 7 * DAY_MS);
  const prevWeek = sessions.filter((s) => now - s.at >= 7 * DAY_MS && now - s.at < 14 * DAY_MS);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgScore = avg(thisWeek.map((s) => s.score));
  const prevAvg = prevWeek.length ? avg(prevWeek.map((s) => s.score)) : null;

  return {
    sessions: thisWeek.length,
    avgScore: Math.round(avgScore),
    avgCents: Math.round(avg(thisWeek.map((s) => s.avgCents))),
    stars: thisWeek.reduce((sum, s) => sum + s.stars, 0),
    scoreDelta: prevAvg === null ? null : Math.round(avgScore - prevAvg),
    streak: currentStreak(sessions, now),
  };
}

function dayIndex(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

export function currentStreak(sessions: SessionRecord[], now = Date.now()): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => dayIndex(s.at)));
  const today = dayIndex(now);
  // allow the streak to be "alive" if they practiced yesterday but not yet today
  let cursor = days.has(today) ? today : today - 1;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

export function totalStars(sessions: SessionRecord[]): number {
  return sessions.reduce((sum, s) => sum + s.stars, 0);
}

export interface PerfectExercise {
  exerciseId: string;
  title: string;
  bestScore: number;
  /** how many 3-star runs of this exercise */
  perfectRuns: number;
  /** epoch ms of the most recent perfect run */
  lastAt: number;
}

/** Exercises the singer has completed with a 3-star (perfect) run, most recent first. */
export function perfectExercises(sessions: SessionRecord[]): PerfectExercise[] {
  const byId = new Map<string, PerfectExercise>();
  for (const s of sessions) {
    if (s.stars < 3) continue;
    const cur = byId.get(s.exerciseId);
    if (cur) {
      cur.bestScore = Math.max(cur.bestScore, s.score);
      cur.perfectRuns += 1;
      cur.lastAt = Math.max(cur.lastAt, s.at);
    } else {
      byId.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        title: s.exerciseTitle,
        bestScore: s.score,
        perfectRuns: 1,
        lastAt: s.at,
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.lastAt - a.lastAt);
}

/**
 * Calendar-day key in the device's timezone ("2026-6-18" — month is 0-based).
 * Consistency and the practice calendar share this so they always agree.
 */
export function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** every local calendar day with at least one session */
export function practicedDayKeys(sessions: SessionRecord[]): Set<string> {
  return new Set(sessions.map((s) => localDayKey(s.at)));
}

/** total distinct days practiced, ever — consistency, not streak: missing a day doesn't reset it */
export function totalPracticeDays(sessions: SessionRecord[]): number {
  return practicedDayKeys(sessions).size;
}

/** total recorded singing time; records saved before durations existed count as 0 */
export function totalPracticeSeconds(sessions: SessionRecord[]): number {
  return sessions.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
}

export function formatPracticeTime(totalSec: number): string {
  const minutes = Math.round(totalSec / 60);
  if (minutes < 1) return totalSec > 0 ? '<1m' : '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export interface WeeklyAccuracyPoint {
  /** epoch ms of the start of this 7-day bucket */
  weekStart: number;
  /** null when nothing was practiced that week */
  avgScore: number | null;
  sessions: number;
}

/** Average score per 7-day bucket, oldest first; the last bucket ends now. */
export function weeklyAccuracyTrend(sessions: SessionRecord[], weeks = 8, now = Date.now()): WeeklyAccuracyPoint[] {
  const out: WeeklyAccuracyPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    const bucket = sessions.filter((s) => s.at > start && s.at <= end);
    out.push({
      weekStart: start,
      sessions: bucket.length,
      avgScore: bucket.length ? Math.round(bucket.reduce((sum, s) => sum + s.score, 0) / bucket.length) : null,
    });
  }
  return out;
}

/** best score achieved per exercise */
export function bestScores(sessions: SessionRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    out[s.exerciseId] = Math.max(out[s.exerciseId] ?? 0, s.score);
  }
  return out;
}

export interface HeatmapEntry {
  pitchClass: number;
  name: string;
  /** average signed cents (positive = sings sharp) */
  avgCents: number;
  count: number;
  accuracy: number; // 0..1 share of perfect notes
}

/** Which notes does this singer consistently sing sharp or flat? */
export function noteHeatmap(sessions: SessionRecord[], limitDays = 30, now = Date.now()): HeatmapEntry[] {
  const merged: Record<number, NoteTally> = {};
  for (const s of sessions) {
    if (now - s.at > limitDays * DAY_MS) continue;
    for (const [pcKey, tally] of Object.entries(s.notes)) {
      const pc = Number(pcKey);
      const cur = merged[pc] ?? { centsSum: 0, count: 0, perfect: 0 };
      merged[pc] = {
        centsSum: cur.centsSum + tally.centsSum,
        count: cur.count + tally.count,
        perfect: cur.perfect + tally.perfect,
      };
    }
  }
  return Object.entries(merged)
    .map(([pcKey, t]) => ({
      pitchClass: Number(pcKey),
      name: PITCH_NAMES[Number(pcKey)],
      avgCents: t.count ? t.centsSum / t.count : 0,
      count: t.count,
      accuracy: t.count ? t.perfect / t.count : 0,
    }))
    .filter((e) => e.count >= 3) // ignore notes with too little evidence
    .sort((a, b) => a.pitchClass - b.pitchClass);
}

/** most recent scores, oldest first, for the trend sparkline */
export function scoreTrend(sessions: SessionRecord[], limit = 12): number[] {
  return sessions.slice(0, limit).map((s) => s.score).reverse();
}

/** stars gate medium/hard exercises so difficulty ramps with skill */
export const UNLOCK_THRESHOLDS: Record<string, number> = { easy: 0, medium: 3, hard: 10 };

export function isUnlocked(difficulty: string, stars: number): boolean {
  return stars >= (UNLOCK_THRESHOLDS[difficulty] ?? 0);
}
