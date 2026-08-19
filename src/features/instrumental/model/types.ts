/** An imported backing track and what analysis has learned about it. */

export interface DetectedChord {
  /** seconds from the start of the track */
  start: number;
  end: number;
  /** pitch class 0–11 of the chord root */
  rootPc: number;
  quality: 'maj' | 'min';
}

export interface DetectedKey {
  /** e.g. "C major", "G minor" — same spelling `shared/lib/music` expects */
  keyName: string;
  /** chord timeline, empty until real analysis is wired up */
  chords: DetectedChord[];
}

export interface InstrumentalTrack {
  id: string;
  /** display name, from the picked file */
  filename: string;
  /** local file uri of the user-supplied instrumental */
  uri: string;
  createdAt: number;
  /** null while analysis hasn't completed */
  key: DetectedKey | null;
}
