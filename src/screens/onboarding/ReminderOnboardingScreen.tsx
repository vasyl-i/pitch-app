/**
 * Onboarding step 3: set a daily practice reminder time.
 * On Save → request notification permissions, schedule reminder, complete onboarding.
 * On Skip → complete onboarding without requesting permissions.
 */
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { track } from '@/shared/lib/analytics';
import { usePreferencesStore } from '@/features/learning';
import { useProfileStore } from '@/entities/profile';
import { requestNotificationPermissions, schedulePracticeReminder } from '@/shared/lib/notifications';
import { AppText, BackButton, Button, Screen, TimeDropdown } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { intlLocale, useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const BELL_IMAGE = require('../../../assets/notification-bell.png');

export function ReminderOnboardingScreen({ navigation }: OnboardingScreenProps<'Reminder'>) {
  const { t } = useTranslation();
  const { palette, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });

  const handleTimeChange = (_: unknown, selected?: Date) => {
    if (selected) setDate(selected);
  };

  const finishOnboarding = () => {
    completeOnboarding();
    track('onboarding_completed');
    navigation.replace('Main', { screen: 'HomeTab', params: { screen: 'Today' } });
  };

  const save = async () => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    setPreferences({ reminderHour: hour, reminderMinute: minute });
    const granted = await requestNotificationPermissions();
    if (granted) {
      await schedulePracticeReminder(hour, minute);
    }
    finishOnboarding();
  };

  const skip = () => {
    finishOnboarding();
  };

  return (
    <Screen noBottomPadding>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <BackButton onPress={() => navigation.goBack()}/>
      </View>
      <ScrollView contentContainerStyle={[styles.root]}>
        <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.lg, justifyContent: "space-between"  }}>
        {/* Top section: icon + text */}
        <View style={styles.top}>
          <Image source={BELL_IMAGE} style={styles.bellImage} resizeMode="contain" />
          <AppText
            variant="title"
            style={{ fontSize: 40, textAlign: 'center', fontFamily: typography.family.bold, marginTop: 20 }}
          >
            {t('onboarding.reminder.title')}
          </AppText>
          <AppText
            variant="body"
            gradient
            style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 20 }}
          >
            {t('onboarding.reminder.subtitle')}
          </AppText>
          {/* Middle: time picker */}
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
        </View>


        {/* Bottom: Skip + Save */}
        <View>
          <Pressable onPress={skip} style={{ alignSelf: 'center', marginBottom: spacing.md }}>
            <AppText variant="body" color={palette.textPrimary}>
              {t('common.skip')}
            </AppText>
          </Pressable>
          <Button
            title={t('common.save')}
            onPress={save}
            style={{ backgroundColor: '#ffffff' }}
          />
        </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
    paddingTop: 16,
  },
  bellImage: {
    width: 118,
    height: 118,
  },
  pickerSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 40,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
});
