import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Line, Path, RoundedRect, Skia, useClock, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { Exercise } from '@/entities/exercise';
import { isSharp, ledgerSteps, MIDDLE_C_STEP, noteName, STAFF_LINE_STEPS, yOfMidi, yOfMidiContinuous, yOfStep, type StaffLayout } from '@/shared/lib/staff';
import { colorForCents, NOTICEABLE_CENTS, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import { VERDICT_GLYPH } from '@/entities/exercise';
import { useStaffStore } from '../model/staffStore';

const CYAN = '#C8DA59';
const YELLOW = '#e8c97a';
const ORANGE = '#f0954a';
const RED = '#ff6d5c';

/**
 * Fixed-layout staff (target melody laid out across the width by time) with a
 * sweeping playhead and a live sung-pitch overlay: on pitch sits on the target
 * note, sharp drifts above, flat below, colored by cents. Monochrome staff +
 * accent-only overlay per the design brief.
 */
export function StaffView({ exercise, rate }: { exercise: Exercise; rate: number }) {
  const { palette } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const status = useStaffStore((s) => s.status);
  const position = useStaffStore((s) => s.position);
  const positionUpdatedAt = useStaffStore((s) => s.positionUpdatedAt);
  const trail = useStaffStore((s) => s.trail);
  const liveMidi = useStaffStore((s) => s.liveMidi);
  const liveCents = useStaffStore((s) => s.liveCents);
  const noteResults = useStaffStore((s) => s.noteResults);
  const activeNote = useStaffStore((s) => s.activeNote);

  const total = useMemo(() => exercise.notes.reduce((m, n) => Math.max(m, n.start + n.duration), 0) / rate, [exercise, rate]);

  const layout = useMemo<StaffLayout>(() => {
    const lineGap = Math.max(14, size.height / 10);
    return { baselineY: size.height * 0.62, lineGap };
  }, [size.height]);

  const marginX = 40;
  const xOf = (t: number) => marginX + (Math.max(0, t) / (total || 1)) * (size.width - marginX * 2);
  const targetAt = (t: number) => exercise.notes.find((n) => t * rate >= n.start && t * rate < n.start + n.duration);

  // smooth 60fps playhead via the Skia clock, extrapolating between store ticks
  const clock = useClock();
  const mountedWall = useMemo(() => Date.now(), []);
  // extrapolate between store ticks in every stage where a timeline is
  // actually advancing — the two demonstration stages are clocked by playback,
  // the solo stage by the singer, and all three need a smooth playhead
  const running = status === 'running' || status === 'listen' || status === 'accompanied';
  const playheadX = useDerivedValue(() => {
    'worklet';
    const t =
      running && positionUpdatedAt > 0 ? position + (mountedWall + clock.value - positionUpdatedAt) / 1000 : position;
    return marginX + (Math.max(0, t) / (total || 1)) * (size.width - marginX * 2);
  }, [position, positionUpdatedAt, running, size.width]);
  const playheadP1 = useDerivedValue(() => vec(playheadX.value, layout.baselineY - layout.lineGap * 3), [playheadX]);
  const playheadP2 = useDerivedValue(() => vec(playheadX.value, layout.baselineY + layout.lineGap * 2.5), [playheadX]);

  // sung overlay trail, split into color bands
  const paths = useMemo(() => {
    const p = { cyan: Skia.Path.Make(), yellow: Skia.Path.Make(), orange: Skia.Path.Make(), red: Skia.Path.Make(), gray: Skia.Path.Make() };
    if (!size.height) return p;
    const yOfSample = (s: { t: number; midi: number; cents: number | null }) => {
      const tgt = targetAt(s.t);
      if (tgt && s.cents !== null && Math.abs(s.cents) <= 70) {
        return yOfMidi(tgt.midi, layout) - (s.cents / 50) * (layout.lineGap * 0.5);
      }
      return yOfMidiContinuous(s.midi, layout);
    };
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (b.t - a.t > 0.25) continue;
      const a2 = b.cents === null ? Infinity : Math.abs(b.cents);
      const band = b.cents === null ? p.gray : a2 <= PERFECT_CENTS ? p.cyan : a2 <= SLIGHT_CENTS ? p.yellow : a2 <= NOTICEABLE_CENTS ? p.orange : p.red;
      band.moveTo(xOf(a.t), yOfSample(a));
      band.lineTo(xOf(b.t), yOfSample(b));
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, layout, size.width]);

  // live glowing head
  const liveHead = useMemo(() => {
    if (liveMidi === null) return null;
    const t = position;
    const tgt = targetAt(t);
    const y =
      tgt && liveCents !== null && Math.abs(liveCents) <= 70
        ? yOfMidi(tgt.midi, layout) - (liveCents / 50) * (layout.lineGap * 0.5)
        : yOfMidiContinuous(liveMidi, layout);
    return { x: xOf(t), y, color: colorForCents(liveCents) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMidi, liveCents, position, layout, size.width]);

  return (
    <View style={styles.container} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.height > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* staff lines */}
            {STAFF_LINE_STEPS.map((step) => (
              <Line
                key={step}
                p1={vec(marginX - 16, yOfStep(step, layout))}
                p2={vec(size.width - 12, yOfStep(step, layout))}
                color="rgba(255,255,255,0.22)"
                strokeWidth={1}
              />
            ))}

            {/* target notes: muted duration bars + note heads */}
            {exercise.notes.map((n, i) => {
              const y = yOfMidi(n.midi, layout);
              const x0 = xOf(n.start / rate);
              const x1 = xOf((n.start + n.duration) / rate);
              const done = noteResults[i];
              // an ungraded note under the playhead lights up: during the two
              // demonstration stages that highlight is the whole point, and it
              // is driven by playback position, never by what was sung
              const barColor = done
                ? done.verdict === 'perfect'
                  ? 'rgba(200,218,89,0.28)'
                  : done.verdict === 'wrong' || done.verdict === 'missed'
                    ? 'rgba(255,109,92,0.22)'
                    : 'rgba(232,201,122,0.26)'
                : i === activeNote
                  ? 'rgba(255,255,255,0.34)'
                  : 'rgba(255,255,255,0.10)';
              return (
                <Group key={i}>
                  {ledgerSteps(n.midi).map((s) => (
                    <Line key={s} p1={vec(x0 - 6, yOfStep(s, layout))} p2={vec(x0 + 18, yOfStep(s, layout))} color="rgba(255,255,255,0.22)" strokeWidth={1} />
                  ))}
                  {n.midi <= 60 && (
                    <Line p1={vec(x0 - 6, yOfStep(MIDDLE_C_STEP, layout))} p2={vec(x0 + 18, yOfStep(MIDDLE_C_STEP, layout))} color="rgba(255,255,255,0.22)" strokeWidth={1} />
                  )}
                  <RoundedRect x={x0} y={y - 5} width={Math.max(x1 - x0 - 3, 8)} height={10} r={5} color={barColor} />
                  {i === activeNote && !done && <Circle cx={x0 + 6} cy={y} r={11} color={CYAN} opacity={0.22} />}
                  <Circle cx={x0 + 6} cy={y} r={6} color="rgba(255,255,255,0.85)" />
                </Group>
              );
            })}

            {/* sung overlay */}
            <Path path={paths.gray} color="rgba(255,255,255,0.6)" style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
            <Path path={paths.yellow} color={YELLOW} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            <Path path={paths.orange} color={ORANGE} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            <Path path={paths.red} color={RED} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            <Path path={paths.cyan} color={CYAN} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />

            {liveHead && (
              <>
                <Circle cx={liveHead.x} cy={liveHead.y} r={12} color={liveHead.color} opacity={0.18} />
                <Circle cx={liveHead.x} cy={liveHead.y} r={6.5} color={liveHead.color} opacity={0.5} />
                <Circle cx={liveHead.x} cy={liveHead.y} r={3.5} color="#ffffff" />
              </>
            )}

            {/* playhead */}
            <Line p1={playheadP1} p2={playheadP2} color="rgba(255,255,255,0.35)" strokeWidth={1.5} />
          </Canvas>

          {/* accidental signs left of sharp note heads */}
          {exercise.notes.map((n, i) =>
            isSharp(n.midi) ? (
              <AppText
                key={`acc-${i}`}
                variant="caption"
                color="rgba(255,255,255,0.85)"
                style={[styles.accidental, { left: xOf(n.start / rate) - 11, top: yOfMidi(n.midi, layout) - 9 }]}
              >
                ♯
              </AppText>
            ) : null
          )}

          {/* note names + lyrics under each target */}
          {exercise.notes.map((n, i) => {
            const done = noteResults[i];
            return (
              <View key={i} style={[styles.noteLabel, { left: xOf(n.start / rate) - 6, top: layout.baselineY + layout.lineGap * 3 }]}>
                {done && (
                  <AppText variant="caption" color={done.verdict === 'perfect' ? CYAN : done.verdict === 'wrong' || done.verdict === 'missed' ? RED : YELLOW} style={styles.glyph}>
                    {VERDICT_GLYPH[done.verdict]}
                  </AppText>
                )}
                <AppText variant="caption" style={{ fontSize: 10 }}>
                  {n.lyric ?? noteName(n.midi)}
                </AppText>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240 },
  noteLabel: { position: 'absolute', alignItems: 'center', width: 44, marginLeft: -16 },
  glyph: { fontSize: 13, marginBottom: 1 },
  accidental: { position: 'absolute', fontSize: 15, fontWeight: '600' },
});
