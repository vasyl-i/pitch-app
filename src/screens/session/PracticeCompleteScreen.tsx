/**
 * The end of today's guided practice: a warm close-out with what you did,
 * your streak, and one exit back Home. No decisions, just the win.
 */
import { useMemo, type ReactNode } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLessonSessionStore } from '@/features/learning';
import { currentStreak, formatPracticeTime, localDayKey, useProgressStore } from '@/features/progress';
import { usePremiumStatus, usePaywall } from '@/features/subscription';
import { AppText, Button, Card, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

const UNLOCK_BG = require('../../../assets/background-unlock.png');

function TimeIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 4V8H11M14 8C14 8.78793 13.8448 9.56815 13.5433 10.2961C13.2417 11.0241 12.7998 11.6855 12.2426 12.2426C11.6855 12.7998 11.0241 13.2417 10.2961 13.5433C9.56815 13.8448 8.78793 14 8 14C7.21207 14 6.43185 13.8448 5.7039 13.5433C4.97595 13.2417 4.31451 12.7998 3.75736 12.2426C3.20021 11.6855 2.75825 11.0241 2.45672 10.2961C2.15519 9.56815 2 8.78793 2 8C2 6.4087 2.63214 4.88258 3.75736 3.75736C4.88258 2.63214 6.4087 2 8 2C9.5913 2 11.1174 2.63214 12.2426 3.75736C13.3679 4.88258 14 6.4087 14 8Z"
        stroke="#F3FFA7"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 11 11" fill="none">
      <Path
        d="M3.00016 1.3335V2.3335M7.66683 1.3335V2.3335M1.3335 8.3335V3.3335C1.3335 3.06828 1.43885 2.81393 1.62639 2.62639C1.81393 2.43885 2.06828 2.3335 2.3335 2.3335H8.3335C8.59871 2.3335 8.85307 2.43885 9.0406 2.62639C9.22814 2.81393 9.3335 3.06828 9.3335 3.3335V8.3335M9.3335 8.3335V5.00016C9.3335 4.73495 9.22814 4.48059 9.0406 4.29306C8.85307 4.10552 8.59871 4.00016 8.3335 4.00016H2.3335C2.06828 4.00016 1.81393 4.10552 1.62639 4.29306C1.43885 4.48059 1.3335 4.73495 1.3335 5.00016V8.3335C1.3335 8.59871 1.43885 8.85307 1.62639 9.0406C1.81393 9.22814 2.06828 9.3335 2.3335 9.3335H8.3335C8.59871 9.3335 8.85307 9.22814 9.0406 9.0406C9.22814 8.85307 9.3335 8.59871 9.3335 8.3335ZM5.3335 5.66683H5.33705V5.67039H5.3335V5.66683ZM5.3335 6.66683H5.33705V6.67039H5.3335V6.66683ZM5.3335 7.66683H5.33705V7.67038H5.3335V7.66683ZM4.3335 6.66683H4.33705V6.67039H4.3335V6.66683ZM4.3335 7.66683H4.33705V7.67038H4.3335V7.66683ZM3.3335 6.66683H3.33705V6.67039H3.3335V6.66683ZM3.3335 7.66683H3.33705V7.67038H3.3335V7.66683ZM6.3335 5.66683H6.33705V5.67039H6.3335V5.66683ZM6.3335 6.66683H6.33705V6.67039H6.3335V6.66683ZM6.3335 7.66683H6.33705V7.67038H6.3335V7.66683ZM7.3335 5.66683H7.33705V5.67039H7.3335V5.66683ZM7.3335 6.66683H7.33705V6.67039H7.3335V6.66683Z"
        stroke="#E3F66D"
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ExercisesIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 8.5L7.5 10L10 6.5M14 8C14 8.84533 13.58 9.59333 12.938 10.0453C13.0072 10.4405 12.9801 10.8465 12.8591 11.229C12.738 11.6115 12.5266 11.9592 12.2427 12.2427C11.9592 12.5266 11.6115 12.738 11.229 12.8591C10.8465 12.9801 10.4405 13.0072 10.0453 12.938C9.81481 13.2663 9.50857 13.5343 9.15254 13.7191C8.7965 13.904 8.40117 14.0003 8 14C7.15467 14 6.40667 13.58 5.95467 12.938C5.55949 13.0071 5.15348 12.98 4.77099 12.859C4.38851 12.7379 4.04081 12.5265 3.75733 12.2427C3.47342 11.9592 3.26199 11.6115 3.14095 11.229C3.01991 10.8465 2.99283 10.4405 3.062 10.0453C2.73368 9.81481 2.46575 9.50857 2.28088 9.15254C2.09602 8.7965 1.99967 8.40117 2 8C2 7.15467 2.42 6.40667 3.062 5.95467C2.99283 5.55949 3.01991 5.15346 3.14095 4.77097C3.26199 4.38847 3.47342 4.04078 3.75733 3.75733C4.04081 3.47346 4.38851 3.26206 4.77099 3.14103C5.15348 3.01999 5.55949 2.99289 5.95467 3.062C6.18523 2.73372 6.49148 2.46582 6.84751 2.28096C7.20353 2.0961 7.59885 1.99973 8 2C8.84533 2 9.59333 2.42 10.0453 3.062C10.4405 2.99289 10.8465 3.01999 11.229 3.14103C11.6115 3.26206 11.9592 3.47346 12.2427 3.75733C12.5265 4.04081 12.7379 4.38851 12.859 4.77099C12.98 5.15348 13.0071 5.55949 12.938 5.95467C13.2663 6.18519 13.5343 6.49143 13.7191 6.84747C13.904 7.2035 14.0003 7.59884 14 8Z"
        stroke="#E3F66D"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PracticeCompleteScreen({ navigation }: RootScreenProps<'PracticeComplete'>) {
  const { palette, spacing, radii } = useTheme();
  const sessions = useProgressStore((s) => s.sessions);
  const steps = useLessonSessionStore((s) => s.steps);
  const { isPremium } = usePremiumStatus();
  const openPaywall = usePaywall('practice-complete');

  const streak = useMemo(() => currentStreak(sessions), [sessions]);
  const today = useMemo(() => {
    const key = localDayKey(Date.now());
    const todays = sessions.filter((s) => localDayKey(s.at) === key);
    const seconds = todays.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
    return { count: todays.length, time: formatPracticeTime(seconds) };
  }, [sessions]);

  return (
    <Screen>
      <View style={styles.center}>
        <Image source={require('../../../assets/practice-complete.png')} />
        <AppText variant="title" style={{ fontSize: 40, marginTop: 20, textAlign: 'center' }}>
          You did it!
        </AppText>
        <AppText variant="body" gradient style={{ fontSize: 20, marginTop: spacing.lg, textAlign: 'center', paddingHorizontal: 24, fontFamily: typography.family.regular }}>
          {steps.length} steps done. Showing up is the whole secret — see you tomorrow.
        </AppText>

        <View style={[styles.tiles, { marginTop: spacing.xl }]}>
          <Tile icon={<TimeIcon />} value={today.time} label="time today" />
          <Tile icon={<CalendarIcon />} value={`${streak}d`} label="days in a row" />
          <Tile icon={<ExercisesIcon />} value={String(today.count)} label="exercises" />
        </View>

        {!isPremium && (
          <Pressable onPress={openPaywall} style={[styles.banner, { borderRadius: radii.lg, marginTop: spacing.xl }]}>
            <ImageBackground source={UNLOCK_BG} style={styles.bannerBg} imageStyle={{ borderRadius: radii.lg }}>
              <Image source={require('../../../assets/unlock-cat.png')} style={styles.bannerCat} resizeMode="contain" />
              <View style={styles.bannerContent}>
                <AppText variant="body" style={{ fontSize: 20, lineHeight: 24, color: '#0D022F',                 fontFamily: typography.family.medium,
                }}>
                  Unlock all exercises
                </AppText>
                <AppText variant="body" style={{ fontSize: 14, lineHeight: 18, marginTop: 4, color: '#3D3E42',                 fontFamily: typography.family.regular,
                }}>
                  Get unlimited access to everything you need to improve your voice
                </AppText>
                <View style={styles.bannerButton}>
                  <AppText variant="body" style={{ fontSize: 12,lineHeight: 14, fontFamily: typography.family.medium, color: '#FFFFFF' }}>
                    Unlock Premium
                  </AppText>
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          title="Done"
          onPress={() => navigation.navigate('Main', { screen: 'HomeTab', params: { screen: 'Today' } })}
        />
        <Button
          title="See my progress"
          variant="transparent"
          onPress={() => navigation.navigate('Main', { screen: 'ProgressTab', params: { screen: 'ProgressOverview' } })}
        />
      </View>
    </Screen>
  );
}

function Tile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const { palette, spacing } = useTheme();
  return (
    <Card style={[styles.tile, { borderRadius: 10 }]}>
      {icon}
      <AppText gradient={false} color={palette.white} style={{ fontSize: 24, lineHeight: 26, marginTop: spacing.sm }}>
        {value}
      </AppText>
      <AppText variant="caption" gradient={false} color={palette.white} style={{ fontSize: 13, lineHeight: 16, marginTop: 2 }}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10 },
  banner: { width: '100%', overflow: 'hidden' },
  bannerBg: { flexDirection: 'row', alignItems: 'center', minHeight: 160 },
  bannerCat: { position: 'absolute', bottom: 0, left: -10, width: 130, height: 130 },
  bannerContent: { flex: 1, paddingVertical: 20, paddingRight: 20, marginLeft: 140 },
  bannerButton: {
    backgroundColor: '#06040D',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
});
