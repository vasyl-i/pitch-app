/**
 * Practice reminder settings: toggle on/off, pick time with spinner,
 * and save. Mirrors the onboarding reminder screen but with a back button,
 * toggle switch, and no skip option.
 */
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usePreferencesStore } from '@/features/learning';
import { requestNotificationPermissions, schedulePracticeReminder, cancelPracticeReminder } from '@/shared/lib/notifications';
import { AppText, BackButton, Button, Screen, TimeDropdown } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { formatTime, intlLocale, useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';

const BELL_IMAGE = require('../../../assets/notification-bell.png');

export function ReminderSettingsScreen({ navigation }: RootScreenProps<'ReminderSettings'>) {
  const { t } = useTranslation();
  const { palette, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const storedHour = usePreferencesStore((s) => s.preferences?.reminderHour ?? null);
  const storedMinute = usePreferencesStore((s) => s.preferences?.reminderMinute ?? 0);
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const [enabled, setEnabled] = useState(storedHour != null);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(storedHour ?? 19, storedMinute, 0, 0);
    return d;
  });

  const handleTimeChange = (_: unknown, selected?: Date) => {
    if (selected) setDate(selected);
  };

  const handleToggle = () => {
    if (enabled) {
      setEnabled(false);
    } else {
      setEnabled(true);
      setDate((prev) => {
        const d = new Date();
        d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return d;
      });
    }
  };

  // Detect whether anything changed from the persisted values
  const storedEnabled = storedHour != null;
  const hasChanges =
    enabled !== storedEnabled ||
    (enabled && (date.getHours() !== storedHour || date.getMinutes() !== storedMinute));


  const save = async () => {
    if (enabled) {
      const hour = date.getHours();
      const minute = date.getMinutes();
      setPreferences({ reminderHour: hour, reminderMinute: minute });
      const granted = await requestNotificationPermissions();
      if (granted) {
        await schedulePracticeReminder(hour, minute);
      }
      Toast.show({
        type: 'success',
        text1: t('profile.reminderSettings.saved'),
        text2: t('profile.reminderSettings.savedBody', { time: formatTime(date) }),
      });
    } else {
      setPreferences({ reminderHour: null });
      await cancelPracticeReminder();
      Toast.show({
        type: 'info',
        text1: t('profile.reminderSettings.disabledToast'),
      });
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {/* Header: icon + text */}
        <View style={styles.top}>
          <Image source={BELL_IMAGE} style={styles.bellImage} resizeMode="contain" />
          <AppText
            variant="title"
            style={{ fontSize: 40, textAlign: 'center', fontFamily: typography.family.bold, marginTop: spacing.lg }}
          >
            {t('onboarding.reminder.title')}
          </AppText>
          <AppText
            variant="body"
            color={palette.textPrimary}
            style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 20 }}
          >
            {t('onboarding.reminder.subtitle')}
          </AppText>
        </View>

        {/* Toggle row */}
        <Pressable accessibilityRole="button" onPress={handleToggle}>
          {({ pressed }) => (
            <View style={[styles.toggleRow, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.iconBox, { backgroundColor: enabled ? palette.accent : '#1E1D1F' }]}>
                <Ionicons
                  name={enabled ? 'notifications' : 'notifications-off'}
                  size={18}
                  color={enabled ? '#08070C' : '#FFFFFF'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" style={{ fontSize: 16 }}>
                  {t('onboarding.reminder.title')}
                </AppText>
                <AppText variant="caption" style={{ marginTop: 2 }}>
                  {enabled ? t('profile.reminderSettings.enabled') : t('profile.reminderSettings.disabled')}
                </AppText>
              </View>
              <View style={[styles.toggle, { backgroundColor: enabled ? palette.accent : '#2A2A2C' }]}>
                <View style={[styles.toggleKnob, { alignSelf: enabled ? 'flex-end' : 'flex-start' }]} />
              </View>
            </View>
          )}
        </Pressable>

        {/* Time picker */}
        {enabled && (
          <View style={styles.pickerSection}>
            <View style={styles.labelRow}>
              <Ionicons name="time-outline" size={18} color={palette.textPrimary} />
              <AppText variant="body" style={{ fontFamily: typography.family.medium, color: palette.textPrimary, fontSize: 18 }}>
                {t('onboarding.reminder.setTime')}
              </AppText>
            </View>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                style={{ alignSelf: 'center' }}
                value={date}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={5}
                themeVariant="dark"
                locale={intlLocale()}
              />
            ) : (
              <TimeDropdown value={date} onChange={setDate} minuteInterval={5} />
            )}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Save button */}
        <Button
          title={t('common.save')}
          onPress={save}
          disabled={!hasChanges}
          style={{ backgroundColor: '#ffffff', marginTop: spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  top: {
    alignItems: 'center',
    paddingTop: 40,
  },
  bellImage: {
    width: 100,
    height: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  pickerSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
});
