import { useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useProfileStore } from '@/entities/profile';
import type { RootScreenProps } from '@/app/navigation/types';
import { RangeResultsLayout } from './RangeResultsLayout';

/** Same results presentation as onboarding, but returns to Settings instead of into the app. */
export function RedetectResultsScreen({ navigation, route }: RootScreenProps<'RedetectResults'>) {
  const { low, high } = route.params;
  const { t } = useTranslation();
  const setDetectedRange = useProfileStore((s) => s.setDetectedRange);
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (saving) return;
    setSaving(true);
    setDetectedRange({ lowMidi: low.midi, highMidi: high.midi }, (low.confidence + high.confidence) / 2);
    navigation.popTo('VocalRangeSettings');
  };

  return (
    <RangeResultsLayout
      title={t('vocalRange.redetect.title')}
      low={low.midi}
      high={high.midi}
      startOverLabel={t('onboarding.results.startOver')}
      saveLabel={t('common.save')}
      onBack={navigation.goBack}
      onStartOver={() => navigation.navigate('RedetectLow')}
      onSave={save}
      busy={saving}
    />
  );
}
