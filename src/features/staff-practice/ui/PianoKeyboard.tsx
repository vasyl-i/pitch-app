import { PitchKeyboard } from '@/features/pitch-visualization';
import { useStaffStore } from '../model/staffStore';
import { shownNote } from '../model/livePitchDisplay';

/** Staff-practice's keyboard: reads the session store and hands it to the shared, props-driven PitchKeyboard. */
export function PianoKeyboard({ lowMidi, highMidi }: { lowMidi: number; highMidi: number }) {
  const activeNote = useStaffStore((s) => s.activeNote);
  const targetMidi = useStaffStore((s) => s.currentTargetMidi);

  // the sung key follows a shared value — a live pitch never re-renders this
  return <PitchKeyboard lowMidi={lowMidi} highMidi={highMidi} sungNote={shownNote} targetMidi={activeNote >= 0 ? targetMidi : null} />;
}
