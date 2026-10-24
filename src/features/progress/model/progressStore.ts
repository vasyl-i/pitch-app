/**
 * Persisted practice history — the basis for stars, weekly stats, the
 * sharp/flat heatmap, and exercise unlocks. Stored on-device only
 * (MMKV); nothing leaves the phone.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import { mergeHistories, recordInHistory, rollupSessions, type DayHistory } from '../lib/history';

/** signed cents tendency per pitch class, accumulated across sessions */
export interface NoteTally {
  /** sum of signed cents (positive = sharp) */
  centsSum: number;
  /** number of graded notes */
  count: number;
  perfect: number;
}

export interface SessionRecord {
  exerciseId: string;
  exerciseTitle: string;
  /** epoch ms */
  at: number;
  score: number;
  stars: number;
  avgCents: number;
  stability: number;
  rhythm: number;
  /** seconds of singing in this attempt (absent on records saved before this field existed) */
  durationSec?: number;
  /** per pitch class (0-11) tallies from this session */
  notes: Record<number, NoteTally>;

  /* ---- weak-spot signals ------------------------------------------- *
   * Both optional: records written before these fields existed have neither,
   * and only sources that can supply *true* MIDI pitches in melodic order
   * contribute (see `buildAttemptRecord`'s `melodicSequences`). Ear training's
   * single-target rounds store a pitch class in the note's `midi` slot, so
   * they are deliberately excluded — an octave-less value here would silently
   * invent a register.
   * ------------------------------------------------------------------ */

  /** per exact target MIDI note — the basis for register weak spots */
  notesByMidi?: Record<number, NoteTally>;
  /**
   * Per melodic interval, keyed by signed semitones as a string: `"-3"` is a
   * descending minor third, `"+7"` an ascending fifth. Attributed to how well
   * the singer landed the *second* note of the pair, which is what an interval
   * miss actually measures.
   */
  intervals?: Record<string, NoteTally>;
}

const MAX_SESSIONS = 500;

interface ProgressState {
  sessions: SessionRecord[];
  /** Running all-time total — survives the 500-session cap. */
  totalPracticeSec: number;
  /** a counter row per practiced day, kept forever — see `lib/history` */
  days: DayHistory;
  hydrated: boolean;
  addSession: (record: SessionRecord) => void;
  /** merge sessions from another device (newest first, capped), rolling their days in */
  importSessions: (records: SessionRecord[]) => void;
  /** merge day rows from another device */
  importDays: (days: DayHistory) => void;
  clear: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      sessions: [],
      totalPracticeSec: 0,
      days: {},
      hydrated: false,
      addSession: (record) =>
        set((s) => ({
          sessions: [record, ...s.sessions].slice(0, MAX_SESSIONS),
          totalPracticeSec: s.totalPracticeSec + (record.durationSec ?? 0),
          days: recordInHistory(s.days, record),
        })),
      importSessions: (records) =>
        set((s) => {
          const known = new Set(s.sessions.map((r) => r.at));
          const fresh = records.filter((r) => !known.has(r.at));
          if (fresh.length === 0) return s;
          const sessions = [...s.sessions, ...fresh].sort((a, b) => b.at - a.at).slice(0, MAX_SESSIONS);
          return { sessions, days: mergeHistories(s.days, rollupSessions(sessions)) };
        }),
      importDays: (days) => set((s) => ({ days: mergeHistories(s.days, days) })),
      clear: () => set({ sessions: [], totalPracticeSec: 0, days: {} }),
    }),
    {
      name: 'pitch-coach-progress',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      // v1 added the day history: seed it from the sessions still on hand
      migrate: (persisted, version) => {
        const p = persisted as Partial<ProgressState>;
        if (version < 1) p.days = rollupSessions(p.sessions ?? []);
        return p as ProgressState;
      },
      partialize: (s) => ({ sessions: s.sessions, totalPracticeSec: s.totalPracticeSec, days: s.days }) as ProgressState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          // Backfill: if totalPracticeSec is 0 but sessions exist, sum them up
          if (state.totalPracticeSec === 0 && state.sessions.length > 0) {
            state.totalPracticeSec = state.sessions.reduce(
              (sum, s) => sum + (s.durationSec ?? 0),
              0,
            );
          }
        }
      },
    }
  )
);
