import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Line, RoundedRect, vec } from '@shopify/react-native-skia';
import { AppText } from '@/shared/ui';
import { spellPitchClass } from '@/shared/lib/music';
import { keyPitchClasses } from '../lib/grade';
import type { FormingNote, NoteClass, SungNote } from '../lib/notes';

/** note accuracy → bar color: lime near-perfect, white middling, red off */
export const ACCURACY_COLOR: Record<NoteClass, string> = {
  perfect: '#C8DA59',
  good: '#FFFFFF',
  off: '#ff6d5c',
};

/** seconds of history kept on screen */
const WINDOW_SEC = 8;
/** the live edge sits at this fraction of the width; history scrolls left */
const HEAD_X = 0.86;
const BAR_HEIGHT = 10;

/**
 * Karaoke-style sung-note bars over the song key's scale-tone lanes. Each
 * completed note renders as one rounded bar on the lane it snapped to,
 * colored by its accuracy; the note being sung grows live with a glowing
 * head at the exact current pitch. Nothing draws while the singer is silent.
 */
export function KeyTrailView({
  notes,
  forming,
  headMidi,
  now,
  keyName,
  lowMidi,
  highMidi,
}: {
  notes: readonly SungNote[];
  forming: FormingNote | null;
  /** exact live pitch (continuous MIDI), null while silent */
  headMidi: number | null;
  now: number;
  keyName: string;
  lowMidi: number;
  highMidi: number;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // half-step padding so the extreme lanes don't sit on the border
  const lo = lowMidi - 1;
  const hi = highMidi + 1;
  const yOf = (midi: number) => size.height - ((midi - lo) / (hi - lo)) * size.height;
  const xOf = (t: number) => size.width * HEAD_X - (now - t) * ((size.width * HEAD_X) / WINDOW_SEC);

  const lanes = useMemo(() => {
    const pcs = keyPitchClasses(keyName);
    const tonicPc = pcs[0];
    const out: { midi: number; label: string; tonic: boolean }[] = [];
    for (let m = Math.ceil(lo); m <= Math.floor(hi); m++) {
      const pc = ((m % 12) + 12) % 12;
      if (pcs.includes(pc)) out.push({ midi: m, label: spellPitchClass(pc, keyName), tonic: pc === tonicPc });
    }
    return out;
  }, [keyName, lo, hi]);

  const visible = useMemo(() => notes.filter((n) => now - n.t1 <= WINDOW_SEC), [notes, now]);

  const bar = (n: SungNote | FormingNote, opacity = 1, key?: number | string) => (
    <RoundedRect
      key={key}
      x={xOf(n.t0)}
      y={yOf(n.laneMidi) - BAR_HEIGHT / 2}
      width={Math.max(xOf(n.t1) - xOf(n.t0), BAR_HEIGHT)}
      height={BAR_HEIGHT}
      r={BAR_HEIGHT / 2}
      color={ACCURACY_COLOR[n.cls]}
      opacity={opacity}
    />
  );

  return (
    <View style={styles.container} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.height > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            {lanes.map((lane) => (
              <Line
                key={lane.midi}
                p1={vec(34, yOf(lane.midi))}
                p2={vec(size.width - 8, yOf(lane.midi))}
                color={lane.tonic ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={1}
              />
            ))}

            {visible.map((n, i) => bar(n, 1, i))}
            {forming && bar(forming, 0.6, 'forming')}

            {/* glowing head at the exact live pitch */}
            {headMidi !== null && (
              <>
                <Circle cx={size.width * HEAD_X} cy={yOf(headMidi)} r={12} color={forming ? ACCURACY_COLOR[forming.cls] : '#FFFFFF'} opacity={0.18} />
                <Circle cx={size.width * HEAD_X} cy={yOf(headMidi)} r={6.5} color={forming ? ACCURACY_COLOR[forming.cls] : '#FFFFFF'} opacity={0.5} />
                <Circle cx={size.width * HEAD_X} cy={yOf(headMidi)} r={3.5} color="#ffffff" />
              </>
            )}
          </Canvas>

          {/* scale-tone labels down the left edge */}
          {lanes.map((lane) => (
            <AppText
              key={lane.midi}
              variant="caption"
              color={lane.tonic ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'}
              style={[styles.label, { top: yOf(lane.midi) - 6 }]}
            >
              {lane.label}
            </AppText>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 220 },
  label: { position: 'absolute', left: 4, fontSize: 9 },
});
