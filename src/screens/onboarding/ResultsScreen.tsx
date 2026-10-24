import { useProfileStore } from '@/entities/profile';
import type { OnboardingScreenProps } from '@/app/navigation/types';
import { useTranslation } from '@/shared/i18n';
import { RangeResultsLayout } from '../vocal-range/RangeResultsLayout';

/** The end of first-launch onboarding: celebratory-but-professional summary, then into the app. */
export function ResultsScreen({ navigation, route }: OnboardingScreenProps<'Results'>) {
  const { low, high } = route.params;
  const { t } = useTranslation();
  const setDetectedRange = useProfileStore((s) => s.setDetectedRange);

  // navigating (not replacing) so the back gesture from Goals still works;
  // re-taps are harmless — saving the same range twice is idempotent
  const save = () => {
    setDetectedRange({ lowMidi: low.midi, highMidi: high.midi }, (low.confidence + high.confidence) / 2);
    navigation.navigate('PracticeRhythm');
  };

  return (
    <RangeResultsLayout
      title={t('onboarding.results.title')}
      subtitle={t('onboarding.results.subtitle')}
      low={low.midi}
      high={high.midi}
      startOverLabel={t('onboarding.results.startOver')}
      saveLabel={t('onboarding.results.save')}
      onBack={() => navigation.navigate('Lowest')}
      onStartOver={() => navigation.navigate('Reminder')}
      onSave={save}
    />
  );
}
