/**
 * Target-vs-sung melody comparison: target notes as filled bars, the sung
 * notes overlaid as outlined bars on the same time × pitch grid. Sung notes
 * arrive already register-aligned from the evaluator.
 */
import { StyleSheet, View } from 'react-native';
import type { OverlayNote } from '@/features/ear-training';
import { accentAlpha, palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { AppText, Card } from '@/shared/ui';

const HEIGHT = 96;
const BAR = 8;

export function MelodyOverlay({ target, sung }: { target: OverlayNote[]; sung: OverlayNote[] }) {
  const { t } = useTranslation();
  if (target.length === 0) return null;

  const all = [...target, ...sung];
  const minMidi = Math.min(...all.map((n) => n.midi)) - 1;
  const maxMidi = Math.max(...all.map((n) => n.midi)) + 1;
  const totalSec = Math.max(...all.map((n) => n.start + n.duration), 0.001);
  const midiSpan = Math.max(maxMidi - minMidi, 1);
  // a note's box on the grid
  const place = (n: OverlayNote) => ({
    left: `${(100 * n.start) / totalSec}%` as const,
    width: `${(100 * n.duration) / totalSec}%` as const,
    top: ((maxMidi - n.midi) / midiSpan) * (HEIGHT - BAR),
  });

  return (
    <View>
      <Card style={styles.grid}>
        {target.map((n, i) => (
          <View key={`t${i}`} style={[styles.bar, styles.target, place(n)]} />
        ))}
        {sung.map((n, i) => (
          <View key={`s${i}`} style={[styles.bar, styles.sung, place(n)]} />
        ))}
      </Card>
      <View style={styles.legend}>
        <AppText variant="caption" color={palette.accent}>
          ▬ {t('session.overlay.target')}
        </AppText>
        <AppText variant="caption">▭ {t('session.overlay.you')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { height: HEIGHT },
  bar: { position: 'absolute', height: BAR, borderRadius: BAR / 2 },
  target: { backgroundColor: accentAlpha(0.4) },
  sung: { borderWidth: 1.5, borderColor: palette.textPrimary },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
});
