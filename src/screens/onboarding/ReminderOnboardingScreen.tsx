/**
 * Onboarding step 3: set a daily practice reminder time.
 * On Save → request notification permissions, schedule reminder, complete onboarding.
 * On Skip → complete onboarding without requesting permissions.
 */
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { track } from '@/shared/lib/analytics';
import { usePreferencesStore } from '@/features/learning';
import { useProfileStore } from '@/entities/profile';
import { requestNotificationPermissions, schedulePracticeReminder } from '@/shared/lib/notifications';
import { AppText, BackButton, Button, HeroMessage, Screen, TimePicker } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const BELL_IMAGE = require('../../../assets/notification-bell.png');

export function ReminderOnboardingScreen({ navigation }: OnboardingScreenProps<'Reminder'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });

  const finish = () => {
    completeOnboarding();
    track('onboarding_completed');
    navigation.replace('Main', { screen: 'HomeTab', params: { screen: 'Today' } });
  };

  const save = async () => {
    const hour = time.getHours();
    const minute = time.getMinutes();
    setPreferences({ reminderHour: hour, reminderMinute: minute });
    if (await requestNotificationPermissions()) await schedulePracticeReminder(hour, minute);
    finish();
  };

  return (
    <Screen noBottomPadding>
      <View style={styles.backRow}>
        <BackButton onPress={navigation.goBack} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View>
          <HeroMessage
            illustration={<Image source={BELL_IMAGE} style={styles.bell} resizeMode="contain" />}
            title={t('onboarding.reminder.title')}
            body={t('onboarding.reminder.subtitle')}
            style={styles.hero}
          />
          <View style={styles.picker}>
            <TimePicker label={t('onboarding.reminder.setTime')} value={time} onChange={setTime} />
          </View>
        </View>

        <View>
          <Pressable onPress={finish} style={styles.skip}>
            <AppText variant="body" color={palette.textPrimary}>
              {t('common.skip')}
            </AppText>
          </Pressable>
          <Button title={t('common.save')} onPress={save} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', marginBottom: spacing.lg },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  hero: { flex: 0, paddingTop: spacing.lg, gap: 20 },
  bell: { width: 118, height: 118 },
  picker: { marginTop: 40 },
  skip: { alignSelf: 'center', marginBottom: spacing.md },
});
