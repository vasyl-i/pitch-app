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

import type { Language } from '@/shared/i18n';
import { preferredLanguage } from '@/shared/i18n/device';

/** the accent (#EEFF88) at `alpha` — tints, glows and fills that need a strength of their own */
export function accentAlpha(alpha: number): string {
  return `rgba(238, 255, 136, ${alpha})`;
}

export const palette = {
  background: '#08070C',
  backgroundElevated: '#0D0D14',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceElevated: '#524E6266',
  surfaceSolid: '#131319',
  border: 'rgba(255, 255, 255, 0.16)',
  borderSubtle: 'rgba(255, 255, 255, 0.09)',

  ghost: "#524E6266",

  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.64)',
  textSecondaryElevated: '#F0F0F0',
  textFaint: '#A1A0A5',

  accent: '#EEFF88',
  /** the accent as a soft fill behind accent text: selected chips and pills */
  accentTint: accentAlpha(0.14),
  accentSecondary: '#8B7CFF',
  accentTertiary: '#4C6FFF',
  onAccent: '#000000',
  warning: '#e8c97a',
  danger: '#ff6d5c',

  buttonPrimaryBg: '#EEFF88',
  buttonPrimaryText: '#000000',

  white: '#ffffff',
} as const;

/** Gradient stop sets — always applied top-left → bottom-right. */
export const gradient = {
  /** short accent gradient for active chips, glow shadows, progress fills */
  accent: ['#EEFF88', '#c6dc43'] as const,
  /** faint sheen on glass card edges */
  cardSheen: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)'] as const,
  /**
   * Full-screen background radial gradient — lime burst from top-right fading
   * through translucent violet into near-black. Originates at (107%, -19%),
   * ellipse axes ≈ 102% × 118% of screen.
   */
  screenBg: ['#F2FFC2', 'rgba(121, 134, 255, 0.40)', 'rgba(30, 30, 30, 0.40)'] as const,
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

/**
 * Bundled as static TTFs (see `App.tsx`'s `useFonts` and the `expo-font`
 * plugin in `app.json`) — values are the fonts' own PostScript names, required
 * by RN to select the right weight since these aren't variable fonts.
 *
 * Satoshi has no Cyrillic, so the Ukrainian UI runs on Manrope instead. Same
 * roles, same sizes; Manrope tops out at ExtraBold, which stands in for Black.
 * Satoshi covers Portuguese (ã õ ç and friends), so Portuguese stays on it —
 * except ª / º, which the pt catalog avoids (enforced by the i18n test).
 */
export const fontFamilies = {
  satoshi: {
    regular: 'Satoshi-Regular',
    medium: 'Satoshi-Medium',
    bold: 'Satoshi-Bold',
    black: 'Satoshi-Black',
  },
  manrope: {
    regular: 'Manrope-Regular',
    medium: 'Manrope-Medium',
    bold: 'Manrope-Bold',
    black: 'Manrope-ExtraBold',
  },
} as const;

export type FontFamilySet = (typeof fontFamilies)[keyof typeof fontFamilies];

export function fontFamiliesFor(language: Language): FontFamilySet {
  return language === 'uk' ? fontFamilies.manrope : fontFamilies.satoshi;
}

const FONT_ROLE: Record<string, keyof FontFamilySet> = Object.fromEntries(
  Object.values(fontFamilies).flatMap((set) =>
    (Object.keys(set) as (keyof FontFamilySet)[]).map((role) => [set[role], role] as const),
  ),
);

/**
 * The same role (regular/medium/…) in `set` for a family name from either
 * set — so styles captured before a language switch still render in the
 * right face. Anything else (system fonts, undefined) passes through.
 */
export function localizeFontFamily(family: string | undefined, set: FontFamilySet): string | undefined {
  const role = family ? FONT_ROLE[family] : undefined;
  return role ? set[role] : family;
}

/**
 * Manrope at the same size reads bigger than Satoshi: measured from the TTFs,
 * its x-height is ~11% taller and Latin text ~4% wider. Drawn at this fraction
 * of the requested size, a switch to Ukrainian doesn't visibly resize the UI
 * (x-height within ~4%, caps ~6% smaller, width ~2% narrower).
 */
export const MANROPE_SIZE_SCALE = 0.94;

/** Satoshi's natural line height (ascent + descent) in em, kept for Manrope text that sets none */
export const SATOSHI_LINE_HEIGHT = 1.35;

const MANROPE_FAMILIES: readonly string[] = Object.values(fontFamilies.manrope);

export function isManrope(family: string | undefined): boolean {
  return !!family && MANROPE_FAMILIES.includes(family);
}

export const typography = {
  /**
   * Picked from the app language when this module first loads — before any
   * module-level `StyleSheet.create` reads it. A later switch in Account →
   * Language is applied live by `ThemeProvider` and `AppText`.
   */
  family: fontFamiliesFor(preferredLanguage()),
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
