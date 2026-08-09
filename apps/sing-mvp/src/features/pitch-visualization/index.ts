/**
 * Shared live-pitch UI: the piano keyboard, single-note staff, cents gauge
 * and confidence meter used anywhere the app shows "what am I singing right
 * now" outside of a fixed melody timeline (staff practice keeps its own
 * `StaffView` for that — it lays out a whole phrase across time, which these
 * components deliberately don't do).
 */
export { PitchKeyboard } from './ui/PitchKeyboard';
export { MiniStaff } from './ui/MiniStaff';
export { CentsGauge } from './ui/CentsGauge';
export { ConfidenceMeter } from './ui/ConfidenceMeter';

/**
 * Display stabilization — the UI-only half of the pitch path.
 *
 * It decides which note *name* to show and never alters a pitch value. Scoring,
 * note analysis, statistics and any future musical-intelligence module read the
 * raw detector output and must never be fed anything derived from here.
 */
export { createNoteStabilizer, DEFAULT_NOTE_HYSTERESIS_SEMITONES } from '@/shared/lib/noteStabilizer';
export type { NoteStabilizer } from '@/shared/lib/noteStabilizer';
export { useStabilizedNote } from './lib/useStabilizedNote';
