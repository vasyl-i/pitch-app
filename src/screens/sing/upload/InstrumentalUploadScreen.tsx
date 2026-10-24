/**
 * Upload an instrumental (backing track). The user picks an audio file they
 * have rights to; the app never separates vocals or pulls audio from
 * streaming services (see docs/LEGAL_AND_COMPLIANCE.md). Free tier keeps up
 * to 3 tracks; Premium lifts the cap.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FREE_INSTRUMENTAL_LIMIT, useInstrumentalStore } from '@/features/instrumental';
import { useEntitlement, usePaywall } from '@/features/subscription';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { SingScreenProps } from '@/app/navigation/types';
import { TrackRow } from './TrackRow';

export function InstrumentalUploadScreen({ navigation }: SingScreenProps<'InstrumentalUpload'>) {
  const { t } = useTranslation();
  const tracks = useInstrumentalStore((s) => s.tracks);
  const addTrack = useInstrumentalStore((s) => s.addTrack);
  const removeTrack = useInstrumentalStore((s) => s.removeTrack);
  const unlimited = useEntitlement('unlimited-instrumental-uploads');
  const openPaywall = usePaywall('instrumental-upload', 'unlimited-instrumental-uploads');
  const atFreeLimit = !unlimited && tracks.length >= FREE_INSTRUMENTAL_LIMIT;

  const pick = async () => {
    if (atFreeLimit) return openPaywall();
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;
    const track = addTrack({ filename: result.assets[0].name, uri: result.assets[0].uri });
    navigation.navigate('InstrumentalAnalyzing', { trackId: track.id });
  };

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="score" style={styles.title}>
          {t('sing.upload.title')}
        </AppText>
        <AppText variant="body" style={styles.body}>
          {t('sing.upload.body')}
        </AppText>

        <View style={styles.section}>
          <Button title={t('sing.upload.cta')} onPress={pick} />
          {!unlimited && (
            <AppText variant="caption" center style={styles.limit}>
              {t('sing.upload.freeUsed', { used: tracks.length, limit: FREE_INSTRUMENTAL_LIMIT })}
              {atFreeLimit ? t('sing.upload.goPremium') : ''}
            </AppText>
          )}
        </View>

        {tracks.length > 0 && (
          <View style={[styles.section, styles.tracks]}>
            <AppText variant="caption">{t('sing.upload.yourTracks')}</AppText>
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                onPress={() => navigation.navigate(track.key ? 'InstrumentalSing' : 'InstrumentalAnalyzing', { trackId: track.id })}
                onRemove={() => removeTrack(track.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { marginTop: spacing.sm },
  body: { marginTop: spacing.xs },
  section: { marginTop: spacing.xl },
  limit: { marginTop: spacing.sm },
  tracks: { gap: spacing.sm },
});
