import { useMemo } from 'react';
import { midiToName } from '@/shared/lib/music';
import type { PianoRollLayout } from './usePianoRollLayout';

type Target = { start: number; duration: number; midi: number };

/**
 * Each target note's block, the one under `currentTime` marked active;
 * rebuilt only when that changes. With `visible` (a scrolling roll), only the
 * notes overlapping that stretch of phrase time are built — a whole song has
 * hundreds, and every block is a few Skia nodes.
 */
export function useTargetRects(targets: Target[], layout: PianoRollLayout, currentTime: number, visible?: { from: number; to: number }) {
  const activeIdx = targets.findIndex((n) => currentTime >= n.start && currentTime < n.start + n.duration);
  return useMemo(() => {
    if (!targets.length || !layout.W) return [];
    return targets.flatMap((note, i) => {
      if (visible && (note.start + note.duration < visible.from || note.start > visible.to)) return [];
      const x = layout.xOfTime(note.start);
      return [{
        x,
        width: layout.xOfTime(note.start + note.duration) - x,
        y: layout.yOfMidi(note.midi) - layout.semiH / 2,
        height: layout.semiH,
        label: midiToName(note.midi, 'ascii'),
        active: i === activeIdx,
      }];
    });
  }, [targets, layout.key, activeIdx, visible?.from, visible?.to]); // eslint-disable-line react-hooks/exhaustive-deps
}

export type TargetRect = ReturnType<typeof useTargetRects>[number];
