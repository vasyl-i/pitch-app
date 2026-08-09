/** Detecting the uploaded track's key, then straight into singing. */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { detectKey, useInstrumentalStore } from '@/features/instrumental';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { SingScreenProps } from '@/app/navigation/types';

export function InstrumentalAnalyzingScreen({ navigation, route }: SingScreenProps<'InstrumentalAnalyzing'>) {
  const { palette, spacing } = useTheme();
  const track = useInstrumentalStore((s) => s.tracks.find((t) => t.id === route.params.trackId));
  const setTrackKey = useInstrumentalStore((s) => s.setTrackKey);

  useEffect(() => {
    if (!track) {
      navigation.replace('InstrumentalUpload');
      return;
    }
    let cancelled = false;
    detectKey(track.uri).then((key) => {
      if (cancelled) return;
      setTrackKey(track.id, key);
      navigation.replace('InstrumentalSing', { trackId: track.id });
    });
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

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
