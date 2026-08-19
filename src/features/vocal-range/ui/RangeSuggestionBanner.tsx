/**
 * Surfaces a smart-range-learning suggestion, if the singer has consistently
 * reached beyond their stored comfort range across several recent sittings.
 * Purely a prompt — expanding the range only happens if they tap "Expand".
 */
import { StyleSheet, View } from 'react-native';
import { dismissRangeSuggestion, evaluateRangeSuggestion, useProfileStore, useRangeObservationStore } from '@/entities/profile';
import { midiToName } from '@/shared/lib/music';
import { AppText, Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';

export function RangeSuggestionBanner() {
  const { spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const setComfortRange = useProfileStore((s) => s.setComfortRange);
  // subscribe so a freshly-recorded observation re-renders this banner
  useRangeObservationStore((s) => s.observations.length);
  useRangeObservationStore((s) => s.dismissals.length);
  const suggestion = evaluateRangeSuggestion();

  if (!suggestion || !profile) return null;

  const expand = () => {
    setComfortRange(
      suggestion.direction === 'low'
        ? { lowMidi: suggestion.suggestedMidi, highMidi: profile.comfortRange.highMidi }
        : { lowMidi: profile.comfortRange.lowMidi, highMidi: suggestion.suggestedMidi }
    );
  };

  return (
    <Card variant="highlighted" style={{ ...styles.card, marginTop: spacing.md }}>
      <AppText variant="label">We noticed something</AppText>
      <AppText variant="body" style={{ marginTop: 4 }}>
        You’ve comfortably reached {midiToName(suggestion.suggestedMidi)} in {suggestion.observedSessions} recent sessions. Want to expand
        your vocal range?
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button title="Expand range" onPress={expand} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Not now" variant="ghost" onPress={() => dismissRangeSuggestion(suggestion.direction, suggestion.suggestedMidi)} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
});
