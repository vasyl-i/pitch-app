import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, LinearGradient, Text as SkText, vec } from '@shopify/react-native-skia';
import { useCanvasFont } from '@/shared/ui';
import { palette, spacing, textVariants, whiteAlpha } from '@/shared/theme';

const FONT_SIZE = textVariants.body.fontSize;
const LINE_HEIGHT = textVariants.body.lineHeight;
const FADE = [palette.white, whiteAlpha(0.3)];

/**
 * Centred lines of body text fading white → 30% left to right, drawn on Skia
 * (a gradient across text has no plain-Text equivalent). The copy carries its
 * own line breaks.
 */
export function GradientSubtitle({ text }: { text: string }) {
  const [width, setWidth] = useState(0);
  const lines = text.split('\n');
  // Satoshi has no Cyrillic, and Skia (unlike <Text>) needs useCanvasFont to fall back to Manrope
  const { fontFor } = useCanvasFont(require('../../../../assets/fonts/Satoshi-Regular.ttf'), FONT_SIZE);
  const font = fontFor(lines.join(''));

  return (
    <View style={[styles.frame, { height: FONT_SIZE + LINE_HEIGHT * (lines.length - 1) + 6 }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {font &&
        width > 0 &&
        lines.map((line, i) => (
          <Canvas key={i} style={[StyleSheet.absoluteFill, { top: i * LINE_HEIGHT }]}>
            <SkText x={(width - font.measureText(line).width) / 2} y={FONT_SIZE} text={line} font={font}>
              <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={FADE} />
            </SkText>
          </Canvas>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', marginTop: spacing.sm },
});
