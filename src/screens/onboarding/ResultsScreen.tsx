import { ScrollView, View } from 'react-native';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { palette, spacing, useTheme } from '@/shared/theme';
import { useProfileStore } from '@/entities/profile';
import { ResultsCard } from '@/features/vocal-range';
import type { OnboardingScreenProps } from '@/app/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';

/** The end of first-launch onboarding: celebratory-but-professional summary, then into the app. */
export function ResultsScreen({ navigation, route }: OnboardingScreenProps<'Results'>) {
  const { low, high } = route.params;
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
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

        <AppText variant="title" color={palette.white} style={{ fontSize: 32, lineHeight: 34, textAlign: "center", marginTop: spacing.lg, paddingBottom: 4 }}>
          {t('onboarding.results.title')}
        </AppText>
        <AppText color={palette.white} gradient style={{ fontSize: 16, lineHeight: 18, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }}>
          {t('onboarding.results.subtitle')}
        </AppText>

        <View style={{ marginTop: spacing.xxl }}>
          <ResultsCard low={low.midi} high={high.midi} success />
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing.md }}>
          <Button title={t('onboarding.results.startOver')} variant="transparent" onPress={() => navigation.navigate('Reminder')} />
          <Button title={t('onboarding.results.save')} onPress={save} />
        </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
