import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

const EASE_IN = { duration: 320, easing: Easing.out(Easing.quad) };

/**
 * The beat between the assisted attempt and the unaided one.
 *
 * Deliberately not interactive: the run continues on the controller's timer, so
 * there is no button to hunt for and no way to stall between the two attempts —
 * the point is that the singer goes into the solo pass with the melody still
 * fresh. This is only the card; the timing lives in `runController`.
 */
export function StageTransition({ startingNote = false }: { startingNote?: boolean }) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const lift = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, EASE_IN);
    lift.value = withTiming(0, EASE_IN);
  }, [opacity, lift]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: lift.value }] }));

  return (
    <View style={styles.center}>
      <Animated.View style={style}>
        <AppText variant="title" center style={styles.title}>
          {t('staff.transition.title')}
        </AppText>
        <AppText variant="body" center>
          {startingNote ? t('staff.transition.firstNote') : t('staff.transition.onYourOwn')}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  title: { marginBottom: spacing.sm },
});
