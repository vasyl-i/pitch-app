/**
 * Dark, atmospheric palette for the Today screen only. Close cousin of the
 * shared dark-glass system in `shared/theme/tokens.ts` (same near-black base,
 * same blue/indigo/violet family) but with its own warm peach/coral/orange
 * secondary accents and a softer, editorial surface language — no borders,
 * elevation via translucent tone instead. Spacing, radii and the Satoshi type
 * family still come from `useTheme()`; only color is local.
 */

export const todayColor = {
  bg: '#08070C',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceMuted: 'rgba(255, 255, 255, 0.035)',

  ink: '#F7F5FB',
  inkSecondary: 'rgba(247, 245, 251, 0.62)',
  inkFaint: 'rgba(247, 245, 251, 0.38)',
  inkOnDark: '#FFFFFF',

  buttonDark: '#131018',
  shadow: 'rgba(0, 0, 0, 0.55)',

  // dark ink for text/icons that sit on top of the light banner and lime
  // button fills below, where the usual off-white `ink` has no contrast
  inkOnBanner: '#2B2038',
  inkOnAccent: '#171B08',

  orange: '#C8DA59',
  peach: '#F3C79B',
  coral: '#EE8672',
  blue: '#6FA0E8',
  lavender: '#B79FE8',
  indigo: '#7B7FE0',

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

  orangeTint: 'rgba(200, 218, 89, 0.18)',
  blueTint: 'rgba(111, 160, 232, 0.18)',
  lavenderTint: 'rgba(183, 159, 232, 0.18)',
  indigoTint: 'rgba(123, 127, 224, 0.20)',
} as const;

export type TodayColor = typeof todayColor;
