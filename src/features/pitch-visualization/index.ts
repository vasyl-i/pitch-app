/**
 * Shared live-pitch UI: the piano keyboard, the confidence meter, and the
 * piano-roll canvases — a scrolling one for open-ended singing (range
 * detection), a static one that lays a whole exercise out at once, and an
 * endless target-less one for the vocal monitor.
 */
export { PitchKeyboard } from './ui/PitchKeyboard';
export { ConfidenceMeter } from './ui/ConfidenceMeter';
export { ScrollingPitchCanvas } from './ui/scrolling/ScrollingPitchCanvas';
export { StaticPitchCanvas } from './ui/static/StaticPitchCanvas';
export { MonitorPitchCanvas } from './ui/monitor/MonitorPitchCanvas';
export type { LivePitchValues } from './ui/static/LiveDot';

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
export { usePitchTrail } from './lib/usePitchTrail';
