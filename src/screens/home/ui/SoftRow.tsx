import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, IconBubble } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { SoftCard } from './SoftCard';

/** A tappable, icon-led row — the "Set your goal" / "Weak spots" pattern. */
export function SoftRow({ icon, title, subtitle, onPress, badge }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: ReactNode;
}) {
  return (
    <SoftCard onPress={onPress} style={styles.row}>
      <IconBubble name={icon} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="label" color={todayColor.ink}>
            {title}
          </AppText>
          {badge}
        </View>
        <AppText variant="caption" color={todayColor.inkSecondary} style={styles.subtitle}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={todayColor.inkFaint} />
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subtitle: { marginTop: 3 },
});
