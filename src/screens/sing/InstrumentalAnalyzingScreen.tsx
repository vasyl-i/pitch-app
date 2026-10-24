/** Detecting the uploaded track's key, then straight into singing. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { detectKey, useInstrumentalStore } from '@/features/instrumental';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { SingScreenProps } from '@/app/navigation/types';

export function InstrumentalAnalyzingScreen({ navigation, route }: SingScreenProps<'InstrumentalAnalyzing'>) {
  const { t } = useTranslation();
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
      .catch(() => !cancelled && setError(t('sing.analyzing.error')));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  return (
    <Screen>
      {error && <BackButton onPress={navigation.goBack} />}
      <View style={styles.center}>
        {!error && <ActivityIndicator size="large" color={palette.accent} />}
        <AppText variant="heading" center>
          {error ? t('common.somethingWentWrong') : t('sing.analyzing.title')}
        </AppText>
        <AppText variant="body" center>
          {error ?? t('sing.analyzing.body')}
        </AppText>
        {error && <Button title={t('common.goBack')} onPress={navigation.goBack} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
