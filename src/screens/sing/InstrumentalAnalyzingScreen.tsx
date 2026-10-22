/** Detecting the uploaded track's key, then straight into singing. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { detectKey, useInstrumentalStore } from '@/features/instrumental';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { SingScreenProps } from '@/app/navigation/types';

export function InstrumentalAnalyzingScreen({ navigation, route }: SingScreenProps<'InstrumentalAnalyzing'>) {
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
  const track = useInstrumentalStore((s) => s.tracks.find((tr) => tr.id === route.params.trackId));
  const setTrackKey = useInstrumentalStore((s) => s.setTrackKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!track) {
      navigation.replace('InstrumentalUpload');
      return;
    }
    let cancelled = false;
    setError(null);
    detectKey(track.uri)
      .then((key) => {
        if (cancelled) return;
        setTrackKey(track.id, key);
        navigation.replace('InstrumentalSing', { trackId: track.id });
      })
      .catch(() => {
        if (!cancelled) setError(t('sing.analyzing.error'));
      });
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  if (error) {
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <AppText variant="title" style={{ fontSize: 22, textAlign: 'center' }}>
            {t('common.somethingWentWrong')}
          </AppText>
          <AppText variant="body" style={{ textAlign: 'center' }}>{error}</AppText>
          <Button title={t('common.goBack')} onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <ActivityIndicator size="large" color={palette.accent} />
        <AppText variant="title" style={{ fontSize: 22, textAlign: 'center' }}>
          {t('sing.analyzing.title')}
        </AppText>
        <AppText variant="body" style={{ textAlign: 'center' }}>
          {t('sing.analyzing.body')}
        </AppText>
      </View>
    </Screen>
  );
}
