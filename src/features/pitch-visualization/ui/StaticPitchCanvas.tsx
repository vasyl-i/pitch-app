import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  Rect,
  RoundedRect,
  Skia,
  Text as SkiaText,
  useFont,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { colorForCents, midiToName, pitchClassOf, NOTICEABLE_CENTS, PERFECT_CENTS, SLIGHT_CENTS } from '@/shared/lib/music';
import { useStabilizedNote } from '../lib/useStabilizedNote';

interface PitchSample {
  t: number;
  midi: number;
  cents: number | null;
}

const LIME = '#C8DA59';
const YELLOW = '#e8c97a';
const ORANGE = '#f0954a';
const RED = '#ff6d5c';
const GRAY = 'rgba(255,255,255,0.4)';

const NOTE_BLUE = '#8B7CFF';
const NOTE_ACTIVE = '#ffffff';

const VERTICAL_PADDING_SEMITONES = 3;

// Black keys on a piano (pitch classes that are sharps/flats)
const BLACK_KEY_PCS = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

// Row colors — FL Studio style
const WHITE_KEY_BG = 'rgba(255,255,255,0.04)';
const BLACK_KEY_BG = 'rgba(0,0,0,0.15)';
const ROW_LINE_COLOR = 'rgba(255,255,255,0.06)';
const BEAT_LINE_COLOR = 'rgba(255,255,255,0.08)';
const BAR_LINE_COLOR = 'rgba(255,255,255,0.18)';
const LABEL_COLOR = 'rgba(255,255,255,0.25)';
const C_NOTE_LABEL_COLOR = 'rgba(255,255,255,0.45)';

// Left margin for note labels
const LABEL_MARGIN = 32;

interface StaticPitchCanvasProps {
  trail: PitchSample[];
  liveMidi: number | null;
  liveCents: number | null;
  currentTime: number;
  targets: { start: number; duration: number; midi: number }[];
  rate?: number;
  bpm?: number;
  running?: boolean;
  showNoteLabels?: boolean;
}

/**
 * Static (non-scrolling) pitch canvas for short melodies.
 *
 * All target notes are visible at once — the canvas auto-scales horizontally
 * to fit the entire melody and vertically to fit all pitches. A vertical
 * playhead sweeps across as playback progresses. Voice pitch trail and the
 * glowing live-dot are rendered at their time-based position.
 */
export function StaticPitchCanvas({
  trail,
  liveMidi,
  liveCents,
  currentTime,
  targets,
  rate = 1,
  bpm = 100,
  running = true,
  showNoteLabels = true,
}: StaticPitchCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    },
    [],
  );

  const W = size.width;
  const H = size.height;

  // ---- Vertical range: fit all target notes with padding ----
  // Integer MIDI boundaries so each semitone gets an exact row
  const { lowMidi, highMidi, visibleSemitones, midCenter } = useMemo(() => {
    if (!targets.length) return { lowMidi: 54, highMidi: 66, visibleSemitones: 12, midCenter: 60 };
    const mids = targets.map((n) => n.midi);
    const lo = Math.min(...mids) - VERTICAL_PADDING_SEMITONES;
    const hi = Math.max(...mids) + VERTICAL_PADDING_SEMITONES;
    const span = Math.max(12, hi - lo);
    return {
      lowMidi: lo,
      highMidi: lo + span,
      visibleSemitones: span,
      midCenter: (lo + lo + span) / 2,
    };
  }, [targets]);

  const semiH = H > 0 ? H / visibleSemitones : 1;

  const yOfMidi = (midi: number) => {
    const offset = midi - midCenter;
    return H / 2 - offset * semiH;
  };

  // ---- Horizontal range: fit entire melody duration ----
  const totalDuration = useMemo(() => {
    if (!targets.length) return 1;
    const last = targets[targets.length - 1];
    return (last.start + last.duration) / rate;
  }, [targets, rate]);

  const RIGHT_PAD_PX = W * 0.03;
  const usableW = W - LABEL_MARGIN - RIGHT_PAD_PX;
  const pxPerSec = usableW > 0 ? usableW / totalDuration : 1;
  const xOffset = LABEL_MARGIN;

  const xOfTime = (t: number) => xOffset + t * pxPerSec;

  // ---- UI-thread playhead via Skia clock ----
  // The Skia clock ticks at 60fps on the UI thread. We sync it to trail time
  // once, and re-sync on time jumps (phase transitions / restarts). This way
  // the playhead moves at 60fps regardless of JS thread load.
  const clock = useClock();
  const clockOffsetSec = useSharedValue(0);
  const offsetInit = useRef(false);
  const prevCT = useRef(currentTime);

  if (!offsetInit.current && W > 0 && running) {
    clockOffsetSec.value = currentTime - clock.value / 1000;
    offsetInit.current = true;
  } else if (offsetInit.current && Math.abs(currentTime - prevCT.current) > 0.5) {
    clockOffsetSec.value = currentTime - clock.value / 1000;
  }
  prevCT.current = currentTime;

  const runningSV = useSharedValue(running ? 1 : 0);
  const pausedTimeSV = useSharedValue(currentTime);
  const xOffsetSV = useSharedValue(xOffset);
  const pxPerSecSV = useSharedValue(pxPerSec);

  const newRunning = running ? 1 : 0;
  if (runningSV.value !== newRunning) runningSV.value = newRunning;
  if (!running && pausedTimeSV.value !== currentTime) pausedTimeSV.value = currentTime;
  if (xOffsetSV.value !== xOffset) xOffsetSV.value = xOffset;
  if (pxPerSecSV.value !== pxPerSec) pxPerSecSV.value = pxPerSec;

  const playheadXAnimated = useDerivedValue(() => {
    'worklet';
    const t = runningSV.value
      ? clock.value / 1000 + clockOffsetSec.value
      : pausedTimeSV.value;
    return xOffsetSV.value + t * pxPerSecSV.value;
  });

  // ---- Piano roll rows (one per semitone) ----
  const pianoRows = useMemo(() => {
    if (!H || !W) return [];
    const rows: { y: number; height: number; isBlack: boolean; midi: number; label: string; isC: boolean }[] = [];
    for (let midi = highMidi; midi >= lowMidi; midi--) {
      const pc = pitchClassOf(midi);
      const y = yOfMidi(midi) - semiH / 2;
      rows.push({
        y,
        height: semiH,
        isBlack: BLACK_KEY_PCS.has(pc),
        midi,
        label: midiToName(midi, 'ascii'),
        isC: pc === 0,
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [H, W, lowMidi, highMidi, semiH, midCenter]);

  // ---- Beat / bar lines ----
  const beatLines = useMemo(() => {
    if (!W || !H) return [];
    const beatSec = (60 / bpm) / rate;
    const beatsPerBar = 4; // assume 4/4 for now
    const out: { x: number; isBar: boolean }[] = [];
    for (let beat = 0; beat * beatSec <= totalDuration; beat++) {
      out.push({
        x: xOfTime(beat * beatSec),
        isBar: beat % beatsPerBar === 0,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, bpm, rate, pxPerSec, totalDuration]);

  // ---- Active note (under playhead) ----
  const activeNoteIdx = useMemo(() => {
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i].start / rate;
      const e = (targets[i].start + targets[i].duration) / rate;
      if (currentTime >= s && currentTime < e) return i;
    }
    return -1;
  }, [targets, currentTime, rate]);

  // ---- Target note rectangles ----
  const targetFont = useFont(require('../../../../assets/fonts/Satoshi-Medium.ttf'), 11);
  const labelFont = useFont(require('../../../../assets/fonts/Satoshi-Regular.ttf'), 9);
  const targetRects = useMemo(() => {
    if (!targets.length || !W) return [];
    return targets.map((note, i) => {
      const noteStart = note.start / rate;
      const noteEnd = (note.start + note.duration) / rate;
      const x0 = xOfTime(noteStart);
      const x1 = xOfTime(noteEnd);
      const y = yOfMidi(note.midi);
      return {
        x: x0,
        width: x1 - x0,
        y: y - semiH / 2,
        height: semiH,
        label: midiToName(note.midi, 'ascii'),
        active: i === activeNoteIdx,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, W, H, midCenter, semiH, rate, pxPerSec, activeNoteIdx]);

  // ---- Voice trail (accumulate full history) ----
  // The store's trail array is bounded to ~6 seconds (old samples are shifted
  // off for ScrollingPitchCanvas). StaticPitchCanvas needs the full melody, so
  // we accumulate every sample we see into our own buffer keyed by timestamp.
  const fullTrailRef = useRef<PitchSample[]>([]);
  const lastSeenT = useRef(-1);

  // Reset when trail is cleared (new phase)
  if (trail.length === 0 && fullTrailRef.current.length > 0) {
    fullTrailRef.current = [];
    lastSeenT.current = -1;
  }

  // Append new samples (trail is time-ordered; only add samples newer than last seen)
  if (trail.length > 0) {
    const newest = trail[trail.length - 1].t;
    if (newest > lastSeenT.current) {
      for (let i = 0; i < trail.length; i++) {
        if (trail[i].t > lastSeenT.current) {
          fullTrailRef.current.push(trail[i]);
        }
      }
      lastSeenT.current = newest;
    }
  }

  const fullTrail = fullTrailRef.current;

  // ---- Voice trail paths ----
  const lastBuiltLen = useRef(0);
  const pathsRef = useRef({
    lime: Skia.Path.Make(),
    yellow: Skia.Path.Make(),
    orange: Skia.Path.Make(),
    red: Skia.Path.Make(),
    gray: Skia.Path.Make(),
  });

  // Full rebuild when layout or scale changes
  const scaleKey = `${W}:${H}:${midCenter}:${semiH}:${pxPerSec}`;
  const prevScaleKey = useRef('');
  if (prevScaleKey.current !== scaleKey) {
    prevScaleKey.current = scaleKey;
    lastBuiltLen.current = 0;
    pathsRef.current = {
      lime: Skia.Path.Make(),
      yellow: Skia.Path.Make(),
      orange: Skia.Path.Make(),
      red: Skia.Path.Make(),
      gray: Skia.Path.Make(),
    };
  }

  // Reset paths when trail was cleared (new phase)
  if (fullTrail.length === 0 && lastBuiltLen.current > 0) {
    lastBuiltLen.current = 0;
    pathsRef.current = {
      lime: Skia.Path.Make(),
      yellow: Skia.Path.Make(),
      orange: Skia.Path.Make(),
      red: Skia.Path.Make(),
      gray: Skia.Path.Make(),
    };
  }

  // Append only new segments (fullTrail never shifts, so indices are stable)
  if (H > 0 && W > 0 && fullTrail.length > lastBuiltLen.current) {
    const p = pathsRef.current;
    const startIdx = Math.max(1, lastBuiltLen.current);
    for (let i = startIdx; i < fullTrail.length; i++) {
      const a = fullTrail[i - 1];
      const b = fullTrail[i];
      if (b.t - a.t > 0.25) continue;

      const ax = xOfTime(a.t);
      const bx = xOfTime(b.t);
      const ay = yOfMidi(a.midi);
      const by = yOfMidi(b.midi);

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
    lastBuiltLen.current = fullTrail.length;
  }

  const paths = pathsRef.current;

  // ---- Live head (glowing dot) ----
  const liveHead = useMemo(() => {
    if (liveMidi === null) return null;
    return {
      x: xOfTime(currentTime),
      y: yOfMidi(liveMidi),
      color: colorForCents(liveCents),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMidi, liveCents, currentTime, H, W, midCenter, semiH, pxPerSec]);

  const shownNote = useStabilizedNote(liveMidi);
  const noteFont = useFont(require('../../../../assets/fonts/Satoshi-Medium.ttf'), 16);

  const noteLabel = useMemo(() => {
    if (shownNote === null || !liveHead || !noteFont) return null;
    const text = midiToName(shownNote, 'ascii');
    return {
      text,
      x: liveHead.x + 16,
      y: liveHead.y + 5,
    };
  }, [shownNote, liveHead, noteFont]);

  // Playhead transform — driven on UI thread at 60fps
  const playheadTransform = useDerivedValue(() => {
    'worklet';
    return [{ translateX: playheadXAnimated.value }];
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {H > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Piano roll row backgrounds */}
          {pianoRows.map((row, i) => (
            <Group key={`row${i}`}>
              <Rect
                x={LABEL_MARGIN}
                y={row.y}
                width={W - LABEL_MARGIN}
                height={row.height}
                color={row.isBlack ? BLACK_KEY_BG : WHITE_KEY_BG}
              />
              <Line
                p1={vec(LABEL_MARGIN, row.y + row.height)}
                p2={vec(W, row.y + row.height)}
                color={row.isC ? BAR_LINE_COLOR : ROW_LINE_COLOR}
                strokeWidth={row.isC ? 1 : 0.5}
              />
            </Group>
          ))}

          {/* Note labels on the left */}
          {pianoRows.map((row, i) => {
            // Only label white keys to avoid clutter (or all if rows are tall enough)
            if (row.isBlack && semiH < 18) return null;
            return labelFont ? (
              <SkiaText
                key={`lbl${i}`}
                x={4}
                y={row.y + row.height / 2 + 4}
                text={row.label}
                font={labelFont}
                color={row.isC ? C_NOTE_LABEL_COLOR : LABEL_COLOR}
              />
            ) : null;
          })}

          {/* Beat and bar lines */}
          {beatLines.map((bl, i) => (
            <Line
              key={`bl${i}`}
              p1={vec(bl.x, 0)}
              p2={vec(bl.x, H)}
              color={bl.isBar ? BAR_LINE_COLOR : BEAT_LINE_COLOR}
              strokeWidth={bl.isBar ? 1 : 0.5}
            />
          ))}

          {/* Target note blocks */}
          {targetRects.map((r, i) => {
            const color = r.active ? NOTE_ACTIVE : NOTE_BLUE;
            return (
              <Group key={i}>
                {r.active && (
                  <RoundedRect
                    x={r.x - 3}
                    y={r.y - 3}
                    width={r.width + 6}
                    height={r.height + 6}
                    r={6}
                    color={NOTE_ACTIVE}
                    opacity={0.10}
                  />
                )}
                <RoundedRect x={r.x} y={r.y} width={r.width} height={r.height} r={4} color={color} opacity={r.active ? 0.35 : 0.20} />
                <RoundedRect
                  x={r.x}
                  y={r.y + r.height * 0.25}
                  width={r.width}
                  height={r.height * 0.5}
                  r={3}
                  color={color}
                  opacity={r.active ? 0.55 : 0.30}
                />
                {showNoteLabels && targetFont && r.width > 20 && (
                  <SkiaText
                    x={r.x + 5}
                    y={r.y + r.height / 2 + 4}
                    text={r.label}
                    font={targetFont}
                    color={r.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
                  />
                )}
              </Group>
            );
          })}

          {/* Voice pitch trail */}
          <Path path={paths.gray} color={GRAY} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
          <Path path={paths.yellow} color={YELLOW} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
          <Path path={paths.orange} color={ORANGE} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
          <Path path={paths.red} color={RED} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
          <Path path={paths.lime} color={LIME} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />

          {/* Vertical playhead — animated on UI thread at 60fps */}
          {running && (
            <Group transform={playheadTransform}>
              <Line
                p1={vec(0, 0)}
                p2={vec(0, H)}
                color="rgba(255,255,255,0.3)"
                strokeWidth={1.5}
              />
            </Group>
          )}

          {/* Live head — glowing dot (no GPU blur, concentric circles) */}
          {liveHead && (
            <>
              <Circle cx={liveHead.x} cy={liveHead.y} r={26} color={liveHead.color} opacity={0.05} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={20} color={liveHead.color} opacity={0.08} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={15} color={liveHead.color} opacity={0.15} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={10} color={liveHead.color} opacity={0.85} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={7.5} color={liveHead.color} opacity={0.5} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={7.5} color="#ffffff" opacity={0.5} />
              <Circle cx={liveHead.x} cy={liveHead.y} r={5} color="#ffffff" opacity={0.95} />
            </>
          )}

          {/* Note name label */}
          {noteLabel && noteFont && (
            <SkiaText
              x={noteLabel.x}
              y={noteLabel.y}
              text={noteLabel.text}
              font={noteFont}
              color="#EEFF88"
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
