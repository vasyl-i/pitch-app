import { Pressable, StyleSheet, View } from 'react-native';
import type { JourneyMilestone } from '@/features/learning';
import { AppText, Card, IconBubble } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

// plain glyphs, not the filled "-circle" variants — those draw their own
// solid disc, which turns into an inverted white blob once IconBubble
// forces it to a single white color instead of sitting on its blur circle
const ICONS = { done: 'checkmark', current: 'play', upcoming: 'ellipse-outline', locked: 'lock-closed' } as const;

/** a milestone: done and current ones can be replayed as free practice */
export function MilestoneRow({ milestone: m, onReplay }: { milestone: JourneyMilestone; onReplay: () => void }) {
  const { t } = useTranslation();
  const caption = {
    done: t('home.status.completed'),
    current: t('journey.current'),
    upcoming: t('journey.upcoming'),
    locked: m.lockedHint ?? t('journey.locked'),
  }[m.state];

  const card = (pressed = false) => (
    <Card style={[styles.card, m.state === 'locked' && styles.locked, pressed && styles.pressed]}>
      <IconBubble name={ICONS[m.state]} size={36} iconSize={16} />
      <View style={styles.text}>
        <AppText variant="small" color={palette.textPrimary}>
          {m.node.title}
        </AppText>
        <AppText variant="caption" style={styles.caption}>
          {caption}
        </AppText>
      </View>
    </Card>
  );

  if (m.state !== 'done' && m.state !== 'current') return card();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={m.state === 'done' ? t('journey.replay') : t('home.practice')} onPress={onReplay}>
      {({ pressed }) => card(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locked: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
  caption: { marginTop: 2 },
});
