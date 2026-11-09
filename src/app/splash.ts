import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Hide the splash once the first real screen is mounted (a frame later, so
 * it is laid out). Hiding it earlier — while fonts or the auth/root gates are
 * still settling — lets the screen's entering animations play unseen under
 * the splash.
 */
export function useHideSplash(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const id = requestAnimationFrame(() => void SplashScreen.hideAsync());
    return () => cancelAnimationFrame(id);
  }, [when]);
}
