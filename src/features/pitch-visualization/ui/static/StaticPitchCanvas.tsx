import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Line, useFont, vec } from '@shopify/react-native-skia';
import { whiteAlpha } from '@/shared/theme';
import { useLinearTransform, usePhraseClock } from '../../lib/usePhraseClock';
import { usePianoRollLayout } from './usePianoRollLayout';
import { useTargetRects } from './useTargetRects';
import { useTrailPaths } from './useTrailPaths';
import { PianoRollGrid, TargetBlocks, TrailPaths } from './PianoRollLayers';
import { LiveDot, type LivePitchValues } from './LiveDot';

export type { LivePitchValues };

/**
 * Static (non-scrolling) piano roll for short melodies.
 *
 * The whole melody is on screen at once — fitted across the width and to its
 * pitches vertically — with a playhead sweeping across on the UI thread, the
 * sung trail drawn where it was sung, and the live pitch as a glowing dot.
 */
export function StaticPitchCanvas({ trail, live, currentTime, targets, rate = 1, bpm = 100, running = true, showNoteLabels = true, fitMidi }: {
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
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const layout = usePianoRollLayout({ targets, fitMidi, width: size.width, height: size.height, bpm });
  const rects = useTargetRects(targets, layout, currentTime);
  const paths = useTrailPaths(trail, layout);
  // the playhead advances `rate` phrase-seconds per second: x = left margin + t · pxPerSec
  const time = usePhraseClock({ currentTime, rate, running, ready: layout.W > 0 });
  const playhead = useLinearTransform(time, layout.xOfTime(0), layout.pxPerSec);
  const targetFont = useFont(require('../../../../../assets/fonts/Satoshi-Medium.ttf'), 11);
  const labelFont = useFont(require('../../../../../assets/fonts/Satoshi-Regular.ttf'), 9);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {layout.H > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <PianoRollGrid rows={layout.rows} beatLines={layout.beatLines} W={layout.W} H={layout.H} semiH={layout.semiH} font={labelFont} />
          <TargetBlocks rects={rects} font={targetFont} showLabels={showNoteLabels} />
          <TrailPaths paths={paths} />
          {running && (
            <Group transform={playhead}>
              <Line p1={vec(0, 0)} p2={vec(0, layout.H)} color={PLAYHEAD} strokeWidth={1.5} />
            </Group>
          )}
          <LiveDot live={live} transform={playhead} H={layout.H} midCenter={layout.midCenter} semiH={layout.semiH} />
        </Canvas>
      )}
    </View>
  );
}

const PLAYHEAD = whiteAlpha(0.3);

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
});
