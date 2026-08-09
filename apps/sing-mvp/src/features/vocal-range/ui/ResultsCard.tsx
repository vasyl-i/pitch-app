import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { midiToName } from '@/shared/lib/music';
import { deriveComfortRange, voiceType } from '@/entities/profile';

/** Celebratory-but-professional summary of a completed low/high detection. */
export function ResultsCard({ low, high }: { low: number; high: number }) {
  const { palette, spacing } = useTheme();
  const comfort = deriveComfortRange({ lowMidi: low, highMidi: high });
  const span = high - low;

  return (
    <View>
      <View style={styles.pairRow}>
        <Card style={styles.pairCard}>
          <AppText variant="caption">Lowest note</AppText>
          <AppText variant="display" style={{ fontSize: 34, marginTop: 4 }}>
            {midiToName(low)}
          </AppText>
        </Card>
        <Card style={styles.pairCard}>
          <AppText variant="caption">Highest note</AppText>
          <AppText variant="display" color={palette.accent} style={{ fontSize: 34, marginTop: 4 }}>
            {midiToName(high)}
          </AppText>
        </Card>
      </View>

      <Card style={{ ...styles.card, marginTop: spacing.md }}>
        <AppText variant="caption">Comfortable range</AppText>
        <AppText variant="label" style={{ fontSize: 22, marginTop: 4 }}>
          {midiToName(comfort.lowMidi)} – {midiToName(comfort.highMidi)}
        </AppText>
        <AppText variant="caption" style={{ marginTop: spacing.sm }}>
          {span} semitones · {(span / 12).toFixed(1)} octaves · ≈{voiceType({ lowMidi: low, highMidi: high })}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  pairRow: { flexDirection: 'row', gap: 10 },
  pairCard: { flex: 1, padding: 16, alignItems: 'center' },
  card: { padding: 18, alignItems: 'center' },
});
