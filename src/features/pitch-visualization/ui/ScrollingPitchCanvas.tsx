import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Line, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { AppText } from '@/shared/ui';
import { colorForCents, midiToName, NOTICEABLE_CENTS, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import { useStabilizedNote } from '../lib/useStabilizedNote';

interface PitchSample {
  t: number;
  midi: number;
  cents: number | null;
}

const VISIBLE_SECONDS = 4;
const VISIBLE_SEMITONES = 16;
const DOT_INSET = 16;

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
}

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
}: ScrollingPitchCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const centerRef = useRef(targetMidi ?? liveMidi ?? 60);
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
  const dotX = W - DOT_INSET;

  const yOfMidi = (midi: number) => {
    const offset = midi - yCenter;
    return contentHeight / 2 - offset * semiH;
  };

  const xOfTime = (t: number, now: number) => {
    const age = now - t;
    return dotX - (age / visibleSeconds) * W;
  };

  const timeSnapshotRef = useRef({ currentTime, wallMs: Date.now() });
  useEffect(() => {
    timeSnapshotRef.current = { currentTime, wallMs: Date.now() };
  }, [currentTime]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 33);
    return () => clearInterval(id);
  }, []);

  const snap = timeSnapshotRef.current;
  const elapsed = (Date.now() - snap.wallMs) / 1000;
  const renderTime = running ? snap.currentTime + elapsed : currentTime;

  const hLines = useMemo(() => {
    if (!contentHeight) return [];
    const low = Math.floor(yCenter - VISIBLE_SEMITONES / 2) - 1;
    const high = Math.ceil(yCenter + VISIBLE_SEMITONES / 2) + 1;
    const out: number[] = [];
    for (let m = low; m <= high; m++) {
      out.push(yOfMidi(m));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHeight, yCenter, semiH]);

  const vLines = useMemo(() => {
    if (!W || !semiH) return [];
    const intervalSec = Math.max(0.25, (semiH / W) * visibleSeconds);
    const out: number[] = [];
    const leftTime = renderTime - visibleSeconds * (dotX / W);
    const firstT = Math.ceil(leftTime / intervalSec) * intervalSec;
    for (let t = firstT; t <= renderTime + intervalSec; t += intervalSec) {
      const x = xOfTime(t, renderTime);
      if (x >= 0 && x <= W) out.push(x);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, semiH, renderTime, visibleSeconds, dotX]);

  const targetRects = useMemo(() => {
    if (!targets || !W) return [];
    return targets
      .map((note) => {
        const noteStart = note.start / rate;
        const noteEnd = (note.start + note.duration) / rate;
        const x0 = xOfTime(noteStart, renderTime);
        const x1 = xOfTime(noteEnd, renderTime);
        const y = yOfMidi(note.midi);
        const clampedX0 = Math.max(0, x0);
        const clampedX1 = Math.min(W, x1);
        return {
          x: clampedX0,
          width: clampedX1 - clampedX0,
          y: y - semiH / 2,
          height: semiH,
          visible: clampedX1 > 0 && clampedX0 < W && clampedX1 > clampedX0,
        };
      })
      .filter((r) => r.visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, renderTime, W, contentHeight, yCenter, semiH, rate]);

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

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (b.t - a.t > 0.25) continue;

      const ax = xOfTime(a.t, renderTime);
      const bx = xOfTime(b.t, renderTime);
      if (bx < 0 && ax < 0) continue;
      if (ax > W && bx > W) continue;

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
  }, [trail, renderTime, contentHeight, W, yCenter, semiH, trailColor]);

  const liveHead = useMemo(() => {
    if (liveMidi === null) return null;
    const y = yOfMidi(liveMidi);
    return { x: dotX, y, color: trailColor ?? colorForCents(liveCents) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMidi, liveCents, contentHeight, W, yCenter, semiH, dotX, trailColor]);

  const shownNote = useStabilizedNote(liveMidi);
  const noteColor = trailColor ?? colorForCents(liveCents);

  return (
    <View style={styles.container} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.height > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* horizontal grid lines */}
            {hLines.map((y, i) => (
              <Line key={i} p1={vec(0, y)} p2={vec(W, y)} color={GRID_COLOR} strokeWidth={0.5} />
            ))}

            {/* vertical grid lines */}
            {vLines.map((x, i) => (
              <Line key={i} p1={vec(x, 0)} p2={vec(x, contentHeight)} color={GRID_COLOR} strokeWidth={0.5} />
            ))}

            {/* target note bands */}
            {targetRects.map((r, i) => (
              <Group key={i}>
                <Rect x={r.x} y={r.y} width={r.width} height={r.height} color={LIME} opacity={0.06} />
                <Rect
                  x={r.x}
                  y={r.y + r.height * 0.38}
                  width={r.width}
                  height={r.height * 0.24}
                  color={LIME}
                  opacity={0.14}
                />
              </Group>
            ))}

            {/* sung trail */}
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

            {/* live head */}
            {liveHead && (
              <>
                <Circle cx={liveHead.x} cy={liveHead.y} r={14} color={liveHead.color} opacity={0.18} />
                <Circle cx={liveHead.x} cy={liveHead.y} r={7} color={liveHead.color} opacity={0.5} />
                <Circle cx={liveHead.x} cy={liveHead.y} r={4} color="#ffffff" />
              </>
            )}
          </Canvas>

          {/* note label above the dot */}
          {shownNote !== null && liveHead && (
            <AppText
              variant="label"
              color={noteColor}
              style={[
                styles.noteLabel,
                {
                  top: Math.max(2, liveHead.y - 30),
                  left: liveHead.x - 24,
                  width: 48,
                },
              ]}
            >
              {midiToName(shownNote)}
            </AppText>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  noteLabel: { position: 'absolute', fontSize: 14, textAlign: 'center' },
});
