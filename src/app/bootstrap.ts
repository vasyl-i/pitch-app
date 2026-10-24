/**
 * Process-wide setup that must run before anything renders: the app
 * language (the pick in Account → Language, else the phone's), the splash
 * screen hold, notification handling, purchases and analytics.
 */
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme } from '@react-navigation/native';
import { setupNotificationHandler } from '@/shared/lib/notifications';
import { initRevenueCat } from '@/features/subscription';
import { initAnalytics } from '@/shared/lib/analytics';
import { theme } from '@/shared/theme';
import { applyPreferredLanguage, startDeviceLanguageSync } from '@/shared/i18n/device';

applyPreferredLanguage();
startDeviceLanguageSync();
SplashScreen.preventAutoHideAsync();
setupNotificationHandler();
initRevenueCat(Platform.OS === 'android' ? 'goog_zZKmLeLnBdTHvIfJYGpsHEIHrUo' : 'appl_kFBGeARTxhvdqgULiBoIIAvmvUF');
initAnalytics();

/** Satoshi for Latin scripts, Manrope for Ukrainian (Cyrillic) — see `typography.family` */
export const APP_FONTS = {
  'Satoshi-Regular': require('../../assets/fonts/Satoshi-Regular.ttf'),
  'Satoshi-Medium': require('../../assets/fonts/Satoshi-Medium.ttf'),
  'Satoshi-Bold': require('../../assets/fonts/Satoshi-Bold.ttf'),
  'Satoshi-Black': require('../../assets/fonts/Satoshi-Black.ttf'),
  'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
  'Manrope-Medium': require('../../assets/fonts/Manrope-Medium.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
  'Manrope-ExtraBold': require('../../assets/fonts/Manrope-ExtraBold.ttf'),
};

export const NAVIGATION_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.palette.background,
    card: theme.palette.background,
    text: theme.palette.textPrimary,
    primary: theme.palette.accent,
  },
};
