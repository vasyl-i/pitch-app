import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, spacing, whiteAlpha } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** the reminder's on/off row: bell, state, and a switch */
export function ReminderToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onToggle}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && styles.pressed]}>
          <View style={[styles.icon, enabled && styles.iconOn]}>
            <Ionicons name={enabled ? 'notifications' : 'notifications-off'} size={18} color={enabled ? palette.background : palette.white} />
          </View>
          <View style={styles.text}>
            <AppText variant="label">{t('onboarding.reminder.title')}</AppText>
            <AppText variant="caption" style={styles.state}>
              {enabled ? t('profile.reminderSettings.enabled') : t('profile.reminderSettings.disabled')}
            </AppText>
          </View>
          <View style={[styles.track, enabled && styles.trackOn]}>
            <View style={[styles.knob, enabled && styles.knobOn]} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: spacing.lg,
    backgroundColor: whiteAlpha(0.04),
  },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.iconWell },
  iconOn: { backgroundColor: palette.accent },
  text: { flex: 1 },
  state: { marginTop: 2 },
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center', backgroundColor: palette.switchTrack },
  trackOn: { backgroundColor: palette.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.white, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },
});
