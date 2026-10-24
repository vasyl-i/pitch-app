import { accentAlpha, glow, palette } from '@/shared/theme';

/**
 * Dark, atmospheric palette for the Today screen only. Close cousin of the
 * shared dark-glass system in `shared/theme/tokens.ts` (same near-black base,
 * same blue/indigo/violet family) but with its own warm peach/coral/orange
 * secondary accents and a softer, editorial surface language — no borders,
 * elevation via translucent tone instead. Spacing, radii and the Satoshi type
 * family still come from `useTheme()`; only color is local.
 */

export const todayColor = {
  bg: palette.background,
  surface: palette.surface,
  surfaceMuted: 'rgba(255, 255, 255, 0.035)',

  ink: '#F7F5FB',
  inkSecondary: palette.textFaint,
  inkFaint: palette.textFaint,
  inkOnDark: palette.white,

  buttonDark: '#131018',
  shadow: 'rgba(0, 0, 0, 0.55)',

  // dark ink for text/icons that sit on top of the light banner and lime
  // button fills below, where the usual off-white `ink` has no contrast
  inkOnBanner: '#2B2038',
  /** the banner ink, softened for its eyebrow and sub-copy */
  inkOnBannerMuted: 'rgba(43, 32, 56, 0.7)',
  inkOnAccent: palette.inkOnAccent,

  orange: palette.accent,
  peach: glow.peach,
  coral: glow.coral,
  blue: glow.blue,
  lavender: glow.lavender,
  indigo: glow.indigo,

  // the hero card's own light banner hue — a deliberate exception to the
  // rest of the screen's dark surfaces, so it reads as the one bright,
  // physical "object" on the page
  banner: '#D29EF1',
  bannerDeep: '#B87FE0',
  bannerLight: '#E7C6F5',

  // lighter, more luminous variants of the same hues, tuned to read as icon
  // glyphs on top of the translucent tints below against a near-black card
  orangeDeep: '#D6E480',
  blueDeep: '#7FB0F5',
  lavenderDeep: '#C4AEF0',
  indigoDeep: '#9BA0EC',

  orangeTint: accentAlpha(0.18),
  blueTint: 'rgba(111, 160, 232, 0.18)',
  lavenderTint: 'rgba(183, 159, 232, 0.18)',
  indigoTint: 'rgba(123, 127, 224, 0.20)',
} as const;

export type TodayColor = typeof todayColor;
