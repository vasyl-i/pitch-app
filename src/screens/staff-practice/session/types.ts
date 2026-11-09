import type { Exercise } from '@/entities/exercise';
import type { ScaleDirection, SpeedLevel } from '@/features/staff-practice';
import type { RootScreenProps } from '@/app/navigation/types';

export interface StaffSessionProps {
  navigation: RootScreenProps<'MelodyPractice'>['navigation'];
  guided: boolean;
  /** the whole song, sung along once from start to end (see `singAlongOnly`) */
  whole: boolean;
  exercise: Exercise;
  /** semitones this round is moved from the authored key */
  shift: number;
  /** this round (0-based) and how many there are */
  round: number;
  rounds: number;
  /** rounds continue until the singer leaves (a scale or arpeggio from the library) */
  endless: boolean;
  /** how this round's key moved from the last one, e.g. "A semitone lower" */
  keyChange: string | null;
  /** the whole climb's pitch span, for a display that holds still across keys */
  ladderSpan: { low: number; high: number } | undefined;
  onRoundDone: () => void;
  onRoundRecorded: () => void;
  rate: SpeedLevel;
  setRate: (r: SpeedLevel) => void;
  /** the key sweep's direction, null when this run doesn't sweep */
  direction: ScaleDirection | null;
  setDirection: (d: ScaleDirection) => void;
  premium: boolean;
  onLockedSpeed: () => void;
  loop: boolean;
  showHz: boolean;
}
