import { useCallback } from 'react';
import { useFont, type DataModule, type SkFont } from '@shopify/react-native-skia';

const manropeSources = {
  '400': require('../../../assets/fonts/Manrope-Regular.ttf'),
  '500': require('../../../assets/fonts/Manrope-Medium.ttf'),
  '700': require('../../../assets/fonts/Manrope-Bold.ttf'),
} as const;

/**
 * Skia text has no per-glyph font fallback the way native `<Text>` does, and
 * Satoshi has no Cyrillic — Ukrainian strings drawn on a canvas render as
 * tofu boxes. `fontFor(text)` returns the Satoshi font when it covers every
 * glyph of `text`, and Manrope at the same weight (the app's Cyrillic face,
 * see `typography.family`) otherwise.
 */
export function useCanvasFont(
  source: DataModule,
  size: number,
  weight: '400' | '500' | '700' = '400',
): { font: SkFont | null; fontFor: (text: string) => SkFont | null } {
  const font = useFont(source, size);
  const fallback = useFont(manropeSources[weight], size);

  const fontFor = useCallback(
    (text: string) => {
      if (!font) return null;
      // glyph id 0 is the "missing glyph" (.notdef) box
      return font.getGlyphIDs(text).every((id) => id !== 0) ? font : fallback;
    },
    [font, fallback],
  );

  return { font, fontFor };
}
