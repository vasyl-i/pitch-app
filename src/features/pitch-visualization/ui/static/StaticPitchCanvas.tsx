import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Line, rect, useFont, vec } from '@shopify/react-native-skia';
import { whiteAlpha } from '@/shared/theme';
import { useLinearTransform, usePhraseClock, useScrollTransform } from '../../lib/usePhraseClock';
import { LABEL_MARGIN, usePianoRollLayout } from './usePianoRollLayout';
import { useTargetRects } from './useTargetRects';
import { useTrailPaths } from './useTrailPaths';
import { BeatLines, PianoRollGrid, TargetBlocks, TrailPaths } from './PianoRollLayers';
import { LiveDot, type LivePitchValues } from './LiveDot';

export type { LivePitchValues };

/**
 * Piano roll for an exercise's melody.
 *
 * A short melody is on screen at once — fitted across the width and to its
 * pitches vertically — with a playhead sweeping across on the UI thread, the
 * sung trail drawn where it was sung, and the live pitch as a glowing dot.
 * One longer than `windowSec` (a whole song) shows that much of itself and
 * scrolls, on the UI thread too, keeping the playhead a little way in; the
 * pitch labels down the left stay put.
 */
export function StaticPitchCanvas({ trail, live, currentTime, targets, rate = 1, bpm = 100, running = true, showNoteLabels = true, fitMidi, windowSec }: {
  trail: { t: number; midi: number; cents: number | null }[];
  live: LivePitchValues;
  currentTime: number;
  targets: { start: number; duration: number; midi: number }[];
  rate?: number;
  bpm?: number;
  running?: boolean;
  showNoteLabels?: boolean;
  /**
   * Pitches the vertical axis must cover besides the targets. Pin it across
   * runs of one pattern in different keys (a scale climbing a semitone per
   * round): fitted to the targets alone, every key would look identical.
   */
  fitMidi?: { low: number; high: number };
  /** the most phrase seconds shown at once; a longer melody scrolls */
  windowSec?: number;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const layout = usePianoRollLayout({ targets, fitMidi, width: size.width, height: size.height, bpm, windowSec });
  // a scrolling roll builds only what is near the playhead, in steps of half
  // a window so the set changes a few times a window, not every frame
  const page = layout.scrolls ? Math.floor(Math.max(currentTime, 0) / (layout.shownDuration / 2)) : 0;
  const visible = useMemo(() => {
    if (!layout.scrolls) return undefined;
    const half = layout.shownDuration / 2;
    return { from: (page - 2) * half, to: (page + 3) * half };
  }, [layout.scrolls, layout.shownDuration, page]);
  const rects = useTargetRects(targets, layout, currentTime, visible);
  const beatLines = useMemo(
    () => (visible ? layout.beatLines.filter((b) => b.t >= visible.from && b.t <= visible.to) : layout.beatLines),
    [layout.beatLines, visible],
  );
  const paths = useTrailPaths(trail, layout);
  // the playhead advances `rate` phrase-seconds per second: x = left margin + t · pxPerSec
  const time = usePhraseClock({ currentTime, rate, running, ready: layout.W > 0 });
  const playhead = useLinearTransform(time, layout.xOfTime(0), layout.pxPerSec);
  const scroll = useScrollTransform(time, {
    scrolls: layout.scrolls,
    totalSec: layout.totalDuration,
    shownSec: layout.shownDuration,
    pxPerSec: layout.pxPerSec,
  });
  const targetFont = useFont(require('../../../../../assets/fonts/Satoshi-Medium.ttf'), 11);
  const labelFont = useFont(require('../../../../../assets/fonts/Satoshi-Regular.ttf'), 9);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {layout.H > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <PianoRollGrid rows={layout.rows} beatLines={NO_BEATS} W={layout.W} H={layout.H} semiH={layout.semiH} font={labelFont} />
          {/* everything on the time axis moves together; a scrolling roll is
              clipped so notes passing out never draw over the labels (a fitted
              one isn't, so the live dot's glow can spill at the very start) */}
          <Group clip={layout.scrolls ? rect(LABEL_MARGIN, 0, layout.W - LABEL_MARGIN, layout.H) : undefined}>
            <Group transform={scroll}>
              <BeatLines beatLines={beatLines} H={layout.H} />
              <TargetBlocks rects={rects} font={targetFont} showLabels={showNoteLabels} />
              <TrailPaths paths={paths} />
              {running && (
                <Group transform={playhead}>
                  <Line p1={vec(0, 0)} p2={vec(0, layout.H)} color={PLAYHEAD} strokeWidth={1.5} />
                </Group>
              )}
              <LiveDot live={live} transform={playhead} H={layout.H} midCenter={layout.midCenter} semiH={layout.semiH} />
            </Group>
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const PLAYHEAD = whiteAlpha(0.3);
const NO_BEATS: never[] = [];

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
});
