/**
 * The Account tab: you and your setup. Your voice (range), your goal and
 * preferences, the practice library, and (moved here from their former
 * top-level tabs) Progress and Journey.
 */
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, voiceType } from '@/entities/profile';
import { useAuthStore } from '@/features/auth';
import { GOAL_LABELS, usePreferencesStore } from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { useSoundStore, SOUND_TYPE_LABELS } from '@/shared/audio';
import { midiToName } from '@/shared/lib/music';
import { AppText, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { palette, spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const prefs = usePreferencesStore((s) => s.preferences);
  const premium = usePremiumStatus();
  const soundType = useSoundStore((s) => s.soundType);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const guest = useAuthStore((s) => s.guest);
  const range = profile?.comfortRange ?? null;

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'All your progress, settings, and practice history will be lost forever.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete my account', style: 'destructive', onPress: () => deleteAccount() },
            ]);
          },
        },
      ],
    );
  };

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
            icon="volume-high"
            title="Sound"
            subtitle={`${SOUND_TYPE_LABELS[soundType]} wave`}
            onPress={() => navigation.navigate('SoundSettings')}
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

        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          <Row
            icon="log-out"
            title="Log out"
            subtitle={guest ? 'You are using the app as a guest' : 'Sign out of your account'}
            onPress={handleLogout}
          />
          {!guest && (
            <Row
              icon="trash"
              title="Delete account"
              subtitle="Permanently remove your account and all data"
              destructive
              onPress={handleDeleteAccount}
            />
          )}
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
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** accent border for the upgrade CTA */
  highlight?: boolean;
  /** red text for dangerous actions */
  destructive?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card variant={highlight ? 'highlighted' : 'default'} style={[styles.row, pressed && { opacity: 0.85 }]}>
          <IconBubble name={icon} size={40} iconSize={18} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }} color={destructive ? palette.danger : undefined}>
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
