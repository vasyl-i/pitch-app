/**
 * The end of today's guided practice: a warm close-out with what you did,
 * your streak, and one exit back Home. No decisions, just the win.
 */
import { useRef } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useLessonSessionStore } from '@/features/learning';
import { usePaywall, usePremiumStatus } from '@/features/subscription';
import { AppText, Button, CalendarIcon, COMPACT_SCREEN, ExercisesIcon, Screen, TimeIcon, useBottomInset } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { useTodaySummary } from './useTodaySummary';
import { CompleteStatTile } from './CompleteStatTile';
import { UnlockCard } from './UnlockCard';

export function PracticeCompleteScreen({ navigation }: RootScreenProps<'PracticeComplete'>) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const blurTargetRef = useRef<View>(null);
  const stepCount = useLessonSessionStore((s) => s.steps.length);
  const { isPremium } = usePremiumStatus();
  const openPaywall = usePaywall('practice-complete');
  const today = useTodaySummary();

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <BlurTargetView ref={blurTargetRef} collapsable={false} style={styles.fill}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 5 * spacing.xxl }]}>
          <Image source={require('../../../../assets/practice-complete.png')} />
          <AppText variant="score" center>
            {t('session.complete.title')}
          </AppText>
          <AppText variant="heading" weight="regular" center gradient style={styles.subtitle}>
            {t('session.complete.subtitle', { count: stepCount })}
          </AppText>

          <View style={styles.tiles}>
            <CompleteStatTile icon={<TimeIcon />} value={today.time} label={t('session.complete.timeToday')} />
            <CompleteStatTile
              icon={<CalendarIcon />}
              value={t('common.daysShort', { count: today.streak })}
              label={t('session.complete.daysInARow', { count: today.streak })}
            />
            <CompleteStatTile icon={<ExercisesIcon />} value={String(today.count)} label={t('session.complete.exercises', { count: today.count })} />
          </View>

          {!isPremium && <UnlockCard onPress={openPaywall} />}
        </ScrollView>
      </BlurTargetView>

      <BlurView
        intensity={10}
        tint="dark"
        blurTarget={blurTargetRef}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={[styles.footer, { paddingBottom: bottomInset }]}
      >
        <Button title={t('common.done')} onPress={() => resetToTab(navigation, 'HomeTab')} />
        <Button
          title={t('session.complete.seeProgress')}
          variant="transparent"
          onPress={() => resetToTab(navigation, 'ProgressTab', { screen: 'ProgressOverview' })}
        />
      </BlurView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { alignItems: 'center', paddingTop: COMPACT_SCREEN ? 20 : 80, paddingHorizontal: spacing.lg },
  subtitle: { marginTop: spacing.lg, paddingHorizontal: COMPACT_SCREEN ? 0 : spacing.xl },
  tiles: { flexDirection: 'row', gap: 10, marginTop: spacing.xl },
  footer: { gap: 20, paddingTop: spacing.md, position: 'absolute', alignSelf: 'center', width: '100%', bottom: 0, paddingHorizontal: spacing.lg },
});
