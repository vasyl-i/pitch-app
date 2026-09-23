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
import { usePreferencesStore } from '@/features/learning';
import { useProfileStore } from '@/entities/profile';
import { requestNotificationPermissions, schedulePracticeReminder } from '@/shared/lib/notifications';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const BELL_IMAGE = require('../../../assets/notifications.png');

export function ReminderOnboardingScreen({ navigation }: OnboardingScreenProps<'Reminder'>) {
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
    navigation.replace('Paywall', { source: 'onboarding' });
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
      <ScrollView contentContainerStyle={[styles.root]}>
        <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.lg, justifyContent: "space-between"  }}>
        {/* Top section: icon + text */}
        <View style={styles.top}>
          <Image source={BELL_IMAGE} style={styles.bellImage} resizeMode="contain" />
          <AppText
            variant="title"
            style={{ fontSize: 40, textAlign: 'center', fontFamily: typography.family.bold, marginTop: spacing.lg }}
          >
            Daily reminder
          </AppText>
          <AppText
            variant="body"
            color={palette.textPrimary}
            style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 20 }}
          >
            Get notifications to speed up your{'\n'}progress.
          </AppText>
          {/* Middle: time picker */}
          <View style={styles.pickerSection}>
            <View style={styles.labelRow}>
              <Ionicons name="time-outline" size={18} color={palette.textPrimary} />
              <AppText variant="body" style={{ fontFamily: typography.family.medium, color: palette.textPrimary, fontSize: 18 }}>
                Set reminder time
              </AppText>
            </View>
            <DateTimePicker
                style={{ alignSelf: 'center' }}
                value={date}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={5}
                themeVariant="dark"
            />
          </View>
        </View>


        {/* Bottom: Skip + Save */}
        <View>
          <Pressable onPress={skip} style={{ alignSelf: 'center', marginBottom: spacing.md }}>
            <AppText variant="body" color={palette.textPrimary}>
              Skip
            </AppText>
          </Pressable>
          <Button
            title="Save"
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
    paddingTop: 60,
  },
  bellImage: {
    width: 100,
    height: 100,
  },
  pickerSection: {
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
