/**
 * Design tokens — the single source of truth for visual values.
 *
 * This is the replaceable layer: when the real design system lands, swap the
 * values (or provide an alternative `Theme` object to `ThemeProvider`) and
 * every component follows. Components must never hardcode colors, spacing,
 * radii or font values — always consume tokens via `useTheme()`.
 *
 * Premium dark system: near-black backdrop, blurred indigo/violet ambient
 * glow, lime as the one confident accent (buttons, active states, progress),
 * translucent surfaces with no borders — separation comes from tone and
 * shadow. Extracted from the Today screen's design, which is now the whole
 * app's system rather than a one-screen departure.
 */

export const palette = {
  background: '#08070C',
  backgroundElevated: '#0D0D14',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceElevated: 'rgba(255, 255, 255, 0.10)',
  surfaceSolid: '#131319',
  border: 'rgba(255, 255, 255, 0.16)',
  borderSubtle: 'rgba(255, 255, 255, 0.09)',

  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.64)',
  textFaint: 'rgba(255, 255, 255, 0.40)',

  accent: '#C8DA59',
  accentSecondary: '#8B7CFF',
  accentTertiary: '#4C6FFF',
  onAccent: '#000000',
  warning: '#e8c97a',
  danger: '#ff6d5c',

  buttonPrimaryBg: '#C8DA59',
  buttonPrimaryText: '#000000',
} as const;

/** Gradient stop sets — always applied top-left → bottom-right. */
export const gradient = {
  /** short accent gradient for active chips, glow shadows, progress fills */
  accent: ['#C8DA59', '#9FB84A'] as const,
  /** faint sheen on glass card edges */
  cardSheen: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)'] as const,
} as const;

/**
 * The corner-bleed glow hues behind every screen's background (see
 * `shared/ui/AppBackground.tsx`) — the same atmospheric blob composition
 * the Today screen originated, now the app's one backdrop.
 */
export const glow = {
  indigo: '#7B7FE0',
  lavender: '#B79FE8',
  blue: '#6FA0E8',
  coral: '#EE8672',
  peach: '#F3C79B',
} as const;

/** expo-blur `intensity` presets (0–100). */
export const blur = {
  card: 30,
  sheet: 55,
  nav: 90,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 24,
  /** the design's signature fully-rounded pill */
  pill: 220,
} as const;

export const typography = {
  /**
   * Satoshi, bundled as static TTFs (see `App.tsx`'s `useFonts`) — `family`
   * keys are the font's own PostScript names, required by RN to select the
   * right weight since these aren't a single variable font.
   */
  family: {
    regular: 'Satoshi-Regular',
    medium: 'Satoshi-Medium',
    bold: 'Satoshi-Bold',
    black: 'Satoshi-Black',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 26,
    display: 72,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;

export const theme = {
  palette,
  gradient,
  glow,
  blur,
  spacing,
  radii,
  typography,
} as const;

export type Theme = typeof theme;
