/**
 * Onboarding: pick how many minutes per day the user wants to practice.
 * Saves dailyMinutes to preferences (local + backend via sync) and
 * regenerates the weekly plan to match.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { generateDefaultWeeklyPlan, usePreferencesStore, type DailyMinutes } from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { AppText, Button, FlowScreen, HeroMessage } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const CLOCK_IMAGE = require('../../../assets/hourglass.png');
const OPTIONS: DailyMinutes[] = [5, 10, 15];

export function PracticeRhythmScreen({ navigation }: OnboardingScreenProps<'PracticeRhythm'>) {
  const { t } = useTranslation();
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const { isPremium } = usePremiumStatus();
  const [selected, setSelected] = useState<DailyMinutes>(5);

  const save = () => {
    setPreferences({ dailyMinutes: selected, weeklyPlan: generateDefaultWeeklyPlan(selected, isPremium ? 'premium' : 'free') });
    navigation.navigate('Reminder');
  };

  return (
    <FlowScreen onBack={navigation.goBack}>
      <HeroMessage
        illustration={<Image source={CLOCK_IMAGE} style={styles.clock} resizeMode="contain" />}
        title={t('onboarding.rhythm.title')}
        body={t('onboarding.rhythm.subtitle')}
        style={styles.hero}
      >
        <View style={styles.pills}>
          {OPTIONS.map((minutes) => (
            <MinutesPill key={minutes} label={t('common.minutesShort', { count: minutes })} active={selected === minutes} onPress={() => setSelected(minutes)} />
          ))}
        </View>
      </HeroMessage>
      <View style={styles.fill} />
      <Button title={t('common.continue')} onPress={save} />
    </FlowScreen>
  );
}

function MinutesPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.activePill]}>
      <AppText variant="small" weight="medium" color={active ? palette.black : palette.textPrimary} gradient={false}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 0, paddingTop: 100, gap: 20 },
  clock: { width: 100, height: 100 },
  pills: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl },
  pill: { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: palette.surface },
  activePill: { backgroundColor: palette.white },
  fill: { flex: 1 },
});
