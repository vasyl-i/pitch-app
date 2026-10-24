/**
 * Daily practice rollups — the permanent history behind the Progress tab's
 * all-time numbers and their charts.
 *
 * The session list is capped (500 records), so anything "all time" must not
 * be derived from it. Each local calendar day instead gets one small row of
 * counters, kept forever and synced to the backend (`daily_stats`). A row is
 * a pure function of that day's sessions, so any device holding the same
 * sessions computes the same row, and merging two copies is "keep the one
 * that saw more sessions".
 */
import type { SessionRecord } from '../model/progressStore';

export interface DayStats {
  /** local calendar day, `YYYY-MM-DD` */
  day: string;
  sessions: number;
  practiceSec: number;
  /** notes sung within the perfect tolerance */
  perfectNotes: number;
  /** every note that was graded (the denominator for perfect notes) */
  gradedNotes: number;
}

export type DayHistory = Record<string, DayStats>;

const pad = (n: number) => String(n).padStart(2, '0');

/** local calendar day as `YYYY-MM-DD` — sortable, and a Postgres `date` as is */
export function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** local midnight at the start of an `isoDay` */
export function isoDayStart(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** the `isoDay` `offset` calendar days from the one containing `ms` (DST-safe) */
export function shiftDay(ms: number, offset: number): string {
  const d = new Date(ms);
  return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime());
}

const emptyDay = (day: string): DayStats => ({ day, sessions: 0, practiceSec: 0, perfectNotes: 0, gradedNotes: 0 });

/** a day's counters with one more session folded in */
export function addToDay(stats: DayStats, session: SessionRecord): DayStats {
  let perfect = 0;
  let graded = 0;
  for (const tally of Object.values(session.notes)) {
    perfect += tally.perfect;
    graded += tally.count;
  }
  return {
    day: stats.day,
    sessions: stats.sessions + 1,
    practiceSec: stats.practiceSec + (session.durationSec ?? 0),
    perfectNotes: stats.perfectNotes + perfect,
    gradedNotes: stats.gradedNotes + graded,
  };
}

/** `history` with one session added to its day */
export function recordInHistory(history: DayHistory, session: SessionRecord): DayHistory {
  const day = isoDay(session.at);
  return { ...history, [day]: addToDay(history[day] ?? emptyDay(day), session) };
}

/** a row per day the sessions cover, built from scratch */
export function rollupSessions(sessions: SessionRecord[]): DayHistory {
  return sessions.reduce(recordInHistory, {});
}

/**
 * Two copies of the history combined day by day: the row that counted more
 * sessions wins, since rows only ever grow. A day trimmed by the session cap
 * recounts short and so never replaces the fuller row already kept.
 */
export function mergeHistories(a: DayHistory, b: DayHistory): DayHistory {
  const out: DayHistory = { ...a };
  for (const [day, row] of Object.entries(b)) {
    const cur = out[day];
    if (!cur || row.sessions > cur.sessions || (row.sessions === cur.sessions && row.practiceSec > cur.practiceSec)) {
      out[day] = row;
    }
  }
  return out;
}

export interface HistoryTotals {
  daysPracticed: number;
  practiceSec: number;
  perfectNotes: number;
}

export function historyTotals(history: DayHistory): HistoryTotals {
  const totals: HistoryTotals = { daysPracticed: 0, practiceSec: 0, perfectNotes: 0 };
  for (const row of Object.values(history)) {
    if (row.sessions > 0) totals.daysPracticed += 1;
    totals.practiceSec += row.practiceSec;
    totals.perfectNotes += row.perfectNotes;
  }
  return totals;
}

/**
 * All-time practice seconds. The running total also holds time from sessions
 * synced before the day history existed; the day history holds sessions
 * merged in from other devices — so the larger of the two is the truth.
 */
export function allTimePracticeSeconds(totalPracticeSec: number, history: DayHistory): number {
  return Math.max(totalPracticeSec, historyTotals(history).practiceSec);
}
