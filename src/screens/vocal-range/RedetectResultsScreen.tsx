import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useProfileStore } from '@/entities/profile';
import { ResultsCard } from '@/features/vocal-range';
import type { ProfileScreenProps } from '@/app/navigation/types';

/** Same results presentation as onboarding, but returns to Settings instead of into the app. */
export function RedetectResultsScreen({ navigation, route }: ProfileScreenProps<'RedetectResults'>) {
  const { low, high } = route.params;
  const { spacing } = useTheme();
  const setDetectedRange = useProfileStore((s) => s.setDetectedRange);
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (saving) return;
    setSaving(true);
    const confidence = (low.confidence + high.confidence) / 2;
    setDetectedRange({ lowMidi: low.midi, highMidi: high.midi }, confidence);
    navigation.navigate('VocalRangeSettings');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />

        <AppText variant="title" style={{ fontSize: 26, textAlign: 'center', marginTop: spacing.lg }}>
          Updated range
        </AppText>
        <View style={{ marginTop: spacing.xl }}>
          <ResultsCard low={low.midi} high={high.midi} />
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: spacing.md }}>
          <Button title="Save" onPress={save} disabled={saving} />
          <Button title="Start over" variant="ghost" onPress={() => navigation.navigate('RedetectLow')} disabled={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}
