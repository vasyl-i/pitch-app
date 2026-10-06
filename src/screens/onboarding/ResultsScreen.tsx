import { ScrollView, View } from 'react-native';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { spacing, useTheme } from '@/shared/theme';
import { useProfileStore } from '@/entities/profile';
import { ResultsCard } from '@/features/vocal-range';
import type { OnboardingScreenProps } from '@/app/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The end of first-launch onboarding: celebratory-but-professional summary, then into the app. */
export function ResultsScreen({ navigation, route }: OnboardingScreenProps<'Results'>) {
  const { low, high } = route.params;
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const setDetectedRange = useProfileStore((s) => s.setDetectedRange);

  // navigating (not replacing) so the back gesture from Goals still works;
  // re-taps are harmless — saving the same range twice is idempotent
  const save = () => {
    const confidence = (low.confidence + high.confidence) / 2;
    setDetectedRange({ lowMidi: low.midi, highMidi: high.midi }, confidence);
    navigation.navigate('PracticeRhythm');
  };

  return (
    <Screen noBottomPadding>
      <View style={{ paddingBottom: 16 }}>
        <BackButton onPress={() => navigation.navigate('Lowest')} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.lg }}>

        <AppText variant="title" style={{ fontSize: 40, textAlign: 'center', marginTop: spacing.lg }}>
          You’ve found your range!
        </AppText>
        <AppText gradient style={{ fontSize: 20, textAlign: 'center', marginTop: spacing.sm }}>
          Every exercise from here will fit your voice.
        </AppText>

        <View style={{ marginTop: spacing.xxl }}>
          <ResultsCard low={low.midi} high={high.midi} success />
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing.md }}>
          <Button title="Start over" variant="transparent" onPress={() => navigation.navigate('Reminder')} />
          <Button title="Save & continue" onPress={save} />
        </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
