import { useRef } from 'react';

/**
 * The pitch at the canvas's vertical centre. It holds still while the voice
 * moves within the middle third of the view, then eases toward it, so a
 * small wobble doesn't shake the whole display.
 */
export function useVerticalFollow(liveMidi: number | null, visibleSemitones: number, initial = 60) {
  const centre = useRef(liveMidi ?? initial);
  if (liveMidi !== null) {
    const drift = liveMidi - centre.current;
    if (Math.abs(drift) > visibleSemitones / 3) centre.current += drift * 0.15;
  }
  return centre.current;
}
