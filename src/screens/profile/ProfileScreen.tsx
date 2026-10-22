/**
 * The Account tab: you and your setup. Your voice (range), your goal and
 * preferences, the practice library, and (moved here from their former
 * top-level tabs) Progress and Journey.
 */
import { Alert, Image, type ImageSourcePropType, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { usePremiumStatus } from '@/features/subscription';
import { useSoundStore, SOUND_TYPE_LABELS } from '@/shared/audio';
import { midiToName } from '@/shared/lib/music';
import { AppText, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { currentLanguage, formatTime, LANGUAGE_NAMES, t, useTranslation } from '@/shared/i18n';
import { languageFlag, savedLanguage } from '@/shared/i18n/device';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ProfileScreenProps } from '@/app/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { todayColor } from '@/screens/home/todayPalette';
import { PremiumBanner } from '@/screens/subscription';

const FEEDBACK_EMAIL = 'legal@anyabedrytska.com';

/** No mail app installed (always the case on the iOS Simulator) — show the address instead. */
function openFeedbackEmail() {
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('PitchGym Feedback')}`).catch(() => {
    Toast.show({ type: 'info', text1: t('profile.noEmailApp'), text2: t('profile.writeToUs', { email: FEEDBACK_EMAIL }) });
  });
}

function reminderSubtitle(hour: number | null, minute: number): string {
  if (hour == null) return t('profile.reminderOff');
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  return t('profile.reminderDaily', { time: formatTime(at) });
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { t } = useTranslation();
  const { palette, spacing, radii } = useTheme();
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

  const handleLogout = () => {
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    if (premium.isPremium) {
      const manageUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      Alert.alert(
        t('profile.activeSub.title'),
        t('profile.activeSub.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.activeSub.manage'), onPress: () => Linking.openURL(manageUrl) },
          {
            text: t('profile.activeSub.deleteAnyway'),
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
      t('profile.deleteAccount'),
      t('profile.delete.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('profile.delete.sureTitle'), t('profile.delete.sureMessage'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.delete.confirm'), style: 'destructive', onPress: () => {
                deleteAccount().catch(() => {
                  Toast.show({ type: 'error', text1: t('common.somethingWentWrong'), text2: t('common.tryAgainLater') });
                });
              }},
            ]);
          },
        },
      ],
    );
  };

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <AppText color={palette.textPrimary}
                   style={[styles.heading, { fontFamily: typography.family.bold }]}>
            {t('profile.title')}
          </AppText>
        </View>

        {/* Premium banner */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <PremiumBanner source="profile" />
        </View>

        {/* Settings */}
        <SectionHeader label={t('profile.sections.settings')} />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.microphone}
            title={t('vocalRange.settings.title')}
            subtitle={
              range
                ? `${midiToName(range.lowMidi)} — ${midiToName(range.highMidi)} · ≈${voiceType(range)}`
                : t('profile.notMeasured')
            }
            onPress={() => navigation.navigate('VocalRangeSettings')}
          />
          <Row
            icon={ICONS.sound}
            title={t('profile.sound')}
            subtitle={t('profile.soundWave', { sound: SOUND_TYPE_LABELS[soundType] })}
            onPress={() => navigation.navigate('SoundSettings')}
          />
          <Row
            icon={ICONS.goals}
            title={t('profile.goal')}
            subtitle={
              prefs
                ? `${GOAL_LABELS[prefs.primaryGoal]} · ${t('profile.minutesADay', { count: prefs.dailyMinutes })}`
                : t('profile.goalUnset')
            }
            onPress={() => navigation.navigate('LearningPreferences')}
          />
          <Row
            icon={ICONS.settings}
            title={t('profile.exerciseSettings')}
            subtitle={t('profile.exerciseSettingsSubtitle')}
            onPress={() => navigation.navigate('ExerciseSettings')}
          />
          <Row
            icon={ICONS.weeklyPlan}
            title={t('profile.weeklyPlan')}
            subtitle={t('profile.weeklyPlanSubtitle')}
            onPress={() => navigation.navigate('WeeklyPlan')}
          />
          <Row
            icon={ICONS.reminder}
            title={t('profile.reminder')}
            subtitle={reminderSubtitle(prefs?.reminderHour ?? null, prefs?.reminderMinute ?? 0)}
            onPress={() => navigation.navigate('ReminderSettings')}
          />
          {/* follows the phone until a language is picked here */}
          <Row
            emoji={languageFlag(currentLanguage())}
            title={t('profile.language')}
            subtitle={
              savedLanguage()
                ? LANGUAGE_NAMES[currentLanguage()]
                : t('profile.languageSubtitle', { language: LANGUAGE_NAMES[currentLanguage()] })
            }
            last
            onPress={() => navigation.navigate('LanguageSettings')}
          />
        </View>

        {/* Legal */}
        <SectionHeader label={t('profile.sections.legal')} />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.privacyPolicy}
            title={t('profile.privacy')}
            subtitle={t('profile.privacySubtitle')}
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/privacy-policy.html')}
          />
          <Row
            icon={ICONS.terms}
            title={t('profile.terms')}
            subtitle={t('profile.termsSubtitle')}
            last
            onPress={() => Linking.openURL('https://pitchgym.anyabedrytska.com/terms-of-service.html')}
          />
        </View>

        {/* Account */}
        <SectionHeader label={t('profile.sections.account')} />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          {isEmailUser && (
            <Row
              icon={ICONS.settings}
              title={t('auth.newPassword.changeTitle')}
              subtitle={t('profile.changePasswordSubtitle')}
              onPress={() => navigation.navigate('NewPassword', { requireOldPassword: true })}
            />
          )}
          <Row
            icon={ICONS.logOut}
            title={t('profile.logOut')}
            subtitle={guest ? t('profile.logOutGuest') : t('profile.logOutSubtitle')}
            onPress={handleLogout}
            last={!guest || !isEmailUser}
          />
          {!guest && (
            <Row
              icon={ICONS.delete}
              title={t('profile.deleteAccount')}
              subtitle={t('profile.deleteAccountSubtitle')}
              destructive
              last
              onPress={handleDeleteAccount}
            />
          )}
        </View>

        {/* Feedback & Support */}
        <SectionHeader label={t('profile.sections.feedback')} />
        <View style={[styles.card, { marginHorizontal: spacing.lg, borderRadius: 10 }]}>
          <Row
            icon={ICONS.message}
            title={t('profile.feedback')}
            subtitle={t('profile.feedbackSubtitle')}
            last
            onPress={openFeedbackEmail}
          />
        </View>

        <AppText variant="caption" color={palette.textFaint} style={{ textAlign: 'center', marginTop: spacing.xxl }}>
          {t('profile.micNotice')}
        </AppText>
        <AppText variant="caption" color={palette.textFaint} style={{ textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md }}>
          {t('profile.version', { version: require('../../../app.json').expo.version })}
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
  emoji,
  title,
  subtitle,
  onPress,
  destructive = false,
  last = false,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
} & (
  | { icon: ImageSourcePropType; emoji?: never }
  /** an emoji (e.g. a flag) drawn in place of the icon image */
  | { emoji: string; icon?: never }
)) {
  const { palette } = useTheme();
  return (
    <Pressable style={styles.pressableRow} accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}>
          <View style={styles.iconCircle}>
            {emoji ? (
              <AppText gradient={false} style={styles.iconEmoji}>{emoji}</AppText>
            ) : (
              <Image source={icon} style={[styles.iconImage, destructive && { tintColor: '#F95F4F' }]} />
            )}
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
  iconEmoji: {
    fontSize: 20,
    lineHeight: 24,
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
