import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { progressCardStyles } from './ChartCard';

/** a card that leads to another screen: icon, title and line, chevron */
export function LinkCard({ icon, title, subtitle, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[progressCardStyles.card, styles.row, pressed && styles.pressed]}>
          <Ionicons name={icon} size={18} color={palette.accent} />
          <View style={styles.text}>
            <AppText variant="small" color={palette.textPrimary}>
              {title}
            </AppText>
            <AppText variant="caption">{subtitle}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
});
