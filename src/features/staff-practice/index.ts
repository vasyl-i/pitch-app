/** Staff-based melody practice: the session runtime and its renderer. */
export { useStaffSession } from './model/useStaffSession';
export { useStaffStore } from './model/staffStore';
export { StaffView } from './ui/StaffView';
export { LiveReadout } from './ui/LiveReadout';
export { PianoKeyboard } from './ui/PianoKeyboard';
export { MicGlow } from './ui/MicGlow';
// grading vocabulary now belongs to the exercise entity; re-exported so screens
// keep a single import for everything this practice mode needs
export { VERDICT_GLYPH, VERDICT_LABEL } from '@/entities/exercise';
export type { PhraseSummary, NoteResult, Verdict, AttemptComparison } from '@/entities/exercise';
