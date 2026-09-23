/** Detecting the uploaded track's key, then straight into singing. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { detectKey, useInstrumentalStore } from '@/features/instrumental';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { SingScreenProps } from '@/app/navigation/types';

export function InstrumentalAnalyzingScreen({ navigation, route }: SingScreenProps<'InstrumentalAnalyzing'>) {
  const { palette, spacing } = useTheme();
  const track = useInstrumentalStore((s) => s.tracks.find((t) => t.id === route.params.trackId));
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
        if (!cancelled) setError('Could not detect the key of this track. The file may be corrupted or too short.');
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
            Something went wrong
          </AppText>
          <AppText variant="body" style={{ textAlign: 'center' }}>{error}</AppText>
          <Button title="Go back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <ActivityIndicator size="large" color={palette.accent} />
        <AppText variant="title" style={{ fontSize: 22, textAlign: 'center' }}>
          Listening to your track…
        </AppText>
        <AppText variant="body" style={{ textAlign: 'center' }}>
          Detecting the song key so we can grade your singing against it.
        </AppText>
      </View>
    </Screen>
  );
}
