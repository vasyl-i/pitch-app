import { useState } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type DerivedValue } from 'react-native-reanimated';
import { isManrope, MANROPE_SIZE_SCALE, textVariants, useTheme, type TextVariant, type TextWeight } from '@/shared/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Text whose content (and optionally colour) is a shared value, updated on the
 * UI thread with no React render — for readouts that change many times a
 * second. A read-only TextInput underneath, the usual trick: it is the one
 * text view whose content can be set as a native prop.
 *
 * Same type scale as AppText (`variant`, `weight`). Its size is not
 * re-measured when the text changes, so give it a fixed `width` (and
 * `textAlign`) in `style`, wide enough for the longest value. No gradient
 * mask, unlike white AppText.
 */
export function AnimatedText({ text, color, variant = 'body', weight, style }: {
  /** a shared or derived value */
  text: DerivedValue<string>;
  /** a fixed colour, or one that follows a shared or derived value */
  color: string | DerivedValue<string>;
  variant?: TextVariant;
  weight?: TextWeight;
  /** layout: width, alignment, tabular numbers */
  style?: TextStyle;
}) {
  const { typography } = useTheme();
  const v = textVariants[variant];
  const fontFamily = typography.family[weight ?? v.weight];
  const font = {
    fontFamily,
    fontSize: isManrope(fontFamily) ? v.fontSize * MANROPE_SIZE_SCALE : v.fontSize,
    lineHeight: v.lineHeight,
  };

  // the animated `text` prop only lands on a change; seed the first value
  const [initial] = useState(() => text.value);
  const animatedProps = useAnimatedProps(() => ({ text: text.value }) as object);
  const animatedColor = useAnimatedStyle(() => (typeof color === 'string' ? {} : { color: color.value }));

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      scrollEnabled={false}
      underlineColorAndroid="transparent"
      defaultValue={initial}
      animatedProps={animatedProps}
      style={[styles.base, font, style, typeof color === 'string' && { color }, animatedColor]}
    />
  );
}

const styles = StyleSheet.create({
  // TextInput's platform padding would offset it from plain Text neighbours
  base: { padding: 0, margin: 0, includeFontPadding: false },
});
