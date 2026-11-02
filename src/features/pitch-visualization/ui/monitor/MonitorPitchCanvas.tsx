import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Line, Skia, useFont, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { midiToName, pitchClassOf } from '@/shared/lib/music';
import { whiteAlpha } from '@/shared/theme';
import { useLinearTransform, usePhraseClock } from '../../lib/usePhraseClock';
import { LABEL_MARGIN, type PianoRollLayout } from '../static/usePianoRollLayout';
import { PianoRollGrid, TrailPaths } from '../static/PianoRollLayers';
import { LiveDot, type LivePitchValues } from '../static/LiveDot';
import { bandOf, emptyPaths } from '../static/useTrailPaths';

interface PitchSample {
  t: number;
  midi: number;
  cents: number | null;
}

/** the piano roll spans A1–E6; the view shows a window of it */
const LOW_MIDI = 33;
const HIGH_MIDI = 88;
const VISIBLE_SEMITONES = 18;
/** where the live dot sits across the plot: right of centre, clear of the edge */
const NOW_FRACTION = 0.72;
/** a gap longer than this in the samples breaks the line */
const MAX_JOIN_SEC = 0.25;
const TIME_LINE = whiteAlpha(0.07);
const NO_BEATS: PianoRollLayout['beatLines'] = [];
const BLACK_KEY_PCS = new Set([1, 3, 6, 8, 10]);

/**
 * An endless piano roll for free singing: no targets, no playhead. The grid
 * scrolls left under a live dot that stays put on the right, leaving the sung
 * pitch behind it as a tail coloured by accuracy.
 *
 * Time and vertical follow run on the UI thread (`usePhraseClock`, a timed
 * shared value); only the tail rebuilds with React state, and it is bounded
 * to the last `visibleSeconds`, so the canvas never grows.
 */
export function MonitorPitchCanvas({ trail, live, currentTime, running, visibleSeconds }: {
  trail: PitchSample[];
  live: LivePitchValues;
  currentTime: number;
  running: boolean;
  visibleSeconds: number;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const { width: W, height: H } = size;
  const semiH = H > 0 ? H / VISIBLE_SEMITONES : 1;
  const plotW = Math.max(1, W - LABEL_MARGIN);
  const pxPerSec = plotW / visibleSeconds;
  const nowX = LABEL_MARGIN + plotW * NOW_FRACTION;
  const worldY = (midi: number) => (HIGH_MIDI - midi) * semiH;

  // the pitch at the vertical centre: holds while the voice stays in the middle third, then glides to it
  const centre = useSharedValue(60);
  const centreTarget = useSharedValue(60);
  useAnimatedReaction(
    () => live.midi.value,
    (m) => {
      if (Number.isNaN(m) || Math.abs(m - centreTarget.value) <= VISIBLE_SEMITONES / 3) return;
      const next = Math.min(HIGH_MIDI - VISIBLE_SEMITONES / 2, Math.max(LOW_MIDI + VISIBLE_SEMITONES / 2, Math.round(m)));
      centreTarget.value = next;
      centre.value = withTiming(next, { duration: 600 });
    },
  );

  const time = usePhraseClock({ currentTime, running, ready: W > 0 });
  const scroll = useLinearTransform(time, nowX, -pxPerSec);
  const slideY = useDerivedValue(() => [{ translateY: H / 2 - (HIGH_MIDI - centre.value) * semiH }], [H, semiH]);
  const world = useDerivedValue(() => [{ translateX: scroll.value[0].translateX }, { translateY: slideY.value[0].translateY }]);
  const dotX = useDerivedValue(() => [{ translateX: nowX }], [nowX]);

  const rows = useMemo(() => {
    if (!H) return [];
    return Array.from({ length: HIGH_MIDI - LOW_MIDI + 1 }, (_, i) => {
      const midi = HIGH_MIDI - i;
      const pc = pitchClassOf(midi);
      return { y: (HIGH_MIDI - midi) * semiH - semiH / 2, height: semiH, isBlack: BLACK_KEY_PCS.has(pc), label: midiToName(midi, 'ascii'), isC: pc === 0 };
    });
  }, [H, semiH]);

  // a line per second at absolute x, rebuilt only once the view has moved a whole screen on
  const bucket = Math.floor(currentTime / visibleSeconds);
  const timeLines = useMemo(() => {
    const out: number[] = [];
    for (let t = (bucket - 1) * visibleSeconds; t <= (bucket + 2) * visibleSeconds; t++) out.push(t * pxPerSec);
    return out;
  }, [bucket, visibleSeconds, pxPerSec]);

  const paths = useMemo(() => {
    const p = emptyPaths();
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (b.t - a.t > MAX_JOIN_SEC) continue;
      const band = bandOf(p, b.cents);
      band.moveTo(a.t * pxPerSec, worldY(a.midi));
      band.lineTo(b.t * pxPerSec, worldY(b.midi));
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, pxPerSec, semiH]);

  const labelFont = useFont(require('../../../../../assets/fonts/Satoshi-Regular.ttf'), 9);
  const rollTop = -semiH;
  const rollBottom = (HIGH_MIDI - LOW_MIDI + 1) * semiH;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {H > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={slideY}>
            <PianoRollGrid rows={rows} beatLines={NO_BEATS} W={W} H={H} semiH={semiH} font={labelFont} />
          </Group>
          <Group clip={Skia.XYWHRect(LABEL_MARGIN, 0, plotW, H)}>
            <Group transform={world}>
              {timeLines.map((x) => (
                <Line key={x} p1={vec(x, rollTop)} p2={vec(x, rollBottom)} color={TIME_LINE} strokeWidth={0.5} />
              ))}
              <TrailPaths paths={paths} />
            </Group>
          </Group>
          <LiveDot live={live} transform={dotX} H={H} midCenter={centre} semiH={semiH} />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
});
