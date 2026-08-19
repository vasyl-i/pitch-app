import { create } from 'zustand';
import type { AttemptComparison, NoteResult, PhraseSummary, Verdict } from '@/entities/exercise';

/**
 * A run is three stages of the same phrase, assistance falling away between
 * them:
 *
 *   loading → listen → accompanied → transition → listening → running → finished
 *                                                  └──────────────→ no-input
 *
 * `listen` sounds the reference and grades nothing — it is a demonstration,
 * fully animated so the singer can see where the notes sit. `accompanied` sounds it
 * again while the singer sings along and *is* graded. `transition` is the beat
 * of praise between the assisted and unaided attempts. `listening` is silent,
 * mic open, waiting for the singer — the phrase does not advance and no note is
 * highlighted until a real voice arrives. `running` is the unaided pass,
 * clocked from their first note. `no-input` is where a silent run ends: no
 * summary, no score, nothing recorded.
 */
export type StaffStatus =
  | 'idle'
  | 'loading'
  | 'listen'
  | 'accompanied'
  | 'transition'
  | 'listening'
  | 'running'
  | 'finished'
  | 'no-input'
  | 'error';

/** one sung-pitch sample for the overlay trail */
export interface SungSample {
  t: number;
  midi: number;
  /** signed cents vs the active target note, null when no target/rest */
  cents: number | null;
}

/**
 * The two halves of this state have two different owners, and the split is
 * load-bearing rather than cosmetic.
 *
 * `PlaybackState` is written only by a reference timeline: where the playhead
 * is, which target note is under it. It is what makes the demonstration legible
 * and it says nothing about the singer.
 *
 * `PitchState` is written only by microphone frames: the detected pitch, its
 * deviation, the trail, the verdicts. Nothing the app plays may ever appear
 * here.
 *
 * They meet on screen and nowhere else. Keeping them as separate setters means
 * a playback tick physically cannot clear a live pitch, and a mic frame cannot
 * move the playhead in a stage it doesn't clock.
 */
interface PlaybackState {
  position: number;
  positionUpdatedAt: number;
  /** index of the target note under the playhead, -1 if none */
  activeNote: number;
  /** MIDI of the target note under the playhead, null if none */
  currentTargetMidi: number | null;
}

interface PitchState {
  /** live sung pitch (smoothed), null while silent */
  liveMidi: number | null;
  liveCents: number | null;
  /** trailing sung samples for the overlay (~last 6s) */
  trail: SungSample[];
  /** live mic amplitude (AC-level RMS), 0 when silent */
  liveRms: number;
}

interface StaffState extends PlaybackState, PitchState {
  status: StaffStatus;
  errorMessage: string | null;
  /** verdict per target note as it's completed */
  noteResults: Record<number, NoteResult>;
  /** the most recently completed note's verdict, for the flash */
  lastVerdict: { noteIndex: number; verdict: Verdict } | null;
  /** score for the assisted pass, kept for the end-of-run comparison */
  accompaniedSummary: PhraseSummary | null;
  /**
   * Is the app's output currently inaudible to the mic (headphones)? Decides
   * whether the accompanied stage can actually *sound*, and lets the screen explain
   * itself when it can't.
   */
  outputIsolated: boolean;
  /** the unaided pass — the run's headline result */
  summary: PhraseSummary | null;
  comparison: AttemptComparison | null;

  setStatus: (status: StaffStatus) => void;
  setOutputIsolated: (isolated: boolean) => void;
  setError: (message: string) => void;
  /** playback pipeline only */
  setPlayback: (p: PlaybackState) => void;
  /** microphone pipeline only */
  setPitch: (p: PitchState) => void;
  addResult: (result: NoteResult) => void;
  setAccompaniedSummary: (summary: PhraseSummary) => void;
  setSummary: (summary: PhraseSummary, comparison: AttemptComparison | null) => void;
  /** wipe per-stage feedback but keep the run's earlier results */
  clearStageFeedback: () => void;
  reset: () => void;
}

const blankPlayback: PlaybackState = {
  position: 0,
  positionUpdatedAt: 0,
  activeNote: -1,
  currentTargetMidi: null,
};

const blankPitch: PitchState = {
  liveMidi: null,
  liveCents: null,
  trail: [],
  liveRms: 0,
};

const initial = {
  ...blankPlayback,
  ...blankPitch,
  status: 'idle' as StaffStatus,
  errorMessage: null,
  noteResults: {} as Record<number, NoteResult>,
  lastVerdict: null,
  accompaniedSummary: null,
  summary: null,
  comparison: null,
  outputIsolated: false,
};

export const useStaffStore = create<StaffState>((set) => ({
  ...initial,
  setStatus: (status) => set({ status }),
  setOutputIsolated: (outputIsolated) => set({ outputIsolated }),
  setError: (errorMessage) => set({ status: 'error', errorMessage }),
  setPlayback: (p) => set(p),
  setPitch: (p) => set(p),
  addResult: (result) =>
    set((s) => ({
      noteResults: { ...s.noteResults, [result.noteIndex]: result },
      lastVerdict: { noteIndex: result.noteIndex, verdict: result.verdict },
    })),
  setAccompaniedSummary: (accompaniedSummary) => set({ accompaniedSummary }),
  setSummary: (summary, comparison) => set({ summary, comparison, status: 'finished' }),
  // between stages the staff has to start clean — the assisted pass's verdicts
  // and trail must not sit under the unaided one, which is a fresh performance
  clearStageFeedback: () =>
    set({ ...blankPlayback, ...blankPitch, trail: [], noteResults: {}, lastVerdict: null }),
  // the audio route is a property of the device, not of the run — a restart
  // must not forget that headphones are plugged in
  reset: () => set((s) => ({ ...initial, noteResults: {}, trail: [], outputIsolated: s.outputIsolated })),
}));
