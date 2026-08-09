/**
 * The Account tab: you and your setup. Your voice (range), your goal and
 * preferences, the practice library, and (moved here from their former
 * top-level tabs) Progress and Journey.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, voiceType } from '@/entities/profile';
import { GOAL_LABELS, usePreferencesStore } from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { midiToName } from '@/shared/lib/music';
import { AppText, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { palette, spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const prefs = usePreferencesStore((s) => s.preferences);
  const premium = usePremiumStatus();
  const range = profile?.comfortRange ?? null;

  const premiumSubtitle = premium.isPremium
    ? premium.status === 'trialing'
      ? `Free trial · ${premium.trialDaysLeft ?? 0} day${premium.trialDaysLeft === 1 ? '' : 's'} left`
      : `${premium.plan?.name ?? 'Premium'} · active`
    : 'Your personal AI vocal coach — feedback, weak-spot drills & more';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <AppText variant="title" style={{ fontSize: 40 }}>
          Account
        </AppText>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Row
            icon={premium.isPremium ? 'sparkles' : 'star'}
            title={premium.isPremium ? 'Premium' : 'Upgrade to Premium'}
            subtitle={premiumSubtitle}
            highlight={!premium.isPremium}
            onPress={() =>
              premium.isPremium
                ? navigation.navigate('ManageSubscription')
                : navigation.navigate('Paywall', { source: 'profile' })
            }
          />
          <Row
            icon="mic"
            title="Vocal range"
            subtitle={
              range
                ? `${midiToName(range.lowMidi)} – ${midiToName(range.highMidi)} · ≈${voiceType(range)}`
                : 'Not measured yet — exercises fit better once it is'
            }
            onPress={() => navigation.navigate('VocalRangeSettings')}
          />
          <Row
            icon="flag"
            title="Goal & preferences"
            subtitle={
              prefs
                ? `${GOAL_LABELS[prefs.primaryGoal]} · ${prefs.dailyMinutes} min a day`
                : 'Set what you’re working toward'
            }
            onPress={() => navigation.navigate('LearningPreferences')}
          />
          <Row
            icon="albums"
            title="Practice library"
            subtitle="Explore any exercise freely, outside your daily practice"
            onPress={() => navigation.navigate('PracticeLibrary')}
          />
          <Row
            icon="stats-chart"
            title="Progress"
            subtitle="Trends, streaks, and your practice calendar"
            onPress={() => navigation.navigate('ProgressOverview')}
          />
          <Row
            icon="map"
            title="Journey"
            subtitle="What you've learned, by musical ability"
            onPress={() => navigation.navigate('JourneyOverview')}
          />
        </View>

        <AppText variant="caption" style={{ textAlign: 'center', marginTop: spacing.xxl }}>
          Uses your microphone. Audio never leaves the device.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  highlight = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** accent border for the upgrade CTA */
  highlight?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card variant={highlight ? 'highlighted' : 'default'} style={[styles.row, pressed && { opacity: 0.85 }]}>
          <IconBubble name={icon} size={40} iconSize={18} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }}>
              {title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 3 }}>
              {subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
