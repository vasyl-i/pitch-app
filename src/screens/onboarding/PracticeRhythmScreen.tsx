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
import type { OnboardingScreenProps } from '@/app/navigation/types';

const CLOCK_IMAGE = require('../../../assets/time.png');

const OPTIONS: { value: DailyMinutes; label: string }[] = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

export function PracticeRhythmScreen({ navigation }: OnboardingScreenProps<'PracticeRhythm'>) {
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
            style={{ fontSize: 30, textAlign: 'center', fontFamily: typography.family.bold, marginTop: spacing.lg }}
          >
            Set your practice{'\n'}rhythm
          </AppText>
          <AppText
            variant="body"
            color={palette.textSecondary}
            style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 16 }}
          >
            Even 5 minutes can bring you closer{'\n'}to better pitch.
          </AppText>

          <View style={[styles.pills, { marginTop: spacing.xxl }]}>
            {OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelected(opt.value)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? palette.accent : palette.surface,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{
                      fontFamily: typography.family.medium,
                      fontSize: 16,
                      color: active ? '#000000' : palette.textPrimary,
                    }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title="Continue"
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
    gap: 12,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
