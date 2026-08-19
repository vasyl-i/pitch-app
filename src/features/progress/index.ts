/** Persisted practice history and everything derived from it. */
export { useProgressStore } from './model/progressStore';
export type { SessionRecord, NoteTally } from './model/progressStore';
export { buildSessionRecord, buildAttemptRecord, tallyByPitchClass, starsForScore, phraseSeconds } from './lib/record';
export type { AttemptSubject, AttemptScores, GradedNote, PhraseLike } from './lib/record';
export {
  weeklyStats,
  noteHeatmap,
  scoreTrend,
  totalStars,
  bestScores,
  isUnlocked,
  UNLOCK_THRESHOLDS,
  currentStreak,
  totalPracticeDays,
  totalPracticeSeconds,
  formatPracticeTime,
  practicedDayKeys,
  localDayKey,
  weeklyAccuracyTrend,
  perfectExercises,
} from './lib/stats';
export type { WeeklyStats, HeatmapEntry, WeeklyAccuracyPoint, PerfectExercise } from './lib/stats';
export { NoteHeatmap } from './ui/NoteHeatmap';
export { TrendSparkline } from './ui/TrendSparkline';
export { WeeklyAccuracyChart } from './ui/WeeklyAccuracyChart';
export { PracticeCalendar } from './ui/PracticeCalendar';
