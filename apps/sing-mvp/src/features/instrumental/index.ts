/** Singing with an uploaded instrumental: the track library, key detection, and key-based grading. */
export { useInstrumentalStore, FREE_INSTRUMENTAL_LIMIT } from './model/instrumentalStore';
export type { InstrumentalTrack, DetectedKey, DetectedChord } from './model/types';
export { detectKey } from './lib/detectKey';
export { gradePitch, keyPitchClasses, classifyCents } from './lib/grade';
export type { IntonationClass, IntonationVerdict } from './lib/grade';
export { createNoteAggregator, noteClass, scoreNotes } from './lib/notes';
export type { SungNote, FormingNote, NoteClass, NoteAggregator, TakeScore } from './lib/notes';
export { KeyTrailView, ACCURACY_COLOR } from './ui/KeyTrailView';
