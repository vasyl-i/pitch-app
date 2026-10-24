import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { GuidedStep, LessonSlot } from '@/features/learning';
import { usePreferencesStore } from '@/features/learning';
import { useTranslation } from '@/shared/i18n';
import type { HomeScreenProps } from '@/app/navigation/types';
import { beginStep, redoStep } from '../session/lessonFlow';

type Navigation = HomeScreenProps<'Today'>['navigation'];

/**
 * Tapping a plan step: an open one starts; a finished one is redone, after a
 * confirmation the singer can switch off.
 */
export function useStepPress(completedSlots: LessonSlot[], navigation: Navigation) {
  const { t } = useTranslation();
  const skipRedoWarning = usePreferencesStore((s) => s.preferences?.skipRedoWarning ?? false);

  return useCallback(
    (step: GuidedStep) => {
      if (!completedSlots.includes(step.slot)) return beginStep(step, navigation);
      if (skipRedoWarning) return redoStep(step, navigation);
      Alert.alert(t('home.redo.title'), t('home.redo.message'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.dontShowAgain'),
          onPress: () => {
            usePreferencesStore.getState().setPreferences({ skipRedoWarning: true });
            redoStep(step, navigation);
          },
        },
        { text: t('common.continue'), onPress: () => redoStep(step, navigation) },
      ]);
    },
    [completedSlots, skipRedoWarning, navigation, t],
  );
}

/** DEV only: three quick taps open the dev menu */
export function useDevMenuTap(navigation: Navigation) {
  return useCallback(() => {
    if (!__DEV__) return;
    const now = Date.now();
    if (now - devTaps.lastTap > 500) devTaps.count = 0;
    devTaps.lastTap = now;
    if (++devTaps.count >= 3) {
      devTaps.count = 0;
      navigation.navigate('DevMenu' as never);
    }
  }, [navigation]);
}

const devTaps = { count: 0, lastTap: 0 };
