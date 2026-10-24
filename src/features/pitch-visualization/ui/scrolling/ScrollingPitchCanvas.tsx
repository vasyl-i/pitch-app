import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { whiteAlpha } from '@/shared/theme';
import { useLinearTransform, usePhraseClock } from '../../lib/usePhraseClock';
import { useVerticalFollow } from './useVerticalFollow';
import { LiveHeadMarker } from './LiveHeadMarker';

interface PitchSample {
  t: number;
  midi: number;
}

const VISIBLE_SECONDS = 4;
const VISIBLE_SEMITONES = 16;
const GRID_ROWS = 6;
/** a gap longer than this in the samples breaks the line */
const MAX_JOIN_SEC = 0.25;
const GRID_COLOR = whiteAlpha(0.1);

/**
 * Smooth-scrolling pitch trail for open-ended singing (range detection):
 * the voice's path drawn left of a fixed "now" at the centre, the view
 * following the voice up and down.
 *
 * Everything that scrolls sits at absolute x (`t * pxPerSec`) inside one
 * group whose translateX comes from the UI-thread clock (`usePhraseClock`) —
 * the path only rebuilds when the data changes and the scroll never pauses.
 */
export function ScrollingPitchCanvas({ trail, liveMidi, currentTime, running = true, visibleSeconds = VISIBLE_SECONDS, trailColor, liveFrequency }: {
  trail: PitchSample[];
  liveMidi: number | null;
  currentTime: number;
  running?: boolean;
  visibleSeconds?: number;
  /** the trail and dot colour */
  trailColor: string;
  /** shown in Hz beside the note name when given */
  liveFrequency?: number | null;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const { width: W, height: H } = size;
  const centre = useVerticalFollow(liveMidi, VISIBLE_SEMITONES);
  const semiH = H / VISIBLE_SEMITONES;
  const pxPerSec = W > 0 ? W / visibleSeconds : 1;
  const nowX = W / 2;
  const yOf = (midi: number) => H / 2 - (midi - centre) * semiH;
  // "now" sits at the centre: x = nowX − t · pxPerSec
  const scroll = useLinearTransform(usePhraseClock({ currentTime, running, ready: W > 0 }), nowX, -pxPerSec);

  // horizontal lines slide with the vertical follow, a sub-pixel offset per semitone
  const hLines = useMemo(() => {
    if (!H) return [];
    const step = H / GRID_ROWS;
    const offset = (((centre * semiH) % step) + step) % step;
    return Array.from({ length: GRID_ROWS + 3 }, (_, i) => (i - 1) * step + offset);
  }, [H, centre, semiH]);

  // vertical lines at absolute x across a wide window, rebuilt only when the
  // view has scrolled a whole screen (not on every trail flush)
  const bucket = Math.floor(currentTime / visibleSeconds);
  const vLines = useMemo(() => {
    if (!W || !H) return [];
    const stepSec = H / GRID_ROWS / pxPerSec;
    const centreT = bucket * visibleSeconds;
    const out: number[] = [];
    for (let t = Math.ceil((centreT - visibleSeconds * 2.5) / stepSec) * stepSec; t <= centreT + visibleSeconds * 3.5; t += stepSec) out.push(t * pxPerSec);
    return out;
  }, [W, H, bucket, visibleSeconds, pxPerSec]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    if (!H || !W) return p;
    const leftT = (trail.length > 0 ? trail[trail.length - 1].t : currentTime) - visibleSeconds * 3;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (b.t - a.t > MAX_JOIN_SEC || (a.t < leftT && b.t < leftT)) continue;
      p.moveTo(a.t * pxPerSec, yOf(a.midi));
      p.lineTo(b.t * pxPerSec, yOf(b.midi));
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, H, W, centre, semiH, pxPerSec, visibleSeconds]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {H > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {hLines.map((y, i) => (
            <Line key={`h${i}`} p1={vec(0, y)} p2={vec(W, y)} color={GRID_COLOR} strokeWidth={0.5} />
          ))}
          <Group clip={Skia.XYWHRect(0, 0, W, H)}>
            <Group transform={scroll}>
              {vLines.map((x, i) => (
                <Line key={`v${i}`} p1={vec(x, 0)} p2={vec(x, H)} color={GRID_COLOR} strokeWidth={0.5} />
              ))}
              <Path path={path} color={trailColor} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            </Group>
          </Group>
          {liveMidi !== null && <LiveHeadMarker x={nowX} y={yOf(liveMidi)} midi={liveMidi} color={trailColor} frequency={liveFrequency} />}
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
});
