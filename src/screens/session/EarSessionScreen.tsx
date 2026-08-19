/**
 * A full-screen drill session, launched with everything already decided
 * (exercise + difficulty). Guided mode is a step of today's practice and
 * rolls into the next step; free mode is a one-off from the library.
 *
 * The session engine still owns all behaviour; unmounting this screen
 * releases the mic and resets the store (the engine's own cleanup).
 */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useEarTrainingSession, useEarTrainingStore } from '@/features/ear-training';
import { MicGlow } from '@/features/staff-practice';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';
import { ActiveRound } from './ActiveRound';
import { SessionResults } from './SessionResults';
import { activeStepLabel, advanceAfterStep } from './lessonFlow';

export function EarSessionScreen({ navigation, route }: RootScreenProps<'EarSession'>) {
  const { palette, spacing } = useTheme();
  const { exerciseId, difficultyId, guided } = route.params;
  const session = useEarTrainingSession();

  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    void sessionRef.current.start(exerciseId, difficultyId);
  }, [exerciseId, difficultyId]);

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
          <Button title="Try again" onPress={() => void session.start(exerciseId, difficultyId)} />
          {guided && (
            <Button title="Skip this step" variant="ghost" onPress={() => advanceAfterStep(navigation)} />
          )}
          <Button title="Leave practice" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen overlay={<MicGlow />}>
      {stepLabel && (
        <AppText variant="caption" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
          {stepLabel}
        </AppText>
      )}
      {phase === 'completed' ? (
        <SessionResults
          session={session}
          actions={
            guided
              ? {
                  primary: { title: 'Continue practice', onPress: () => advanceAfterStep(navigation) },
                  secondary: { title: 'Try this one again', onPress: () => session.retry() },
                }
              : {
                  primary: { title: 'Go again', onPress: () => session.retry() },
                  secondary: { title: 'Done', onPress: () => navigation.goBack() },
                }
          }
        />
      ) : phase === 'idle' ? (
        <View style={{ flex: 1 }} />
      ) : (
        <ActiveRound session={{ ...session, exit: () => navigation.goBack() }} />
      )}
    </Screen>
  );
}
