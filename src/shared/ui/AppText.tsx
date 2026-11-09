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
    // The mask view is what the parent lays out, so it takes the caller's
    // layout (flex, margins, size, position) and the text inside just fills
    // it. Left on the inner text, `flex: 1` in a row became flex-basis 0 in
    // the mask's own column and collapsed the text to nothing — white labels
    // in list rows rendered empty.
    const { outer, inner } = splitLayout(flat);
    const maskedText = inner === flat ? textStyle : [base, color ? { color } : null, center && styles.center, inner, fontStyle, metricsStyle];
    // Rasterised: a mask is composited off-screen on every frame it moves, so
    // a scrolling list of sheened titles otherwise redraws each one per frame.
    // Cached at screen scale, the text stays crisp and only re-renders when
    // it changes.
    return (
      <MaskedView style={outer} maskElement={<Text style={maskedText} {...rest} />} shouldRasterizeIOS renderToHardwareTextureAndroid>
        <LinearGradient colors={SHEEN} locations={SHEEN_STOPS} start={SHEEN_START} end={SHEEN_END}>
          {/* Invisible text to preserve layout size */}
          <Text style={[maskedText, styles.invisible]} {...rest} />
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

/** style keys that place the text in its parent rather than shape the text itself */
const LAYOUT_KEYS = new Set<string>([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'position', 'top', 'bottom', 'left', 'right', 'start', 'end', 'zIndex', 'transform', 'opacity',
]);

/** splits a flattened style into the outer box's layout and the text's own style */
function splitLayout(flat: TextStyle | undefined): { outer: TextStyle | undefined; inner: TextStyle | undefined } {
  if (!flat) return { outer: undefined, inner: flat };
  let outer: Record<string, unknown> | undefined;
  let inner: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(flat)) {
    if (LAYOUT_KEYS.has(key)) (outer ??= {})[key] = value;
    else (inner ??= {})[key] = value;
  }
  // nothing to move: keep the original object so the common path allocates nothing new
  return outer ? { outer: outer as TextStyle, inner: inner as TextStyle | undefined } : { outer: undefined, inner: flat };
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  invisible: { opacity: 0 },
});
