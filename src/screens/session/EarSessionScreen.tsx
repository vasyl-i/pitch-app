/**
 * A full-screen drill session, launched with everything already decided
 * (exercise + difficulty). Guided mode is a step of today's practice and
 * rolls into the next step; free mode is a one-off from the library.
 *
 * The session engine still owns all behaviour; unmounting this screen
 * releases the mic and resets the store (the engine's own cleanup).
 */
import { StyleSheet, View } from 'react-native';
import { useEarTrainingStore } from '@/features/ear-training';
import { useLessonSessionStore } from '@/features/learning';
import { MicGlow } from '@/features/staff-practice';
import { AppText, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { ActiveRound } from './active-round/ActiveRound';
import { SessionResults } from './results/SessionResults';
import { activeStepLabel, advanceAfterStep } from './lessonFlow';
import { useEarSessionRunner } from './useEarSessionRunner';

export function EarSessionScreen({ navigation, route }: RootScreenProps<'EarSession'>) {
  const { t } = useTranslation();
  const { exerciseId, difficultyId, guided } = route.params;
  const { session, exit, restart } = useEarSessionRunner(exerciseId, difficultyId, guided, navigation.goBack);
  const phase = useEarTrainingStore((s) => s.phase);
  const notice = useEarTrainingStore((s) => s.notice);
  const stepLabel = guided ? activeStepLabel() : null;

  // the engine failed to start (mic denied, audio trouble): friendly recovery
  if (phase === 'idle' && notice) {
    return (
      <Screen>
        <View style={styles.recovery}>
          <AppText variant="body" color={palette.warning} center>
            {notice}
          </AppText>
          <Button title={t('common.tryAgain')} onPress={restart} />
          {guided && <Button title={t('session.ear.skipStep')} variant="ghost" onPress={() => advanceAfterStep(navigation)} />}
          <Button title={t('session.ear.leave')} variant="ghost" onPress={navigation.goBack} />
        </View>
      </Screen>
    );
  }

  const completed = phase === 'completed';
  const actions = guided
    ? {
        primary: { title: t('session.ear.continue'), onPress: () => advanceAfterStep(navigation) },
        secondary: { title: t('session.ear.tryAgainThis'), onPress: () => session.retry() },
        tertiary: {
          title: t('session.ear.backHome'),
          onPress: () => {
            useLessonSessionStore.getState().completeActive();
            resetToTab(navigation, 'HomeTab');
          },
        },
      }
    : {
        primary: { title: t('session.ear.goAgain'), onPress: () => session.retry() },
        secondary: { title: t('common.done'), onPress: navigation.goBack },
      };

  return (
    <Screen noHorizontalPadding={completed} overlay={phase === 'listening' ? <MicGlow /> : undefined}>
      <View style={!completed && styles.stepLabelSpace}>
        {stepLabel && (
          <AppText variant="caption" color={palette.white} center style={styles.stepLabel}>
            {stepLabel}
          </AppText>
        )}
      </View>
      {completed ? (
        <SessionResults session={session} actions={actions} />
      ) : phase === 'idle' ? (
        <View style={styles.fill} />
      ) : (
        <ActiveRound session={{ ...session, exit }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recovery: { flex: 1, justifyContent: 'center', gap: spacing.md },
  stepLabelSpace: { marginTop: 80 },
  stepLabel: { marginBottom: spacing.sm },
  fill: { flex: 1 },
});
