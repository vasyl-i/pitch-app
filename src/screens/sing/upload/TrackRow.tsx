import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { useInstrumentalStore } from '@/features/instrumental';
import { AppText, Card, IconBubble } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { formatKeyName, useTranslation } from '@/shared/i18n';

type Track = ReturnType<typeof useInstrumentalStore.getState>['tracks'][number];

/** an uploaded track: its name and detected key; tap to sing (or finish analysing), bin to remove */
export function TrackRow({ track, onPress, onRemove }: { track: Track; onPress: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          <IconBubble name="musical-note" size={40} iconSize={18} />
          <View style={styles.text}>
            <AppText variant="label" numberOfLines={1}>
              {track.filename}
            </AppText>
            <AppText variant="caption" style={styles.key}>
              {track.key ? formatKeyName(track.key.keyName) : t('sing.upload.notAnalyzed')}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('sing.upload.remove', { name: track.filename })} onPress={onRemove} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={palette.textFaint} />
          </Pressable>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
  key: { marginTop: 2 },
});
