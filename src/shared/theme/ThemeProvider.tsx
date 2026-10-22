import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { currentLanguage, useTranslation } from '@/shared/i18n';
import { fontFamiliesFor, theme as defaultTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Provides the design tokens to the component tree. Pass a custom `theme` to
 * swap the entire design system (e.g. when the branded tokens arrive) without
 * touching any component. The font family follows the app language live
 * (Satoshi has no Cyrillic — see `fontFamilies`).
 */
export function ThemeProvider({ theme = defaultTheme, children }: PropsWithChildren<{ theme?: Theme }>) {
  useTranslation(); // re-render on language change
  const language = currentLanguage();
  const value = useMemo(
    () => ({ ...theme, typography: { ...theme.typography, family: fontFamiliesFor(language) } }),
    [theme, language],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
