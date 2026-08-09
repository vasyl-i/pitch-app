import { PitchKeyboard } from '@/features/pitch-visualization';
import { useStaffStore } from '../model/staffStore';

/** Staff-practice's keyboard: reads the session store and hands it to the shared, props-driven PitchKeyboard. */
export function PianoKeyboard({ lowMidi, highMidi }: { lowMidi: number; highMidi: number }) {
  const activeNote = useStaffStore((s) => s.activeNote);
  const targetMidi = useStaffStore((s) => s.currentTargetMidi);
  const liveMidi = useStaffStore((s) => s.liveMidi);

  return <PitchKeyboard lowMidi={lowMidi} highMidi={highMidi} liveMidi={liveMidi} targetMidi={activeNote >= 0 ? targetMidi : null} />;
}
