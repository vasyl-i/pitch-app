import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Line, Path, Rect, RoundedRect, Skia, Text as SkiaText, useFont, useClock, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { colorForCents, midiToName, NOTICEABLE_CENTS, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import { useStabilizedNote } from '../lib/useStabilizedNote';

interface PitchSample {
  t: number;
  midi: number;
  cents: number | null;
}

const VISIBLE_SECONDS = 4;
const VISIBLE_SEMITONES = 16;

const LIME = '#C8DA59';
const YELLOW = '#e8c97a';
const ORANGE = '#f0954a';
const RED = '#ff6d5c';
const GRAY = 'rgba(255,255,255,0.4)';
const GRID_COLOR = 'rgba(255,255,255,0.10)';

interface ScrollingPitchCanvasProps {
  trail: PitchSample[];
  liveMidi: number | null;
  liveCents: number | null;
  targetMidi: number | null;
  currentTime: number;
  positionUpdatedAt?: number;
  running?: boolean;
  visibleSeconds?: number;
  targets?: { start: number; duration: number; midi: number }[];
  rate?: number;
  trailColor?: string;
  /** Show a vertical playback-position line on the left side of the canvas. */
  showPlayhead?: boolean;
  /** Show note name labels on each target note block. */
  showNoteLabels?: boolean;
}

/**
 * Smooth-scrolling pitch canvas — absolute-position architecture.
 *
 * All trail segments, targets, and grid lines are placed at *absolute* pixel
 * coordinates (`x = t * pxPerSec`). A single `Group` translateX slides the
 * viewport so that "now" sits at the dotX marker. The translateX is derived
 * purely from the Skia clock on the UI thread — no anchors, no resets, no
 * cross-thread shared-value writes on path rebuild.
 *
 * Result: paths only rebuild when data changes, scrolling never pauses (the
 * clock always ticks), and there's zero jerk because the scroll value is
 * never touched by the JS thread during normal operation.
 */
export function ScrollingPitchCanvas({
  trail,
  liveMidi,
  liveCents,
  targetMidi,
  currentTime,
  positionUpdatedAt = 0,
  running = true,
  visibleSeconds = VISIBLE_SECONDS,
  targets,
  rate = 1,
  trailColor,
  showPlayhead = false,
  showNoteLabels = false,
}: ScrollingPitchCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const handleLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // Seed the vertical center from the exercise's note range so target blocks
  // render at the right y from the very first frame — before any note is active
  // under the playhead.  Without this, centerRef defaults to 60 (middle C) and
  // notes flash at the wrong vertical position during the lead-in.
  const targetsCenter = targets?.length
    ? (Math.min(...targets.map((n) => n.midi)) + Math.max(...targets.map((n) => n.midi))) / 2
    : null;
  const centerRef = useRef(targetMidi ?? targetsCenter ?? liveMidi ?? 60);
  const prevTarget = useRef(targetMidi);

  if (targetMidi !== null && targetMidi !== prevTarget.current) {
    centerRef.current = targetMidi;
    prevTarget.current = targetMidi;
  } else if (targetMidi === null && liveMidi !== null) {
    const drift = liveMidi - centerRef.current;
    if (Math.abs(drift) > VISIBLE_SEMITONES / 3) {
      centerRef.current += drift * 0.15;
    }
  }

  const yCenter = centerRef.current;
  const contentHeight = size.height;
  const semiH = contentHeight / VISIBLE_SEMITONES;
  const W = size.width;
  const dotX = W * (showPlayhead ? 0.25 : 0.8);
  const pxPerSec = W > 0 ? W / visibleSeconds : 1;

  const yOfMidi = (midi: number) => {
    const offset = midi - yCenter;
    return contentHeight / 2 - offset * semiH;
  };

  // ---- Clock-to-trail-time mapping ----
  //
  // The Skia clock counts ms since mount. Trail samples use seconds since
  // `usePitchTrail` started. We need a one-time offset to map between them.
  // This offset is set once on first meaningful render, and only re-set on
  // time jumps (audio seek). Writing it to a shared value is safe because
  // it rarely changes — the 1-frame sync delay is imperceptible since both
  // currentTime and clock.value have the same ~16ms staleness.
  const clock = useClock();
  const clockOffsetSec = useSharedValue(0);
  const offsetInit = useRef(false);
  const prevCT = useRef(currentTime);

  if (!offsetInit.current && W > 0 && running) {
    clockOffsetSec.value = currentTime - clock.value / 1000;
    offsetInit.current = true;
  } else if (offsetInit.current && Math.abs(currentTime - prevCT.current) > 0.5) {
    // Time jump (audio seek) — re-sync
    clockOffsetSec.value = currentTime - clock.value / 1000;
  }
  prevCT.current = currentTime;

  // Shared values for the UI-thread worklet.
  // IMPORTANT: only write when the value actually changes — unnecessary
  // cross-thread writes disrupt the smooth UI-thread scroll animation.
  const runningSV = useSharedValue(running ? 1 : 0);
  const pausedTimeSV = useSharedValue(currentTime);
  const dotXSV = useSharedValue(dotX);
  const pxPerSecSV = useSharedValue(pxPerSec);

  const newRunning = running ? 1 : 0;
  if (runningSV.value !== newRunning) runningSV.value = newRunning;
  if (!running && pausedTimeSV.value !== currentTime) pausedTimeSV.value = currentTime;
  if (dotXSV.value !== dotX) dotXSV.value = dotX;
  if (pxPerSecSV.value !== pxPerSec) pxPerSecSV.value = pxPerSec;

  // UI-thread scroll: `dotX - nowSec * pxPerSec` positions "now" at the dot.
  // Runs at 60fps purely on the UI thread. Never reset, never anchored.
  const scrollTransform = useDerivedValue(() => {
    'worklet';
    const t = runningSV.value
      ? clock.value / 1000 + clockOffsetSec.value
      : pausedTimeSV.value;
    return [{ translateX: dotXSV.value - t * pxPerSecSV.value }];
  });

  // ---- Static horizontal grid ----
  const GRID_ROWS = 6;
  const hLines = useMemo(() => {
    if (!contentHeight) return [];
    const step = contentHeight / GRID_ROWS;
    const out: number[] = [];
    for (let i = 0; i <= GRID_ROWS; i++) out.push(Math.round(i * step));
    return out;
  }, [contentHeight]);

  // ---- Vertical grid (absolute positions, wide coverage) ----
  // Quantise currentTime to a coarse bucket so vLines only rebuild when the
  // viewport has scrolled far enough that new lines are needed — NOT on every
  // 80ms trail flush. Each bucket covers `visibleSeconds` worth of time.
  const vLineBucket = Math.floor(currentTime / visibleSeconds);
  const vLines = useMemo(() => {
    if (!W || !contentHeight) return [];
    const stepPx = contentHeight / GRID_ROWS;
    const stepSec = stepPx / pxPerSec;
    if (stepSec <= 0) return [];
    // Cover a wide window (5x visible) so lines don't pop in/out between rebuilds.
    // Allow negative times so lines fill the canvas before playback starts.
    const centerT = vLineBucket * visibleSeconds;
    const leftT = centerT - visibleSeconds * 2.5;
    const rightT = centerT + visibleSeconds * 3.5;
    const firstT = Math.ceil(leftT / stepSec) * stepSec;
    const out: number[] = [];
    for (let t = firstT; t <= rightT; t += stepSec) {
      out.push(t * pxPerSec); // absolute x
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, contentHeight, vLineBucket, visibleSeconds, pxPerSec]);

  // ---- Target note bands (absolute positions) ----
  const targetFont = useFont(require('../../../../assets/fonts/Satoshi-Medium.ttf'), 11);
  const targetRects = useMemo(() => {
    if (!targets || !W) return [];
    return targets.map((note) => {
      const noteStart = note.start / rate;
      const noteEnd = (note.start + note.duration) / rate;
      const x0 = noteStart * pxPerSec;
      const x1 = noteEnd * pxPerSec;
      const y = yOfMidi(note.midi);
      return {
        x: x0,
        width: x1 - x0,
        y: y - semiH / 2,
        height: semiH,
        label: midiToName(note.midi, 'ascii'),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, W, contentHeight, yCenter, semiH, rate, pxPerSec]);

  // ---- Trail paths (absolute x positions) ----
  // NO anchor reset, NO buildClockMs. Paths just sit at their absolute coords.
  const paths = useMemo(() => {
    const p = {
      lime: Skia.Path.Make(),
      yellow: Skia.Path.Make(),
      orange: Skia.Path.Make(),
      red: Skia.Path.Make(),
      gray: Skia.Path.Make(),
      single: Skia.Path.Make(),
    };
    if (!contentHeight || !W) return p;

    // Generous time-based culling — wide window avoids frequent recalc
    const latest = trail.length > 0 ? trail[trail.length - 1].t : currentTime;
    const leftT = latest - visibleSeconds * 3;

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (b.t - a.t > 0.25) continue;
      if (b.t < leftT && a.t < leftT) continue;

      const ax = a.t * pxPerSec;
      const bx = b.t * pxPerSec;
      const ay = yOfMidi(a.midi);
      const by = yOfMidi(b.midi);

      if (trailColor) {
        p.single.moveTo(ax, ay);
        p.single.lineTo(bx, by);
      } else {
        const absCents = b.cents === null ? Infinity : Math.abs(b.cents);
        const band =
          b.cents === null
            ? p.gray
            : absCents <= PERFECT_CENTS
              ? p.lime
              : absCents <= SLIGHT_CENTS
                ? p.yellow
                : absCents <= NOTICEABLE_CENTS
                  ? p.orange
                  : p.red;
        band.moveTo(ax, ay);
        band.lineTo(bx, by);
      }
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, contentHeight, W, yCenter, semiH, trailColor, pxPerSec, visibleSeconds]);

  // ---- Live head + label ----
  const liveHead = useMemo(() => {
    if (liveMidi === null) return null;
    const y = yOfMidi(liveMidi);
    return { x: dotX, y, color: trailColor ?? colorForCents(liveCents) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMidi, liveCents, contentHeight, W, yCenter, semiH, dotX, trailColor]);

  const shownNote = useStabilizedNote(liveMidi);
  const noteColor = trailColor ?? colorForCents(liveCents);
  const noteFont = useFont(require('../../../../assets/fonts/Satoshi-Medium.ttf'), 14);

  const noteLabel = useMemo(() => {
    if (shownNote === null || !liveHead || !noteFont) return null;
    const text = midiToName(shownNote, 'ascii');
    const measured = noteFont.measureText(text);
    return {
      text,
      x: liveHead.x - measured.width / 2,
      y: Math.max(16, liveHead.y - 18),
      color: noteColor,
    };
  }, [shownNote, liveHead, noteFont, noteColor]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {size.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {/* horizontal grid — static */}
          {hLines.map((y, i) => (
            <Line key={`h${i}`} p1={vec(0, y)} p2={vec(W, y)} color={GRID_COLOR} strokeWidth={0.5} />
          ))}

          {/* scrolling group — everything at absolute coords, viewport slides */}
          <Group clip={Skia.XYWHRect(0, 0, W, contentHeight)}>
          <Group transform={scrollTransform}>
            {vLines.map((x, i) => (
              <Line key={`v${i}`} p1={vec(x, 0)} p2={vec(x, contentHeight)} color={GRID_COLOR} strokeWidth={0.5} />
            ))}

            {targetRects.map((r, i) => (
              <Group key={i}>
                <RoundedRect x={r.x} y={r.y} width={r.width} height={r.height} r={4} color={LIME} opacity={0.22} />
                <RoundedRect
                  x={r.x}
                  y={r.y + r.height * 0.25}
                  width={r.width}
                  height={r.height * 0.5}
                  r={3}
                  color={LIME}
                  opacity={0.35}
                />
                {showNoteLabels && targetFont && r.width > 20 && (
                  <SkiaText
                    x={r.x + 5}
                    y={r.y + r.height / 2 + 4}
                    text={r.label}
                    font={targetFont}
                    color="rgba(255,255,255,0.7)"
                  />
                )}
              </Group>
            ))}

            {trailColor ? (
              <Path path={paths.single} color={trailColor} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            ) : (
              <>
                <Path path={paths.gray} color={GRAY} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
                <Path path={paths.yellow} color={YELLOW} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
                <Path path={paths.orange} color={ORANGE} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
                <Path path={paths.red} color={RED} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
                <Path path={paths.lime} color={LIME} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
              </>
            )}
          </Group>
          </Group>

          {/* playback position line (fixed at dotX, not scrolling) */}
          {showPlayhead && (
            <Line
              p1={vec(dotX, 0)}
              p2={vec(dotX, contentHeight)}
              color="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
            />
          )}

          {/* live head — glowing dot (fixed at dotX, not scrolling) */}
          {liveHead && (
            <>
              <Circle cx={liveHead.x} cy={liveHead.y} r={24} color={liveHead.color} opacity={0.06} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={18} color={liveHead.color} opacity={0.10} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={12} color={liveHead.color} opacity={0.20} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={7} color={liveHead.color} opacity={0.45} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={4.5} color="#ffffff" opacity={0.9} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={3} color="#ffffff" />
            </>
          )}

          {noteLabel && noteFont && (
            <SkiaText
              x={noteLabel.x}
              y={noteLabel.y}
              text={noteLabel.text}
              font={noteFont}
              color={noteLabel.color}
            />
          )}
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
});
