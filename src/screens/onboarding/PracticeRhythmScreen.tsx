/**
 * Onboarding: pick how many minutes per day the user wants to practice.
 * Saves dailyMinutes to preferences (local + backend via sync) and
 * regenerates the weekly plan to match.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateDefaultWeeklyPlan, usePreferencesStore, type DailyMinutes } from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const CLOCK_IMAGE = require('../../../assets/hourglass.png');

const OPTIONS: DailyMinutes[] = [5, 10, 15];

export function PracticeRhythmScreen({ navigation }: OnboardingScreenProps<'PracticeRhythm'>) {
  const { t } = useTranslation();
  const { palette, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const { isPremium } = usePremiumStatus();
  const [selected, setSelected] = useState<DailyMinutes>(5);

  const handleContinue = () => {
    setPreferences({
      dailyMinutes: selected,
      weeklyPlan: generateDefaultWeeklyPlan(selected, isPremium ? 'premium' : 'free'),
    });
    navigation.navigate('Reminder');
  };

  return (
    <Screen noBottomPadding>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <BackButton onPress={() => navigation.goBack()}/>
      </View>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.top}>
          <Image source={CLOCK_IMAGE} style={styles.clockImage} resizeMode="contain" />
          <AppText
            variant="title"
            style={{ fontSize: 40, textAlign: 'center', fontFamily: typography.family.bold, marginTop: 20, lineHeight: 40 }}
          >
            {t('onboarding.rhythm.title')}
          </AppText>
          <AppText
            variant="body"
            gradient
            style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 20 }}
          >
            {t('onboarding.rhythm.subtitle')}
          </AppText>

          <View style={[styles.pills, { marginTop: 58 }]}>
            {OPTIONS.map((minutes) => {
              const active = selected === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => setSelected(minutes)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? palette.white : palette.surface,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{
                      fontFamily: typography.family.medium,
                      fontSize: 14,
                      lineHeight: 16,
                      color: active ? '#000000' : palette.textPrimary,
                    }}
                  >
                    {t('common.minutesShort', { count: minutes })}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title={t('common.continue')}
          onPress={handleContinue}
          style={{ backgroundColor: '#ffffff' }}
        />
      </View>
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
    paddingTop: 120,
  },
  clockImage: {
    width: 100,
    height: 100,
  },
  pills: {
    flexDirection: 'row',
    gap: 24,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
});
