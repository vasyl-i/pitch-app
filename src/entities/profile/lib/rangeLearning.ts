/**
 * Smart range learning: notices when the singer has been comfortably
 * reaching notes outside their stored comfort range across several recent
 * *sittings* (not just one lucky note) and surfaces a suggestion to expand
 * it. Never updates the profile itself — `evaluateRangeSuggestion` only
 * returns a recommendation; something in the UI has to call
 * `useProfileStore.getState().setComfortRange(...)` after the user agrees.
 *
 * Decoupled from `entities/exercise`'s grading vocabulary on purpose: a
 * caller (any singing-exercise feature, not just staff practice) decides
 * whether a graded note counts as "comfortable" and passes just the MIDI
 * value and how much of the note was covered — entities shouldn't need to
 * import each other's domain types to talk to one another.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/shared/lib/storage';
import { useProfileStore } from '../model/profileStore';

interface Observation {
  midi: number;
  direction: 'low' | 'high';
  at: number;
}

interface Dismissal {
  direction: 'low' | 'high';
  /** the suggested edge that was dismissed — a stronger later suggestion isn't suppressed by it */
  upToMidi: number;
  at: number;
}

interface RangeObservationState {
  observations: Observation[];
  dismissals: Dismissal[];
  _push: (o: Observation) => void;
  _dismiss: (d: Dismissal) => void;
}

/** stop counting observations this old */
const OBSERVATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_OBSERVATIONS = 300;

export const useRangeObservationStore = create<RangeObservationState>()(
  persist(
    (set, get) => ({
      observations: [],
      dismissals: [],
      _push: (o) => {
        const cutoff = Date.now() - OBSERVATION_TTL_MS;
        const kept = get().observations.filter((x) => x.at >= cutoff);
        set({ observations: [...kept, o].slice(-MAX_OBSERVATIONS) });
      },
      _dismiss: (d) => {
        const others = get().dismissals.filter((x) => x.direction !== d.direction);
        set({ dismissals: [...others, d] });
      },
    }),
    { name: 'pitch-coach-range-observations', storage: createJSONStorage(() => mmkvStorage) }
  )
);

/** a note must cover at least this fraction of its duration to count as genuinely sustained */
const MIN_COVERAGE = 0.6;
/** how far past the current edge a note must land to count as "beyond" it */
const MARGIN_SEMITONES = 1;

/** Feed one graded, comfortably-sung note. Call only for notes that weren't 'wrong' or 'missed'. */
export function recordObservedNote(midi: number, coverage: number): void {
  if (coverage < MIN_COVERAGE) return;
  const profile = useProfileStore.getState().profile;
  if (!profile) return;

  const { comfortRange } = profile;
  const direction: 'low' | 'high' | null =
    midi <= comfortRange.lowMidi - MARGIN_SEMITONES ? 'low' : midi >= comfortRange.highMidi + MARGIN_SEMITONES ? 'high' : null;
  if (!direction) return;

  useRangeObservationStore.getState()._push({ midi, direction, at: Date.now() });
}

/** observations more than this far apart count as separate sittings */
const SESSION_GAP_MS = 60 * 60 * 1000;
/** need this many distinct sittings before suggesting anything */
const MIN_SESSIONS = 3;
/** don't re-ask about the same edge for two weeks after a "no thanks" */
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export interface RangeSuggestion {
  direction: 'low' | 'high';
  suggestedMidi: number;
  observedSessions: number;
}

function groupIntoSessions(observations: Observation[]): Observation[][] {
  const sorted = [...observations].sort((a, b) => a.at - b.at);
  const sessions: Observation[][] = [];
  let bucket: Observation[] = [];
  for (const o of sorted) {
    if (bucket.length && o.at - bucket[bucket.length - 1].at > SESSION_GAP_MS) {
      sessions.push(bucket);
      bucket = [];
    }
    bucket.push(o);
  }
  if (bucket.length) sessions.push(bucket);
  return sessions;
}

/**
 * Check both directions for a consistent, confirmable expansion. "Consistent"
 * means every recent sitting reached at least the suggested edge — the
 * per-sitting extreme that's *least* impressive, not the single best note
 * ever sung, so a suggestion reflects something the singer can reliably do
 * again rather than a one-off high note.
 */
export function evaluateRangeSuggestion(): RangeSuggestion | null {
  const { observations, dismissals } = useRangeObservationStore.getState();
  const now = Date.now();
  const fresh = observations.filter((o) => now - o.at <= OBSERVATION_TTL_MS);

  for (const direction of ['low', 'high'] as const) {
    const sessions = groupIntoSessions(fresh.filter((o) => o.direction === direction));
    if (sessions.length < MIN_SESSIONS) continue;

    const perSessionExtreme = sessions.map((s) =>
      direction === 'low' ? Math.min(...s.map((o) => o.midi)) : Math.max(...s.map((o) => o.midi))
    );
    const suggestedMidi = direction === 'low' ? Math.max(...perSessionExtreme) : Math.min(...perSessionExtreme);

    const dismissal = dismissals.find((d) => d.direction === direction);
    if (dismissal && dismissal.upToMidi === suggestedMidi && now - dismissal.at < DISMISS_COOLDOWN_MS) continue;

    return { direction, suggestedMidi, observedSessions: sessions.length };
  }
  return null;
}

export function dismissRangeSuggestion(direction: 'low' | 'high', upToMidi: number): void {
  useRangeObservationStore.getState()._dismiss({ direction, upToMidi, at: Date.now() });
}
