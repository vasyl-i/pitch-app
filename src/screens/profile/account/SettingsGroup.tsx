import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';

export interface SettingsRowData {
  key: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** the row's icon image, or an emoji (e.g. a flag) drawn in its place */
  icon: ImageSourcePropType | string;
  destructive?: boolean;
}

const CHEVRON = require('../../../../assets/account-tab/arrow-right.png');

/** a titled group of tappable settings rows on one rounded surface */
export function SettingsGroup({ label, rows, compact }: { label: string; rows: SettingsRowData[]; compact: boolean }) {
  return (
    <>
      <AppText variant="caption" color={palette.textSecondaryElevated} style={styles.label}>
        {label}
      </AppText>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <SettingsRow key={row.key} row={row} last={i === rows.length - 1} compact={compact} />
        ))}
      </View>
    </>
  );
}

function SettingsRow({ row, last, compact }: { row: SettingsRowData; last: boolean; compact: boolean }) {
  return (
    <Pressable style={styles.pressable} accessibilityRole="button" onPress={row.onPress}>
      {({ pressed }) => (
        <View style={[styles.row, !last && styles.divided, pressed && styles.pressed]}>
          <View style={styles.iconCircle}>
            {typeof row.icon === 'string' ? (
              <AppText variant="heading" weight="regular" gradient={false}>
                {row.icon}
              </AppText>
            ) : (
              <Image source={row.icon} style={[styles.icon, row.destructive && styles.destructiveIcon]} />
            )}
          </View>
          <View style={styles.text}>
            <AppText variant="small" weight="medium" color={row.destructive ? palette.danger : palette.textPrimary}>
              {row.title}
            </AppText>
            {/* narrow phones get shorter copy (`profile.compact`); this only trims what still overflows there */}
            <AppText variant="caption" color={palette.textSubtle} numberOfLines={compact ? 1 : undefined} style={styles.subtitle}>
              {row.subtitle}
            </AppText>
          </View>
          <Image source={CHEVRON} style={styles.chevron} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { marginHorizontal: spacing.lg, borderRadius: 10, backgroundColor: palette.surface, overflow: 'hidden' },
  pressable: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  divided: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.divider },
  pressed: { opacity: 0.7 },
  iconCircle: { width: 36, height: 36, borderRadius: radii.sm + 2, backgroundColor: palette.iconCircle, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 20, height: 20 },
  destructiveIcon: { tintColor: palette.danger },
  text: { flex: 1 },
  subtitle: { marginTop: 2 },
  chevron: { width: 16, height: 16 },
});
