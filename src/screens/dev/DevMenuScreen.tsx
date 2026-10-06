/**
 * DEV ONLY — Screen navigator for quick UI testing.
 * Lists every screen in the app with tap-to-navigate.
 * Accessible via triple-tap on the Home screen header (dev builds only).
 */
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';

interface ScreenEntry {
  label: string;
  onPress: (nav: any) => void;
}

const SCREENS: ScreenEntry[] = [
  // Tabs
  { label: '🏠 Today (Home)', onPress: (n) => n.navigate('Main', { screen: 'HomeTab' }) },
  { label: '🎵 Exercises Hub', onPress: (n) => n.navigate('Main', { screen: 'ExercisesTab' }) },
  { label: '📊 Progress', onPress: (n) => n.navigate('Main', { screen: 'ProgressTab' }) },
  { label: '⚙️ Account', onPress: (n) => n.navigate('Main', { screen: 'AccountTab' }) },

  // Progress sub-screens
  { label: '📈 Weekly Review', onPress: (n) => n.navigate('Main', { screen: 'ProgressTab', params: { screen: 'WeeklyReview' } }) },
  { label: '🏆 Perfect Exercises', onPress: (n) => n.navigate('Main', { screen: 'ProgressTab', params: { screen: 'PerfectExercises' } }) },
  { label: '🗺️ Journey Overview', onPress: (n) => n.navigate('Main', { screen: 'ProgressTab', params: { screen: 'JourneyOverview' } }) },

  // Root-level screens
  { label: '🎯 Ear Session (echo-the-note)', onPress: (n) => n.navigate('EarSession', { exerciseId: 'echo-the-note' }) },
  { label: '🎯 Ear Session (major-or-minor)', onPress: (n) => n.navigate('EarSession', { exerciseId: 'major-or-minor' }) },
  { label: '🎯 Ear Session (odd-one-out)', onPress: (n) => n.navigate('EarSession', { exerciseId: 'odd-one-out' }) },
  { label: '🎯 Ear Session (echo-the-melody)', onPress: (n) => n.navigate('EarSession', { exerciseId: 'echo-the-melody' }) },
  { label: '🎯 Ear Session (echo-the-chord)', onPress: (n) => n.navigate('EarSession', { exerciseId: 'echo-the-chord' }) },
  { label: '🎵 Melody Practice', onPress: (n) => n.navigate('MelodyPractice', { exerciseId: 'c-major-scale' }) },
  { label: '✅ Practice Complete', onPress: (n) => n.navigate('PracticeComplete') },
  { label: '🔥 Weak Spots', onPress: (n) => n.navigate('WeakSpots') },
  { label: '💎 Paywall', onPress: (n) => n.navigate('Paywall', { source: 'unknown' }) },
  { label: '🔔 Notifications', onPress: (n) => n.navigate('Notifications') },

  // Settings sub-screens
  { label: '⏰ Reminder Settings', onPress: (n) => n.navigate('ReminderSettings') },
  { label: '📚 Learning Preferences', onPress: (n) => n.navigate('LearningPreferences') },
  { label: '🎛️ Exercise Settings', onPress: (n) => n.navigate('ExerciseSettings') },
  { label: '📅 Weekly Plan', onPress: (n) => n.navigate('WeeklyPlan') },
  { label: '🔊 Sound Settings', onPress: (n) => n.navigate('SoundSettings') },
  { label: '💳 Manage Subscription', onPress: (n) => n.navigate('ManageSubscription') },
  { label: '🎤 Vocal Range Settings', onPress: (n) => n.navigate('VocalRangeSettings') },
  { label: '🔑 Change Password', onPress: (n) => n.navigate('NewPassword', { requireOldPassword: true }) },

  // Onboarding flow
  { label: '👋 Onboarding (Welcome)', onPress: (n) => n.navigate('Onboarding') },
  { label: '🎵 Practice Rhythm', onPress: (n) => n.navigate('Onboarding', { screen: 'PracticeRhythm' }) },

  // Mic calibration states
  { label: '🎙️ Mic Calibration States', onPress: (n) => n.navigate('DevMicCalibration') },

  // Auth screens
  { label: '📧 Check Your Email', onPress: (n) => n.navigate('DevCheckEmail', { email: 'test@example.com', password: 'test1234' }) },

  // Auth (requires sign-out)
  { label: '🚪 Sign In (sign out first)', onPress: (_n) => {
    Alert.alert(
      'Sign out?',
      'This will sign you out so you can see the Sign In screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => useAuthStore.getState().signOut() },
      ],
    );
  }},
];

export function DevMenuScreen() {
  const navigation = useNavigation();
  const { palette, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppText variant="title" gradient={false}>Dev Menu</AppText>
        <Pressable onPress={() => navigation.goBack()}>
          <AppText variant="label" color={palette.accent} gradient={false}>Close</AppText>
        </Pressable>
      </View>
      <FlatList
        data={SCREENS}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            onPress={() => {
              navigation.goBack();
              setTimeout(() => item.onPress(navigation), 100);
            }}
          >
            <AppText variant="label" gradient={false}>{item.label}</AppText>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
});
