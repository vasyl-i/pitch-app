/**
 * The live pitch as the screen shows it, in Reanimated shared values: the
 * readout, the keyboard's sung key and the canvas's live dot read these on the
 * UI thread, so ~30 pitch updates a second cause no React render at all.
 *
 * Everything is formatted here, on the JS side, and each value is written only
 * when it changes — the note name and colour change a few times a second, not
 * thirty. Display only: nothing here is ever read back into grading.
 */
import { makeMutable } from 'react-native-reanimated';
import { createNoteStabilizer } from '@/shared/lib/noteStabilizer';
import { colorForCents, midiToFreq } from '@/shared/lib/music';
import { noteName } from '@/shared/lib/staff';
import { t } from '@/shared/i18n';

/** raw sung pitch; NaN while silent */
export const liveMidi = makeMutable(NaN);
/** the note held steady through small excursions (see noteStabilizer); -1 while silent */
export const shownNote = makeMutable(-1);
/** `shownNote`'s name, '—' while silent */
export const shownNoteText = makeMutable('—');
/** signed deviation from the target, e.g. '+12¢'; '' without a target */
export const centsText = makeMutable('');
/** the deviation's colour band */
export const centsColor = makeMutable(colorForCents(null));
/** e.g. '220 Hz'; '' while silent */
export const hzText = makeMutable('');

const stabilizer = createNoteStabilizer();

/** write only on change — every write is a hop to the UI thread */
function put<T>(sv: { value: T }, next: T) {
  if (sv.value !== next) sv.value = next;
}

export function publishLivePitch(midi: number | null, cents: number | null) {
  put(liveMidi, midi ?? NaN);
  const note = stabilizer.push(midi);
  put(shownNote, note ?? -1);
  put(shownNoteText, note === null ? '—' : noteName(note));
  put(centsText, cents === null ? '' : `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`);
  put(centsColor, colorForCents(cents));
  put(hzText, midi === null ? '' : t('pitch.hz', { value: Math.round(midiToFreq(midi)) }));
}

export function clearLivePitch() {
  stabilizer.reset();
  publishLivePitch(null, null);
}
