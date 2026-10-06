/**
 * The Account tab: you and your setup. Your voice (range), your goal and
 * preferences, the practice library, and (moved here from their former
 * top-level tabs) Progress and Journey.
 */
import { Alert, Image, ImageBackground, type ImageSourcePropType, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

const ICONS = {
  microphone: require('../../../assets/account-tab/microphone.png'),
  sound: require('../../../assets/account-tab/sound.png'),
  goals: require('../../../assets/account-tab/goals.png'),
  exercise: require('../../../assets/account-tab/exercise.png'),
  weeklyPlan: require('../../../assets/account-tab/weekly-plan.png'),
  reminder: require('../../../assets/account-tab/reminder.png'),
  privacyPolicy: require('../../../assets/account-tab/privacy-policy.png'),
  terms: require('../../../assets/account-tab/terms.png'),
  logOut: require('../../../assets/account-tab/log-out.png'),
  delete: require('../../../assets/account-tab/delete.png'),
  message: require('../../../assets/account-tab/message.png'),
  settings: require('../../../assets/account-tab/settings.png'),
  arrowRight: require('../../../assets/account-tab/arrow-right.png'),
};
import { useProfileStore, voiceType } from '@/entities/profile';
import { useAuthStore } from '@/features/auth';
import { GOAL_LABELS, usePreferencesStore } from '@/features/learning';
import { usePremiumStatus, usePaywall } from '@/features/subscription';
import { useSoundStore, SOUND_TYPE_LABELS } from '@/shared/audio';
import { midiToName } from '@/shared/lib/music';
import { AppText, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ProfileScreenProps } from '@/app/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { todayColor } from '@/screens/home/todayPalette';

const UNLOCK_BG = require('../../../assets/background-unlock.png');

function reminderSubtitle(hour: number | null, minute: number): string {
  if (hour == null) return 'Off — tap to set a daily reminder';
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `Daily at ${h}:${m} ${period}`;
}

function formatTimeLeft(endMs: number): string {
  const diff = endMs - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days > 60) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'} left`;
  }
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { palette, spacing, radii } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const profile = useProfileStore((s) => s.profile);
  const prefs = usePreferencesStore((s) => s.preferences);
  const premium = usePremiumStatus();
  const openPaywall = usePaywall('profile');
  const soundType = useSoundStore((s) => s.soundType);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const guest = useAuthStore((s) => s.guest);
  const user = useAuthStore((s) => s.user);
  const isEmailUser = user?.app_metadata?.provider === 'email';
  const range = profile?.comfortRange ?? null;

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

  const handleBannerPress = () => {
    if (guest) {
      Alert.alert(
        'Sign in required',
        'Create an account or sign in to unlock Premium and keep your progress safe across devices.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => signOut() },
        ],
      );
    } else if (premium.isPremium) {
      navigation.navigate('ManageSubscription');
    } else {
      openPaywall();
    }
  };

  const bannerTitle = premium.isPremium
    ? 'PitchGym Premium'
    : 'Unlock all exercises';

  const bannerSubtitle = premium.isPremium
    ? premium.status === 'trialing'
      ? `Free trial · ${premium.trialDaysLeft ?? 0} day${premium.trialDaysLeft === 1 ? '' : 's'} left`
      : premium.currentPeriodEnd
        ? `${premium.plan?.name ?? 'Premium'} · ${formatTimeLeft(premium.currentPeriodEnd)}`
        : `${premium.plan?.name ?? 'Premium'} · Active`
    : 'Get unlimited access to improve your voice';

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <AppText color={palette.textPrimary}
                   style={[styles.heading, { fontFamily: typography.family.bold }]}>
            Account
          </AppText>
        </View>

        {/* Premium banner */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Pressable onPress={handleBannerPress} style={[styles.banner, { borderRadius: 10 }]}>
            <ImageBackground source={UNLOCK_BG} style={styles.bannerBg} imageStyle={{ borderRadius: 10 }}>
              <Image source={require('../../../assets/unlock-cat.png')} style={styles.bannerCat} resizeMode="contain" />
              <View style={styles.bannerTextWrap}>
                <AppText variant="body" style={{ fontSize: 16, lineHeight: 20, color: '#0D022F', fontFamily: typography.family.medium }}>
                  {bannerTitle}
                </AppText>
                <AppText variant="body" style={{ fontSize: 12, lineHeight: 16, color: '#3D3E42', fontFamily: typography.family.regular }}>
                  {bannerSubtitle}
                </AppText>
              </View>
              <Image source={ICONS.arrowRight} style={[styles.chevron, { marginRight: 16 }]} tintColor={"#21222C"} />

            </ImageBackground>
          </Pressable>
        </View>

        {/* Settings */}
        <SectionHeader label="Settings" />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.microphone}
            title="Vocal range"
            subtitle={
              range
                ? `${midiToName(range.lowMidi)} — ${midiToName(range.highMidi)} · ≈${voiceType(range)}`
                : 'Not measured yet'
            }
            onPress={() => navigation.navigate('VocalRangeSettings')}
          />
          <Row
            icon={ICONS.sound}
            title="Sound"
            subtitle={`${SOUND_TYPE_LABELS[soundType]} wave`}
            onPress={() => navigation.navigate('SoundSettings')}
          />
          <Row
            icon={ICONS.goals}
            title="Goal & preferences"
            subtitle={
              prefs
                ? `${GOAL_LABELS[prefs.primaryGoal]} · ${prefs.dailyMinutes} min a day`
                : "Set what you're working toward"
            }
            onPress={() => navigation.navigate('LearningPreferences')}
          />
          <Row
            icon={ICONS.settings}
            title="Exercise settings"
            subtitle="Choose which exercises appear in your daily plan"
            onPress={() => navigation.navigate('ExerciseSettings')}
          />
          <Row
            icon={ICONS.weeklyPlan}
            title="Weekly plan"
            subtitle="Customize exercises for each day of the week"
            onPress={() => navigation.navigate('WeeklyPlan')}
          />
          <Row
            icon={ICONS.reminder}
            title="Practice reminder"
            subtitle={reminderSubtitle(prefs?.reminderHour ?? null, prefs?.reminderMinute ?? 0)}
            last
            onPress={() => navigation.navigate('ReminderSettings')}
          />
        </View>

        {/* Legal */}
        <SectionHeader label="Legal" />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.privacyPolicy}
            title="Privacy policy"
            subtitle="How we handle your data"
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/privacy-policy.html')}
          />
          <Row
            icon={ICONS.terms}
            title="Terms of service"
            subtitle="Rules for using the app"
            last
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/terms-of-service.html')}
          />
        </View>

        {/* Account */}
        <SectionHeader label="Account" />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          {isEmailUser && (
            <Row
              icon={ICONS.settings}
              title="Change password"
              subtitle="Update your account password"
              onPress={() => navigation.navigate('NewPassword', { requireOldPassword: true })}
            />
          )}
          <Row
            icon={ICONS.logOut}
            title="Log out"
            subtitle={guest ? 'You are using the app as a guest' : 'Sign out of your account'}
            onPress={handleLogout}
            last={!guest || !isEmailUser}
          />
          {!guest && (
            <Row
              icon={ICONS.delete}
              title="Delete account"
              subtitle="Permanently remove your account and all data"
              destructive
              last
              onPress={handleDeleteAccount}
            />
          )}
        </View>

        {/* Feedback & Support */}
        <SectionHeader label="Feedback & Support" />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.message}
            title="Share your thoughts about PitchGym"
            subtitle="We'll be happy to hear from you"
            last
            onPress={() => Linking.openURL('mailto:support@pitchgym.app?subject=PitchGym Feedback')}
          />
        </View>

        <AppText variant="caption" color={palette.textFaint} style={{ textAlign: 'center', marginTop: spacing.xxl }}>
          Uses your microphone. Audio never leaves the device.
        </AppText>
        <AppText variant="caption" color={palette.textFaint} style={{ textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md }}>
          Version {require('../../../app.json').expo.version}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { palette, spacing } = useTheme();
  return (
    <AppText
      variant="caption"
      color={palette.textSecondaryElevated}
      style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm, fontSize: 12 }}
    >
      {label}
    </AppText>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  destructive = false,
  last = false,
}: {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable style={styles.pressableRow} accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}>
          <View style={styles.iconCircle}>
            <Image source={icon} style={[styles.iconImage, destructive && { tintColor: '#F95F4F' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ fontSize: 14 }} color={destructive ? palette.danger : palette.textPrimary}>
              {title}
            </AppText>
            <AppText variant="caption" color={"#CDC9C9"} style={{ marginTop: 2, fontSize: 12 }}>
              {subtitle}
            </AppText>
          </View>
          <Image source={ICONS.arrowRight} style={styles.chevron} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    lineHeight: 28,
  },
  banner: { width: '100%', overflow: 'hidden' },
  bannerBg: { flexDirection: 'row', alignItems: 'center', height: 72 },
  bannerCat: { width: 64, height: 64, marginLeft: 12, marginBottom: -8 },
  bannerTextWrap: { flex: 1, marginLeft: 24, gap: 2 },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  pressableRow: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#CDC9C91A" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#525158B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 20,
    height: 20,
  },
  chevron: {
    width: 16,
    height: 16,
  },
});
