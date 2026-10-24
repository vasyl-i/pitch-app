import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RoundScore } from '@/features/ear-training';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { RoundDetails } from './RoundDetails';

/** each round's score; tap one to open its details */
export function RoundBreakdown({ title, rounds, onReplay }: { title: string; rounds: RoundScore[]; onReplay: (index: number) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Card style={styles.card}>
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      {rounds.map((r, i) => (
        <Pressable key={i} accessibilityRole="button" onPress={() => setOpen(open === i ? null : i)}>
          <View style={styles.row}>
            <AppText variant="caption">{t('session.results.round', { number: i + 1 })}</AppText>
            <AppText variant="caption" color={r.ok ? palette.accent : palette.white}>
              {r.score !== 0 ? `${r.score}%` : r.label}
            </AppText>
          </View>
          {open === i && <RoundDetails round={r} onReplay={() => onReplay(i)} />}
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xl, padding: 20, borderRadius: 10 },
  title: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
});
