/**
 * A full-screen drill session, launched with everything already decided
 * (exercise + difficulty). Guided mode is a step of today's practice and
 * rolls into the next step; free mode is a one-off from the library.
 *
 * The session engine still owns all behaviour; unmounting this screen
 * releases the mic and resets the store (the engine's own cleanup).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import { useEarTrainingSession, useEarTrainingStore } from '@/features/ear-training';
import { useLessonSessionStore } from '@/features/learning';
import { MicGlow } from '@/features/staff-practice';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { ActiveRound } from './ActiveRound';
import { SessionResults } from './SessionResults';
import { activeStepLabel, advanceAfterStep } from './lessonFlow';

export function EarSessionScreen({ navigation, route }: RootScreenProps<'EarSession'>) {
  const { t } = useTranslation();
  const { palette, spacing } = useTheme();
  const { exerciseId, difficultyId, guided } = route.params;
  const session = useEarTrainingSession();
  const activeSlot = useLessonSessionStore((s) => s.activeSlot);
  // a guided step runs as many rounds as today's plan fitted to the time budget
  const [rounds] = useState(() =>
    guided ? useLessonSessionStore.getState().steps.find((s) => s.slot === activeSlot)?.totalRounds : undefined,
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // capture partial progress once on mount so resume state isn't lost
  const partialRef = useRef(
    activeSlot ? useLessonSessionStore.getState().partialProgress[activeSlot] : undefined
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void sessionRef.current.start(exerciseId, difficultyId, partialRef.current, rounds);
    });
    return () => task.cancel();
  }, [exerciseId, difficultyId]);

  const handleExit = useCallback(() => {
    if (guided && activeSlot) {
      const progress = sessionRef.current.getProgress();
      if (progress && progress.completedRounds > 0) {
        useLessonSessionStore.getState().savePartial(activeSlot, progress);
      }
    }
    session.exit();
    navigation.goBack();
  }, [guided, activeSlot, navigation, session]);

  const phase = useEarTrainingStore((s) => s.phase);
  const notice = useEarTrainingStore((s) => s.notice);

  const stepLabel = guided ? activeStepLabel() : null;

  // the engine failed to start (mic denied, audio trouble): friendly recovery
  if (phase === 'idle' && notice) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
          <AppText variant="body" color={palette.warning} style={{ textAlign: 'center' }}>
            {notice}
          </AppText>
          <Button title={t('common.tryAgain')} onPress={() => void session.start(exerciseId, difficultyId, undefined, rounds)} />
          {guided && (
            <Button title={t('session.ear.skipStep')} variant="ghost" onPress={() => advanceAfterStep(navigation)} />
          )}
          <Button title={t('session.ear.leave')} variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noHorizontalPadding={phase === "completed"} overlay={phase === 'listening' ? <MicGlow /> : undefined}>
      <View style={{ marginTop: phase === 'completed' ? 0 : 80 }}>
      {stepLabel && (
        <AppText variant="caption" color={palette.white} style={{ textAlign: 'center', marginBottom: spacing.sm }}>
          {stepLabel}
        </AppText>
      )}
      </View>
      {phase === 'completed' ? (
        <SessionResults
          session={session}
          actions={
            guided
              ? {
                  primary: { title: t('session.ear.continue'), onPress: () => advanceAfterStep(navigation) },
                  secondary: { title: t('session.ear.tryAgainThis'), onPress: () => session.retry() },
                  tertiary: { title: t('session.ear.backHome'), onPress: () => {
                    useLessonSessionStore.getState().completeActive();
                    resetToTab(navigation, 'HomeTab');
                  }},
                }
              : {
                  primary: { title: t('session.ear.goAgain'), onPress: () => session.retry() },
                  secondary: { title: t('common.done'), onPress: () => navigation.goBack() },
                }
          }
        />
      ) : phase === 'idle' ? (
        <View style={{ flex: 1 }} />
      ) : (
        <ActiveRound session={{ ...session, exit: handleExit }} />
      )}
    </Screen>
  );
}
