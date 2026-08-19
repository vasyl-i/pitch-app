/**
 * Upload an instrumental (backing track). The user picks an audio file they
 * have rights to; the app never separates vocals or pulls audio from
 * streaming services (see docs/LEGAL_AND_COMPLIANCE.md). Free tier keeps up
 * to 3 tracks; Premium lifts the cap.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { FREE_INSTRUMENTAL_LIMIT, useInstrumentalStore } from '@/features/instrumental';
import { useEntitlement, usePaywall } from '@/features/subscription';
import { AppText, BackButton, Button, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { SingScreenProps } from '@/app/navigation/types';

export function InstrumentalUploadScreen({ navigation }: SingScreenProps<'InstrumentalUpload'>) {
  const { palette, spacing } = useTheme();
  const tracks = useInstrumentalStore((s) => s.tracks);
  const addTrack = useInstrumentalStore((s) => s.addTrack);
  const removeTrack = useInstrumentalStore((s) => s.removeTrack);
  const unlimited = useEntitlement('unlimited-instrumental-uploads');
  const openPaywall = usePaywall('instrumental-upload', 'unlimited-instrumental-uploads');

  const atFreeLimit = !unlimited && tracks.length >= FREE_INSTRUMENTAL_LIMIT;

  const pick = async () => {
    if (atFreeLimit) {
      openPaywall();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const track = addTrack({ filename: asset.name, uri: asset.uri });
    navigation.navigate('InstrumentalAnalyzing', { trackId: track.id });
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40, marginTop: spacing.sm }}>
          Sing with instrumental
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          Upload a backing track you have the rights to use. The app detects its key and grades your
          singing against it.
        </AppText>

        <View style={{ marginTop: spacing.xl }}>
          <Button title="Upload instrumental" onPress={pick} />
          {!unlimited && (
            <AppText variant="caption" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              {tracks.length} of {FREE_INSTRUMENTAL_LIMIT} free tracks used
              {atFreeLimit ? ' — go Premium for unlimited uploads' : ''}
            </AppText>
          )}
        </View>

        {tracks.length > 0 && (
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <AppText variant="caption">Your tracks</AppText>
            {tracks.map((track) => (
              <Pressable
                key={track.id}
                accessibilityRole="button"
                onPress={() =>
                  track.key
                    ? navigation.navigate('InstrumentalSing', { trackId: track.id })
                    : navigation.navigate('InstrumentalAnalyzing', { trackId: track.id })
                }
              >
                {({ pressed }) => (
                  <Card style={[styles.row, pressed && { opacity: 0.85 }]}>
                    <IconBubble name="musical-note" size={40} iconSize={18} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" numberOfLines={1}>
                        {track.filename}
                      </AppText>
                      <AppText variant="caption" style={{ marginTop: 2 }}>
                        {track.key ? track.key.keyName : 'Not analyzed yet'}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${track.filename}`}
                      onPress={() => removeTrack(track.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color={palette.textFaint} />
                    </Pressable>
                  </Card>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
