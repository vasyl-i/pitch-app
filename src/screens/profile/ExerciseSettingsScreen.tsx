/**
 * Customise what goes into daily practice: how much ear training vs melody
 * work, and which specific exercises to include or exclude.
 */
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CATALOG,
  DEFAULT_PREFERENCES,
  usePreferencesStore,
  type LearningPreferences,
} from '@/features/learning';
import { AppText, BackButton, ChipGroup, Screen, type ChipOption } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';

const MINUTES = [5, 10, 15, 20, 30] as LearningPreferences['dailyMinutes'][];

const earActivities = CATALOG.filter((a) => a.kind === 'ear');
const melodyActivities = CATALOG.filter((a) => a.kind === 'melody');

export function ExerciseSettingsScreen({
  navigation,
}: RootScreenProps<'ExerciseSettings'>) {
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
  const balanceOptions: ChipOption<number>[] = [
    { value: 0.2, label: t('profile.exerciseSettingsScreen.moreEar') },
    { value: 0.5, label: t('profile.exerciseSettingsScreen.balanced') },
    { value: 0.8, label: t('profile.exerciseSettingsScreen.moreMelodies') },
  ];
  const minuteOptions: ChipOption<LearningPreferences['dailyMinutes']>[] = MINUTES.map((m) => ({
    value: m,
    label: t('common.minutesShort', { count: m }),
  }));
  const prefs =
    usePreferencesStore((s) => s.preferences) ?? {
      ...DEFAULT_PREFERENCES,
      updatedAt: 0,
    };
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const disabled = new Set(prefs.disabledExercises ?? []);
  const balance = prefs.exerciseBalance ?? 0.5;

  const toggleExercise = (id: string) => {
    const next = new Set(disabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPreferences({ disabledExercises: [...next] });
  };

  const resetDefaults = () => {
    setPreferences({ exerciseBalance: 0.5, disabledExercises: [] });
  };

  return (
    <Screen noBottomPadding>
      <View style={{ paddingBottom: 16 }}>
      <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.sm }}>
          {t('profile.exerciseSettings')}
        </AppText>
        <AppText variant="body" style={{ marginTop: spacing.xs }}>
          {t('profile.exerciseSettingsScreen.subtitle')}
        </AppText>

        <ChipGroup
          title={t('profile.prefs.dailyTime')}
          options={minuteOptions}
          selected={[prefs.dailyMinutes]}
          onSelect={(v) => setPreferences({ dailyMinutes: v })}
        />

        <ChipGroup
          title={t('profile.exerciseSettingsScreen.balance')}
          options={balanceOptions}
          selected={[balance]}
          onSelect={(v) => setPreferences({ exerciseBalance: v })}
        />

        {/* Ear training toggles */}
        <View style={{ marginTop: spacing.xl }}>
          <AppText
            variant="caption"
            style={{ fontSize: 13, color: palette.textSecondary }}
          >
            {t('profile.exerciseSettingsScreen.earExercises')}
          </AppText>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {earActivities.map((a) => (
              <ToggleRow
                key={a.id}
                title={a.title}
                enabled={!disabled.has(a.id)}
                onToggle={() => toggleExercise(a.id)}
              />
            ))}
          </View>
        </View>

        {/* Melody toggles */}
        <View style={{ marginTop: spacing.xl }}>
          <AppText
            variant="caption"
            style={{ fontSize: 13, color: palette.textSecondary }}
          >
            {t('profile.exerciseSettingsScreen.melodyExercises')}
          </AppText>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {melodyActivities.map((a) => (
              <ToggleRow
                key={a.id}
                title={a.title}
                enabled={!disabled.has(a.id)}
                onToggle={() => toggleExercise(a.id)}
              />
            ))}
          </View>
        </View>

        {/* Reset */}
        <Pressable
          onPress={resetDefaults}
          style={{ marginTop: spacing.xl, alignSelf: 'center' }}
          hitSlop={12}
        >
          {({ pressed }) => (
            <AppText
              variant="caption"
              style={{
                fontSize: 14,
                color: palette.accent,
                opacity: pressed ? 0.7 : 1,
              }}
            >
              {t('profile.exerciseSettingsScreen.reset')}
            </AppText>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  title,
  enabled,
  onToggle,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { palette, spacing, radii } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
      })}
    >
      <AppText
        variant="body"
        style={{ flex: 1, fontSize: 15 }}
        color={enabled ? palette.textPrimary : palette.textFaint}
      >
        {title}
      </AppText>
      <Ionicons
        name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={enabled ? palette.accent : palette.textFaint}
      />
    </Pressable>
  );
}
