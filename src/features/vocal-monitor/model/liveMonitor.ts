/**
 * The monitor's live pitch in Reanimated shared values, read on the UI thread
 * by the canvas's dot — ~30 pitch updates a second cause no React render.
 * Display only; each value is written only when it changes.
 */
import { makeMutable } from 'react-native-reanimated';
import { colorForCents, midiToName } from '@/shared/lib/music';
import { createNoteStabilizer } from '@/shared/lib/noteStabilizer';

/** raw sung pitch; NaN while silent */
export const liveMidi = makeMutable(NaN);
/** the deviation's colour band */
export const liveColor = makeMutable(colorForCents(null));
/** the steadied note's name, '—' while silent */
export const liveNoteText = makeMutable('—');

export const LIVE = { midi: liveMidi, color: liveColor, noteText: liveNoteText };

const stabilizer = createNoteStabilizer();

function put<T>(sv: { value: T }, next: T) {
  if (sv.value !== next) sv.value = next;
}

/** publishes the frame and returns the steadied note (null while silent) */
export function publishLive(midi: number | null, cents: number | null): number | null {
  const note = stabilizer.push(midi);
  put(liveMidi, midi ?? NaN);
  put(liveColor, colorForCents(cents));
  put(liveNoteText, note === null ? '—' : midiToName(note, 'ascii'));
  return note;
}

export function clearLive() {
  stabilizer.reset();
  publishLive(null, null);
}
