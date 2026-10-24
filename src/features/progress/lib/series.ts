/**
 * Time series for the history charts, cut from the day history. Ranges end
 * today and are counted in whole days; bars are rolling buckets ending today,
 * so the newest bar is exactly "the last 7 days" the Progress tab talks about.
 */
import { isoDay, shiftDay, type DayHistory, type DayStats } from './history';

export type HistoryRange = '4w' | '3m' | '6m' | '1y';
export const HISTORY_RANGES: HistoryRange[] = ['4w', '3m', '6m', '1y'];

export const RANGE_DAYS: Record<HistoryRange, number> = { '4w': 28, '3m': 91, '6m': 182, '1y': 364 };
/** a bar's width in days: weekly up to a quarter, then fortnights and 4-week months */
export const BUCKET_DAYS: Record<HistoryRange, number> = { '4w': 7, '3m': 7, '6m': 14, '1y': 28 };

export interface Bucket {
  /** first day in the bucket, `YYYY-MM-DD` */
  start: string;
  value: number;
}

/** the first day a range covers */
export function rangeStartDay(range: HistoryRange, now = Date.now()): string {
  return shiftDay(now, -(RANGE_DAYS[range] - 1));
}

/** per-bucket totals of `pick` over the range, oldest first */
export function bucketSeries(
  history: DayHistory,
  range: HistoryRange,
  pick: (row: DayStats) => number,
  now = Date.now(),
): Bucket[] {
  const size = BUCKET_DAYS[range];
  const count = RANGE_DAYS[range] / size;
  const buckets: Bucket[] = [];
  for (let b = count - 1; b >= 0; b--) {
    let value = 0;
    const start = shiftDay(now, -(b * size + size - 1));
    for (let d = 0; d < size; d++) {
      const row = history[shiftDay(now, -(b * size + d))];
      if (row) value += pick(row);
    }
    buckets.push({ start, value });
  }
  return buckets;
}

/** total of `pick` over the range */
export function rangeTotal(history: DayHistory, range: HistoryRange, pick: (row: DayStats) => number, now = Date.now()) {
  const from = rangeStartDay(range, now);
  const to = isoDay(now);
  return Object.values(history).reduce((sum, row) => (row.day >= from && row.day <= to ? sum + pick(row) : sum), 0);
}
