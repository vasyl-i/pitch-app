import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeakSpot } from '@/features/learning';
import { AppText, Card, IconBubble } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

const KIND_ICON: Record<WeakSpot['kind'], keyof typeof Ionicons.glyphMap> = {
  interval: 'swap-vertical',
  register: 'trending-up',
  note: 'musical-note',
  stability: 'pulse',
  rhythm: 'timer-outline',
  skill: 'school-outline',
};

/** a weak spot: what it is, the measurement behind it, and the drill for it (tap to start) */
export function SpotCard({ spot, onPress }: { spot: WeakSpot; onPress: () => void }) {
  const { t } = useTranslation();
  const playable = spot.activity !== undefined;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${spot.title}. ${spot.evidence}`} disabled={!playable} onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.head}>
            <IconBubble name={KIND_ICON[spot.kind]} size={36} iconSize={16} />
            <AppText variant="label" style={styles.title}>
              {spot.title}
            </AppText>
            {playable && <Ionicons name="play-circle" size={22} color={palette.accent} />}
          </View>
          <AppText variant="caption" style={styles.evidence}>
            {spot.evidence}
          </AppText>
          {playable && (
            <AppText variant="caption" color={palette.textSecondary} style={styles.drill}>
              {t('weakSpots.drill', { title: spot.activity?.title ?? '' })}
            </AppText>
          )}
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1 },
  evidence: { marginTop: 6 },
  drill: { marginTop: spacing.sm },
});
