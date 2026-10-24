/** Staff-based melody practice: the session runtime and its renderer. */
export { cuesStartingNote, useStaffSession } from './model/useStaffSession';
export { useStaffStore } from './model/staffStore';
export { metronomeSupported, useHapticMetronome } from './model/useHapticMetronome';
export {
  directionFor,
  isPremiumSpeed,
  MAX_FREE_SPEED,
  SPEED_LEVELS,
  speedBpm,
  speedFor,
  useSpeedStore,
} from './model/speedStore';
export type { ScaleDirection, SpeedLevel } from './model/speedStore';
export { StaffView } from './ui/StaffView';
export { LiveReadout } from './ui/LiveReadout';
export { PianoKeyboard } from './ui/PianoKeyboard';
export { PracticeCanvas } from './ui/PracticeCanvas';
export { MicGlow } from './ui/MicGlow';
export { DirectionChips, SpeedChips } from './ui/TempoChips';
export { MetronomeButton } from './ui/MetronomeButton';
// grading vocabulary now belongs to the exercise entity; re-exported so screens
// keep a single import for everything this practice mode needs
export { VERDICT_GLYPH, VERDICT_LABEL } from '@/entities/exercise';
export type { PhraseSummary, NoteResult, Verdict, AttemptComparison } from '@/entities/exercise';
