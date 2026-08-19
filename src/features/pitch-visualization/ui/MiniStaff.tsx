import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Line, vec } from '@shopify/react-native-skia';
import { AppText } from '@/shared/ui';
import { isSharp, ledgerSteps, MIDDLE_C_STEP, STAFF_LINE_STEPS, yOfMidiContinuous, yOfStep, type StaffLayout } from '@/shared/lib/staff';
import { useStabilizedNote } from '../lib/useStabilizedNote';

/**
 * A single-note staff: shows where the live pitch sits right now, with no
 * timeline. Vocal-range detection and mic calibration have no melody to lay
 * out across time — just "where am I singing" — so they use this instead of
 * the full scrolling `StaffView`, which is built around a fixed exercise
 * timeline that doesn't apply here.
 */
export function MiniStaff({ liveMidi, color }: { liveMidi: number | null; color: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const layout = useMemo<StaffLayout>(() => {
    const lineGap = Math.max(14, size.height / 8);
    return { baselineY: size.height * 0.55, lineGap };
  }, [size.height]);

  const x = size.width / 2;
  // presentation only; `y` below stays on the raw continuous pitch
  const roundedMidi = useStabilizedNote(liveMidi);
  const y = liveMidi === null ? null : yOfMidiContinuous(liveMidi, layout);
  const ledgers = roundedMidi === null ? [] : ledgerSteps(roundedMidi);

  return (
    <View style={styles.container} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {STAFF_LINE_STEPS.map((step) => (
            <Line
              key={step}
              p1={vec(24, yOfStep(step, layout))}
              p2={vec(size.width - 24, yOfStep(step, layout))}
              color="rgba(255,255,255,0.22)"
              strokeWidth={1}
            />
          ))}
          {ledgers.map((s) => (
            <Line key={s} p1={vec(x - 16, yOfStep(s, layout))} p2={vec(x + 16, yOfStep(s, layout))} color="rgba(255,255,255,0.22)" strokeWidth={1} />
          ))}
          {roundedMidi !== null && roundedMidi <= 60 && (
            <Line
              p1={vec(x - 16, yOfStep(MIDDLE_C_STEP, layout))}
              p2={vec(x + 16, yOfStep(MIDDLE_C_STEP, layout))}
              color="rgba(255,255,255,0.22)"
              strokeWidth={1}
            />
          )}
          {y !== null && (
            <>
              <Circle cx={x} cy={y} r={13} color={color} opacity={0.18} />
              <Circle cx={x} cy={y} r={7} color={color} opacity={0.55} />
              <Circle cx={x} cy={y} r={4} color="#ffffff" />
            </>
          )}
        </Canvas>
      )}
      {roundedMidi !== null && y !== null && isSharp(roundedMidi) && (
        <AppText variant="caption" color="rgba(255,255,255,0.85)" style={[styles.accidental, { left: x - 26, top: y - 9 }]}>
          ♯
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 140 },
  accidental: { position: 'absolute', fontSize: 15, fontWeight: '600' },
});
