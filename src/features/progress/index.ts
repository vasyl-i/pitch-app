/** Persisted practice history and everything derived from it. */
export { useProgressStore } from './model/progressStore';
export type { SessionRecord, NoteTally } from './model/progressStore';
export {
  buildSessionRecord,
  buildAttemptRecord,
  tallyByPitchClass,
  starsForScore,
  phraseSeconds,
  elapsedPracticeSeconds,
} from './lib/record';
export type { AttemptSubject, AttemptScores, GradedNote, PhraseLike } from './lib/record';
export {
  isSungSession,
  singingAccuracy,
  LISTENING_ONLY_EXERCISE_IDS,
  noteHeatmap,
  totalStars,
  bestScores,
  isUnlocked,
  UNLOCK_THRESHOLDS,
  currentStreak,
  totalPracticeDays,
  totalPracticeSeconds,
  formatPracticeTime,
  formatTotalPracticeTime,
  practicedDayKeys,
  localDayKey,
  perfectExercises,
  todayExerciseStats,
} from './lib/stats';
export type { HeatmapEntry, PerfectExercise, TodayExerciseStat } from './lib/stats';
export { isoDay, isoDayStart, shiftDay, historyTotals, mergeHistories, allTimePracticeSeconds } from './lib/history';
export type { DayStats, DayHistory, HistoryTotals } from './lib/history';
export { bucketSeries, rangeStartDay, rangeTotal, BUCKET_DAYS, RANGE_DAYS } from './lib/series';
export type { Bucket, HistoryRange } from './lib/series';
export { RangeTabs } from './ui/history/RangeTabs';
export { HistoryLineChart } from './ui/history/HistoryLineChart';
export type { DayValue } from './ui/history/HistoryLineChart';
export { HistoryBarChart } from './ui/history/HistoryBarChart';
export { PracticeCalendar } from './ui/PracticeCalendar';

