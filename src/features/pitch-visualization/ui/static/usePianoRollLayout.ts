import { useMemo } from 'react';
import { midiToName, pitchClassOf } from '@/shared/lib/music';

type Target = { start: number; duration: number; midi: number };

const VERTICAL_PADDING_SEMITONES = 3;
const BLACK_KEY_PCS = new Set([1, 3, 6, 8, 10]);
/** room for the note names down the left edge */
export const LABEL_MARGIN = 32;
const BEATS_PER_BAR = 4;

/**
 * The piano roll's geometry for its size: every target (and `fitMidi`) on
 * screen with a little padding, a row per semitone, and the whole phrase
 * across the width — or, given `windowSec` and a phrase longer than that,
 * that many seconds of it across the width, the rest scrolling past
 * (`scrolls`; see `useScrollTransform`).
 *
 * Everything is in *phrase* time — the seconds the melody is authored in —
 * because that is what the playhead and trail carry (players report
 * `elapsed × rate`). The rate only sets how fast the playhead travels.
 */
export function usePianoRollLayout({ targets, fitMidi, width: W, height: H, bpm, windowSec }: {
  targets: Target[];
  fitMidi?: { low: number; high: number };
  width: number;
  height: number;
  bpm: number;
  /** the most phrase seconds shown across the width at once */
  windowSec?: number;
}) {
  const { lowMidi, highMidi, span, midCenter } = useMemo(() => {
    if (!targets.length) return { lowMidi: 54, highMidi: 66, span: 12, midCenter: 60 };
    const mids = targets.map((n) => n.midi);
    if (fitMidi) mids.push(fitMidi.low, fitMidi.high);
    const lo = Math.min(...mids) - VERTICAL_PADDING_SEMITONES;
    const span = Math.max(12, Math.max(...mids) + VERTICAL_PADDING_SEMITONES - lo);
    return { lowMidi: lo, highMidi: lo + span, span, midCenter: lo + span / 2 };
  }, [targets, fitMidi?.low, fitMidi?.high]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDuration = useMemo(() => (targets.length ? targets.reduce((end, n) => Math.max(end, n.start + n.duration), 0) : 1), [targets]);

  const scrolls = windowSec !== undefined && totalDuration > windowSec;
  const shownDuration = scrolls ? windowSec : totalDuration;

  const semiH = H > 0 ? H / span : 1;
  const usableW = W - LABEL_MARGIN - W * 0.03;
  const pxPerSec = usableW > 0 ? usableW / shownDuration : 1;
  const yOfMidi = (midi: number) => H / 2 - (midi - midCenter) * semiH;
  const xOfTime = (t: number) => LABEL_MARGIN + t * pxPerSec;

  const rows = useMemo(() => {
    if (!H || !W) return [];
    return Array.from({ length: highMidi - lowMidi + 1 }, (_, i) => {
      const midi = highMidi - i;
      const pc = pitchClassOf(midi);
      return { y: H / 2 - (midi - midCenter) * semiH - semiH / 2, height: semiH, isBlack: BLACK_KEY_PCS.has(pc), label: midiToName(midi, 'ascii'), isC: pc === 0 };
    });
  }, [H, W, lowMidi, highMidi, semiH, midCenter]);

  const beatLines = useMemo(() => {
    if (!W || !H) return [];
    const beatSec = 60 / bpm;
    return Array.from({ length: Math.floor(totalDuration / beatSec) + 1 }, (_, beat) => ({
      t: beat * beatSec,
      x: LABEL_MARGIN + beat * beatSec * pxPerSec,
      isBar: beat % BEATS_PER_BAR === 0,
    }));
  }, [W, H, bpm, pxPerSec, totalDuration]);

  // the layout's identity for caches built on it (the trail paths)
  const key = `${W}:${H}:${midCenter}:${semiH}:${pxPerSec}`;

  return { W, H, semiH, midCenter, pxPerSec, yOfMidi, xOfTime, rows, beatLines, key, scrolls, totalDuration, shownDuration };
}

export type PianoRollLayout = ReturnType<typeof usePianoRollLayout>;
