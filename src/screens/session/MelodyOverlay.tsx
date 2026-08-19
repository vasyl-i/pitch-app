/**
 * Target-vs-sung melody comparison: target notes as filled bars, the sung
 * notes overlaid as outlined bars on the same time × pitch grid. Sung notes
 * arrive already register-aligned from the evaluator.
 */
import { View } from 'react-native';
import type { OverlayNote } from '@/features/ear-training';
import { useTheme } from '@/shared/theme';
import { AppText, Card } from '@/shared/ui';

const HEIGHT = 96;
const BAR = 8;

interface MelodyOverlayProps {
  target: OverlayNote[];
  sung: OverlayNote[];
}

export function MelodyOverlay({ target, sung }: MelodyOverlayProps) {
  const { palette, spacing } = useTheme();
  const all = [...target, ...sung];
  if (target.length === 0) return null;

  const minMidi = Math.min(...all.map((n) => n.midi)) - 1;
  const maxMidi = Math.max(...all.map((n) => n.midi)) + 1;
  const targetEnd = Math.max(...target.map((n) => n.start + n.duration));
  const sungEnd = sung.length ? Math.max(...sung.map((n) => n.start + n.duration)) : 0;
  const totalSec = Math.max(targetEnd, sungEnd, 0.001);
  const midiSpan = Math.max(maxMidi - minMidi, 1);

  const x = (sec: number): `${number}%` => `${(100 * sec) / totalSec}%`;
  const w = x;
  const y = (midi: number) => ((maxMidi - midi) / midiSpan) * (HEIGHT - BAR);

  return (
    <View>
      <Card style={{ height: HEIGHT }}>
        {target.map((n, i) => (
          <View
            key={`t${i}`}
            style={{
              position: 'absolute',
              left: x(n.start),
              width: w(n.duration),
              top: y(n.midi),
              height: BAR,
              borderRadius: BAR / 2,
              backgroundColor: 'rgba(200, 218, 89, 0.4)',
            }}
          />
        ))}
        {sung.map((n, i) => (
          <View
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: x(n.start),
              width: w(n.duration),
              top: y(n.midi),
              height: BAR,
              borderRadius: BAR / 2,
              borderWidth: 1.5,
              borderColor: palette.textPrimary,
            }}
          />
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
        <AppText variant="caption" color={palette.accent}>
          ▬ target
        </AppText>
        <AppText variant="caption">▭ you</AppText>
      </View>
    </View>
  );
}
