/**
 * Customise what goes into daily practice: how much ear training vs melody
 * work, and which specific exercises to include or exclude.
 */
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { CATALOG, DEFAULT_PREFERENCES, usePreferencesStore, type LearningPreferences } from '@/features/learning';
import { AppText, BackButton, ChipGroup, Screen, ScreenHeader, type ChipOption } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { ExerciseToggleList } from './ExerciseToggleList';

const MINUTES = [5, 10, 15, 20, 30] as LearningPreferences['dailyMinutes'][];
const EAR_ACTIVITIES = CATALOG.filter((a) => a.kind === 'ear');
const MELODY_ACTIVITIES = CATALOG.filter((a) => a.kind === 'melody');

export function ExerciseSettingsScreen({ navigation }: RootScreenProps<'ExerciseSettings'>) {
  const { t } = useTranslation();
  const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const disabled = new Set(prefs.disabledExercises ?? []);

  const balanceOptions: ChipOption<number>[] = [
    { value: 0.2, label: t('profile.exerciseSettingsScreen.moreEar') },
    { value: 0.5, label: t('profile.exerciseSettingsScreen.balanced') },
    { value: 0.8, label: t('profile.exerciseSettingsScreen.moreMelodies') },
  ];
  const minuteOptions = MINUTES.map((m) => ({ value: m, label: t('common.minutesShort', { count: m }) }));

  const toggle = (id: string) => {
    const next = new Set(disabled);
    if (!next.delete(id)) next.add(id);
    setPreferences({ disabledExercises: [...next] });
  };
  const isEnabled = (id: string) => !disabled.has(id);

  return (
    <Screen noBottomPadding>
      {/* fixed above the scrolling list */}
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenHeader title={t('profile.exerciseSettings')} subtitle={t('profile.exerciseSettingsScreen.subtitle')} large />

        <ChipGroup title={t('profile.prefs.dailyTime')} options={minuteOptions} selected={[prefs.dailyMinutes]} onSelect={(v) => setPreferences({ dailyMinutes: v })} />
        <ChipGroup
          title={t('profile.exerciseSettingsScreen.balance')}
          options={balanceOptions}
          selected={[prefs.exerciseBalance ?? 0.5]}
          onSelect={(v) => setPreferences({ exerciseBalance: v })}
        />

        <ExerciseToggleList title={t('profile.exerciseSettingsScreen.earExercises')} items={EAR_ACTIVITIES} isEnabled={isEnabled} onToggle={toggle} />
        <ExerciseToggleList title={t('profile.exerciseSettingsScreen.melodyExercises')} items={MELODY_ACTIVITIES} isEnabled={isEnabled} onToggle={toggle} />

        <Pressable onPress={() => setPreferences({ exerciseBalance: 0.5, disabledExercises: [] })} style={styles.reset} hitSlop={12}>
          {({ pressed }) => (
            <AppText variant="small" color={palette.accent} style={pressed && styles.pressed}>
              {t('profile.exerciseSettingsScreen.reset')}
            </AppText>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg + spacing.sm, paddingBottom: spacing.xxl },
  reset: { marginTop: spacing.xl, alignSelf: 'center' },
  pressed: { opacity: 0.7 },
});
