/**
 * Surfaces a smart-range-learning suggestion, if the singer has consistently
 * reached beyond their stored comfort range across several recent sittings.
 * Purely a prompt — expanding the range only happens if they tap "Expand".
 */
import { StyleSheet, View } from 'react-native';
import { dismissRangeSuggestion, evaluateRangeSuggestion, useProfileStore, useRangeObservationStore } from '@/entities/profile';
import { midiToName } from '@/shared/lib/music';
import { AppText, Button, Card } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

export function RangeSuggestionBanner() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const setComfortRange = useProfileStore((s) => s.setComfortRange);
  // subscribe so a freshly-recorded observation re-renders this banner
  useRangeObservationStore((s) => s.observations.length);
  useRangeObservationStore((s) => s.dismissals.length);
  const suggestion = evaluateRangeSuggestion();

  if (!suggestion || !profile) return null;

  const expand = () =>
    setComfortRange(
      suggestion.direction === 'low'
        ? { lowMidi: suggestion.suggestedMidi, highMidi: profile.comfortRange.highMidi }
        : { lowMidi: profile.comfortRange.lowMidi, highMidi: suggestion.suggestedMidi },
    );

  return (
    <Card variant="highlighted" style={styles.card}>
      <AppText variant="label">{t('vocalRange.suggestion.title')}</AppText>
      <AppText variant="body" style={styles.body}>
        {t('vocalRange.suggestion.body', { note: midiToName(suggestion.suggestedMidi), count: suggestion.observedSessions })}
      </AppText>
      <View style={styles.actions}>
        <Button title={t('vocalRange.suggestion.expand')} onPress={expand} style={styles.action} />
        <Button
          title={t('common.notNow')}
          variant="ghost"
          onPress={() => dismissRangeSuggestion(suggestion.direction, suggestion.suggestedMidi)}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, marginTop: spacing.md },
  body: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  action: { flex: 1 },
});
