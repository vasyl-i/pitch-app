/**
 * The Account tab: you and your setup. Your voice (range), your goal and
 * preferences, the practice library, and (moved here from their former
 * top-level tabs) Progress and Journey.
 */
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, voiceType } from '@/entities/profile';
import { useAuthStore } from '@/features/auth';
import { GOAL_LABELS, usePreferencesStore } from '@/features/learning';
import { usePremiumStatus } from '@/features/subscription';
import { useSoundStore, SOUND_TYPE_LABELS } from '@/shared/audio';
import { midiToName } from '@/shared/lib/music';
import { AppText, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ProfileScreenProps } from '@/app/navigation/types';

function reminderSubtitle(hour: number | null, minute: number): string {
  if (hour == null) return 'Off — tap to set a daily reminder';
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `Daily at ${h}:${m} ${period}`;
}

const ICON_COLORS = [
  '#E84855', '#F67828', '#F5B700', '#44AF69',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
] as const;

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { palette, spacing } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const profile = useProfileStore((s) => s.profile);
  const prefs = usePreferencesStore((s) => s.preferences);
  const premium = usePremiumStatus();
  const soundType = useSoundStore((s) => s.soundType);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const guest = useAuthStore((s) => s.guest);
  const user = useAuthStore((s) => s.user);
  const isEmailUser = user?.app_metadata?.provider === 'email';
  const range = profile?.comfortRange ?? null;
  let colorIndex = 0;

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    if (premium.isPremium) {
      const manageUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      Alert.alert(
        'Active subscription',
        'You have an active Premium subscription. Please cancel it in your device\'s subscription settings first, then delete your account. Deleting your account will not automatically cancel your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Manage subscription', onPress: () => Linking.openURL(manageUrl) },
          {
            text: 'Delete anyway',
            style: 'destructive',
            onPress: () => confirmDeleteAccount(),
          },
        ],
      );
    } else {
      confirmDeleteAccount();
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('11111111');
            Alert.alert('Are you sure?', 'All your progress, settings, and practice history will be lost forever.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete my account', style: 'destructive', onPress: () => {
                deleteAccount().catch(() => {
                  Toast.show({ type: 'error', text1: 'Something went wrong', text2: 'Please try again later' });
                });
              }},
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
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
        <AppText color={palette.textPrimary}
                 style={[styles.heading, { fontFamily: typography.family.bold }]}>
          Account
        </AppText>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Row
            icon={premium.isPremium ? 'sparkles' : 'star'}
            title={premium.isPremium ? 'Premium' : 'Upgrade to Premium'}
            subtitle={premiumSubtitle}
            iconColor={palette.accent}
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
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('VocalRangeSettings')}
          />
          <Row
            icon="volume-high"
            title="Sound"
            subtitle={`${SOUND_TYPE_LABELS[soundType]} wave`}
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('SoundSettings')}
          />
          <Row
            icon="flag"
            title="Goal & preferences"
            subtitle={
              prefs
                ? `${GOAL_LABELS[prefs.primaryGoal]} · ${prefs.dailyMinutes} min a day`
                : "Set what you're working toward"
            }
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('LearningPreferences')}
          />
          <Row
            icon="options"
            title="Exercise settings"
            subtitle="Choose which exercises appear in your daily plan"
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('ExerciseSettings')}
          />
          <Row
            icon="calendar"
            title="Weekly plan"
            subtitle="Customise exercises for each day of the week"
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('WeeklyPlan')}
          />
          <Row
            icon="notifications"
            title="Practice reminder"
            subtitle={reminderSubtitle(prefs?.reminderHour ?? null, prefs?.reminderMinute ?? 0)}
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => navigation.navigate('ReminderSettings')}
            last
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Row
            icon="document-text"
            title="Privacy policy"
            subtitle="How we handle your data"
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/privacy-policy.html')}
          />
          <Row
            icon="shield-checkmark"
            title="Terms of service"
            subtitle="Rules for using the app"
            bgColor={ICON_COLORS[colorIndex++ % ICON_COLORS.length]}
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/terms-of-service.html')}
            last
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          {isEmailUser && (
            <Row
              icon="key"
              title="Change password"
              subtitle="Update your account password"
              bgColor="#F67828"
              onPress={() => navigation.navigate('NewPassword', { requireOldPassword: true })}
            />
          )}
          <Row
            icon="log-out"
            title="Log out"
            subtitle={guest ? 'You are using the app as a guest' : 'Sign out of your account'}
            bgColor="#E84855"
            onPress={handleLogout}
            last={!!guest}
          />
          {!guest && (
            <Row
              icon="trash"
              title="Delete account"
              subtitle="Permanently remove your account and all data"
              iconColor={palette.danger}
              destructive
              last
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
  bgColor,
  iconColor,
  destructive = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  bgColor?: string;
  iconColor?: string;
  /** red text for dangerous actions */
  destructive?: boolean;
  /** suppress bottom border on last item in a group */
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.row, !last && styles.border, pressed && { opacity: 0.7 }]}>
          <View style={[styles.iconContainer, bgColor ? { backgroundColor: bgColor } : undefined]}>
            <Ionicons name={icon} size={18} color={iconColor ?? '#FFFFFF'} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 16 }} color={destructive ? palette.danger : undefined}>
              {title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 3 }}>
              {subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  heading: {
    fontSize: 24,
    lineHeight: 28,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1E1D1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
