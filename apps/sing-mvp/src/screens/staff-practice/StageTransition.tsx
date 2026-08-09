import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';

/**
 * The beat between the assisted attempt and the unaided one.
 *
 * Deliberately not interactive: the run continues on the controller's timer, so
 * there is no button to hunt for and no way to stall between the two attempts —
 * the point is that the singer goes into the solo pass with the melody still
 * fresh. This is only the card; the timing lives in `runController`.
 */
export function StageTransition() {
  const { palette, spacing } = useTheme();
  const opacity = useSharedValue(0);
  const lift = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    lift.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) });
  }, [opacity, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return (
    <View style={styles.center}>
      <Animated.View style={style}>
        <AppText variant="title" style={[styles.text, { marginBottom: spacing.sm }]}>
          Great! Now try it on your own.
        </AppText>
        <AppText variant="body" color={palette.textSecondary} style={styles.text}>
          Let’s see how well you remember the melody.
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  text: { textAlign: 'center' },
});
