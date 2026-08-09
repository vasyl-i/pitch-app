import { ScrollView, View } from 'react-native';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useProfileStore } from '@/entities/profile';
import { ResultsCard } from '@/features/vocal-range';
import type { OnboardingScreenProps } from '@/app/navigation/types';

/** The end of first-launch onboarding: celebratory-but-professional summary, then into the app. */
export function ResultsScreen({ navigation, route }: OnboardingScreenProps<'Results'>) {
  const { low, high } = route.params;
  const { spacing } = useTheme();
  const setDetectedRange = useProfileStore((s) => s.setDetectedRange);

  // navigating (not replacing) so the back gesture from Goals still works;
  // re-taps are harmless — saving the same range twice is idempotent
  const save = () => {
    const confidence = (low.confidence + high.confidence) / 2;
    setDetectedRange({ lowMidi: low.midi, highMidi: high.midi }, confidence);
    // learning-profile questions come last, once the range is safely saved
    navigation.navigate('Goals');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />

        <AppText variant="title" style={{ fontSize: 28, textAlign: 'center', marginTop: spacing.lg }}>
          You’ve found your range!
        </AppText>
        <AppText variant="body" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          Every exercise from here will fit your voice.
        </AppText>

        <View style={{ marginTop: spacing.xl }}>
          <ResultsCard low={low.midi} high={high.midi} />
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing.md }}>
          <Button title="Save & continue" onPress={save} />
          <Button title="Start over" variant="ghost" onPress={() => navigation.navigate('Lowest')} />
        </View>
      </ScrollView>
    </Screen>
  );
}
