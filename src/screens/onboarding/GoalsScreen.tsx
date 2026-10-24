/**
 * Onboarding step 2: pick which areas the user wants to improve.
 * Multi-select, skip-able. Choices influence daily/weekly exercise mix
 * via `improvementGoals` in learning preferences.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMPROVEMENT_GOAL_LABELS, type ImprovementGoal, usePreferencesStore } from '@/features/learning';
import { useProfileStore } from '@/entities/profile';
import { AppText, Button, ProgressCircle, Screen } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const GOAL_OPTIONS: { id: ImprovementGoal; icon: ImageSourcePropType }[] = [
  { id: 'sing-in-tune', icon: require('../../../assets/onboarding/tune.png') },
  { id: 'hit-notes', icon: require('../../../assets/onboarding/note.png') },
  { id: 'feel-confident', icon: require('../../../assets/onboarding/perfomance.png') },
];

/** Map onboarding improvement goals to the primary learning goal for the lesson generator. */
function derivePrimaryGoal(goals: ImprovementGoal[]): 'sing-in-tune' | 'train-ear' | 'vocal-control' {
  if (goals.includes('sing-in-tune')) return 'sing-in-tune';
  if (goals.includes('hit-notes')) return 'train-ear';
  return 'vocal-control';
}

export function GoalsScreen({ navigation }: OnboardingScreenProps<'Goals'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const advanceOnboarding = useProfileStore((s) => s.advanceOnboarding);
  const [selected, setSelected] = useState<ImprovementGoal[]>([]);

  const toggle = (id: ImprovementGoal) => setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const next = (save: boolean) => {
    if (save && selected.length > 0) setPreferences({ improvementGoals: selected, primaryGoal: derivePrimaryGoal(selected) });
    advanceOnboarding('goals-complete');
    navigation.navigate('RangeStart');
  };

  return (
    <Screen noBottomPadding>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View />
        <View>
          <AppText variant="headline" center>
            {t('onboarding.goals.title')}
          </AppText>
          <AppText variant="body" color={palette.textPrimary} center style={styles.subtitle}>
            {t('onboarding.goals.subtitle')}
          </AppText>
          <View style={styles.options}>
            {GOAL_OPTIONS.map((opt) => (
              <GoalOption key={opt.id} icon={opt.icon} label={IMPROVEMENT_GOAL_LABELS[opt.id]} selected={selected.includes(opt.id)} onPress={() => toggle(opt.id)} />
            ))}
          </View>
        </View>
        <View>
          <Pressable onPress={() => next(false)} style={styles.skip}>
            <AppText variant="body" color={palette.textPrimary}>
              {t('common.skip')}
            </AppText>
          </Pressable>
          <Button title={t('common.continue')} onPress={() => next(true)} disabled={selected.length === 0} />
        </View>
      </View>
    </Screen>
  );
}

function GoalOption({ icon, label, selected, onPress }: { icon: ImageSourcePropType; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.option}>
      <Image source={icon} style={styles.icon} resizeMode="contain" />
      <AppText variant="body" weight="medium" color={palette.textPrimary} style={styles.label}>
        {label}
      </AppText>
      {selected && <ProgressCircle totalRounds={1} completedRounds={1} done size={16} strokeWidth={0.5} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  subtitle: { marginTop: spacing.sm },
  options: { marginTop: spacing.xxl, gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  icon: { width: 52, height: 52 },
  label: { flex: 1 },
  skip: { alignSelf: 'center', marginBottom: spacing.md },
});
