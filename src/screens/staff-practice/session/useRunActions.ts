import { useLessonSessionStore } from '@/features/learning';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { resetToTab } from '@/app/navigation/resetToTab';
import { advanceAfterStep } from '../../session/lessonFlow';

type Navigation = RootScreenProps<'MelodyPractice'>['navigation'];

/**
 * Where a run's end leads. Guided practice continues the lesson; library
 * practice goes again or leaves. Between rounds of a multi-key exercise the
 * singer moves on to the next key, sings this one again, or leaves.
 */
export function useRunActions({ navigation, guided, lastRound, restart, nextRound }: {
  navigation: Navigation;
  guided: boolean;
  lastRound: boolean;
  restart: () => void;
  nextRound: () => void;
}) {
  const { t } = useTranslation();
  const backHome = { title: t('session.ear.backHome'), onPress: () => resetToTab(navigation, 'HomeTab') };
  const done = { title: t('common.done'), onPress: navigation.goBack };
  const singItAgain = { title: t('staff.singItAgain'), onPress: restart };

  const summary = !lastRound
    ? { primary: { title: t('staff.nextRound'), onPress: nextRound }, secondary: singItAgain, tertiary: guided ? backHome : done }
    : guided
      ? { primary: { title: t('session.ear.continue'), onPress: () => advanceAfterStep(navigation) }, secondary: singItAgain, tertiary: backHome }
      : { primary: { title: t('staff.singAgain'), onPress: restart }, secondary: done, tertiary: undefined };

  const noInputExits = guided
    ? [
        { title: t('session.ear.skipStep'), onPress: () => advanceAfterStep(navigation) },
        {
          title: t('session.ear.backHome'),
          onPress: () => {
            useLessonSessionStore.getState().completeActive();
            resetToTab(navigation, 'HomeTab');
          },
        },
      ]
    : [done];

  return { summary, noInputExits };
}
