/**
 * Persisted practice history — the basis for stars, weekly stats, the
 * sharp/flat heatmap, and exercise unlocks. Stored on-device only
 * (AsyncStorage); nothing leaves the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  hydrated: boolean;
  addSession: (record: SessionRecord) => void;
  clear: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      sessions: [],
      hydrated: false,
      addSession: (record) =>
        set((s) => ({ sessions: [record, ...s.sessions].slice(0, MAX_SESSIONS) })),
      clear: () => set({ sessions: [] }),
    }),
    {
      name: 'pitch-coach-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ sessions: s.sessions }) as ProgressState,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
