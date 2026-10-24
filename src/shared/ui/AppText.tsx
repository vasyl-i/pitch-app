import { memo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  isManrope,
  localizeFontFamily,
  MANROPE_SIZE_SCALE,
  palette,
  SATOSHI_LINE_HEIGHT,
  textVariants,
  useTheme,
  whiteAlpha,
  type FontFamilySet,
  type TextVariant,
  type TextWeight,
} from '@/shared/theme';

interface AppTextProps extends TextProps {
  /** a step of the type scale (`textVariants`): size, line height, default weight and colour */
  variant?: TextVariant;
  /** overrides the variant's default weight */
  weight?: TextWeight;
  /** token-based colour override, defaults per variant */
  color?: string;
  /** centre-aligned */
  center?: boolean;
  /** gradient fade: true = force on, false = force off, undefined = auto (on for white text) */
  gradient?: boolean;
}

const WHITE_COLORS = ['#ffffff', '#fff', 'white'];

function isWhite(color: string | undefined): boolean {
  return !!color && WHITE_COLORS.includes(color.toLowerCase());
}

/** one style object per variant × weight × font set, built on first use and reused by every text */
const variantStyleCache = new Map<string, TextStyle>();

function variantStyle(variant: TextVariant, weight: TextWeight | undefined, family: FontFamilySet): TextStyle {
  const key = `${variant}|${weight ?? ''}|${family.regular}`;
  let style = variantStyleCache.get(key);
  if (!style) {
    const v: (typeof textVariants)[TextVariant] = textVariants[variant];
    const fontFamily = family[weight ?? v.weight];
    // Manrope (the Ukrainian UI) is drawn a touch smaller so it matches
    // Satoshi's visual size; the line height stays, so rows keep their height
    const fontSize = isManrope(fontFamily) ? v.fontSize * MANROPE_SIZE_SCALE : v.fontSize;
    style = {
      fontFamily,
      fontSize,
      lineHeight: v.lineHeight,
      color: palette[v.color],
      ...('letterSpacing' in v && { letterSpacing: v.letterSpacing }),
    };
    variantStyleCache.set(key, style);
  }
  return style;
}

/**
 * Typography atom. All text in the app goes through this component so the
 * font family/scale can be swapped centrally via theme tokens.
 *
 * Pick a `variant` from the type scale and adjust with `weight`, `color` and
 * `center`; `style` is for layout (margins, flex, width) — a font size there
 * steps outside the scale.
 */
export const AppText = memo(function AppText({ variant = 'body', weight, color, center, gradient, style, ...rest }: AppTextProps) {
  const { typography } = useTheme();
  const base = variantStyle(variant, weight, typography.family);

  const resolvedColor = color ?? (base.color as string);
  const applyGradient = gradient === true || (gradient !== false && isWhite(resolvedColor));

  // only a style that sets type needs adjusting; layout styles (the common case) skip the flatten
  const flat = style ? StyleSheet.flatten(style) : undefined;
  // module-level StyleSheets captured the font of the language at launch — keep it in step with a live switch
  const fontStyle = flat?.fontFamily ? { fontFamily: localizeFontFamily(flat.fontFamily, typography.family) } : null;
  const metricsStyle = flat?.fontSize ? sizeOverrideMetrics(flat, fontStyle?.fontFamily ?? base.fontFamily) : null;

  const textStyle = [base, color ? { color } : null, center && styles.center, style, fontStyle, metricsStyle];
  const textElement = <Text style={textStyle} {...rest} />;

  if (applyGradient) {
    // Rasterised: a mask is composited off-screen on every frame it moves, so
    // a scrolling list of sheened titles otherwise redraws each one per frame.
    // Cached at screen scale, the text stays crisp and only re-renders when
    // it changes.
    return (
      <MaskedView maskElement={textElement} shouldRasterizeIOS renderToHardwareTextureAndroid>
        <LinearGradient colors={SHEEN} locations={SHEEN_STOPS} start={SHEEN_START} end={SHEEN_END}>
          {/* Invisible text to preserve layout size */}
          <Text style={[textStyle, styles.invisible]} {...rest} />
        </LinearGradient>
      </MaskedView>
    );
  }

  return textElement;
});

const SHEEN = [palette.white, palette.white, whiteAlpha(0.7)] as const;
const SHEEN_STOPS = [0, 0.6, 1] as const;
const SHEEN_START = { x: 0, y: 0 };
const SHEEN_END = { x: 1, y: 0 };

/**
 * A size set in `style` (outside the scale): its own natural line height
 * rather than the variant's, unless the layout set one, and on Manrope the
 * same correction as the variants get.
 */
function sizeOverrideMetrics(flat: TextStyle, family: string | undefined): TextStyle | null {
  if (!flat.fontSize) return null;
  return {
    fontSize: isManrope(family) ? flat.fontSize * MANROPE_SIZE_SCALE : flat.fontSize,
    lineHeight: flat.lineHeight ?? Math.round(flat.fontSize * SATOSHI_LINE_HEIGHT),
  };
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  invisible: { opacity: 0 },
});
