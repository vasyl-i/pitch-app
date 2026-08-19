import { createContext, useContext, type PropsWithChildren } from 'react';
import { theme as defaultTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Provides the design tokens to the component tree. Pass a custom `theme` to
 * swap the entire design system (e.g. when the branded tokens arrive) without
 * touching any component.
 */
export function ThemeProvider({ theme = defaultTheme, children }: PropsWithChildren<{ theme?: Theme }>) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
