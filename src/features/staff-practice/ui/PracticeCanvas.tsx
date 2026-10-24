import type { ComponentProps } from 'react';
import { StaticPitchCanvas } from '@/features/pitch-visualization';
import { useStaffStore } from '../model/staffStore';
import { centsColor, liveMidi, shownNoteText } from '../model/livePitchDisplay';

/** stable across renders: the canvas reads these on the UI thread */
const LIVE = { midi: liveMidi, color: centsColor, noteText: shownNoteText };

type CanvasProps = ComponentProps<typeof StaticPitchCanvas>;

/**
 * Staff-practice's piano roll. The trail and playhead come from the session
 * store and re-render the canvas (not the whole screen around it) ~10 times a
 * second; the live pitch comes as shared values and re-renders nothing.
 */
export function PracticeCanvas(props: Omit<CanvasProps, 'trail' | 'live' | 'currentTime'>) {
  const trail = useStaffStore((s) => s.trail);
  const position = useStaffStore((s) => s.position);
  return <StaticPitchCanvas {...props} trail={trail} live={LIVE} currentTime={position} />;
}
