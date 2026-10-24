import { useMemo } from 'react';
import { midiToName } from '@/shared/lib/music';
import type { PianoRollLayout } from './usePianoRollLayout';

type Target = { start: number; duration: number; midi: number };

/** each target note's block, the one under `currentTime` marked active; rebuilt only when that changes */
export function useTargetRects(targets: Target[], layout: PianoRollLayout, currentTime: number) {
  const activeIdx = targets.findIndex((n) => currentTime >= n.start && currentTime < n.start + n.duration);
  return useMemo(() => {
    if (!targets.length || !layout.W) return [];
    return targets.map((note, i) => {
      const x = layout.xOfTime(note.start);
      return {
        x,
        width: layout.xOfTime(note.start + note.duration) - x,
        y: layout.yOfMidi(note.midi) - layout.semiH / 2,
        height: layout.semiH,
        label: midiToName(note.midi, 'ascii'),
        active: i === activeIdx,
      };
    });
  }, [targets, layout.key, activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps
}

export type TargetRect = ReturnType<typeof useTargetRects>[number];
