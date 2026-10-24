import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { reportSignInError, trackSignInAttempt, trackSignInSuccess, useAuthStore } from '@/features/auth';
import { t } from '@/shared/i18n';

/**
 * Resolved once at module load. App.tsx waits for this before hiding the
 * splash screen, so by the time SignInScreen renders the value is settled.
 */
let appleAvailable = false;
if (Platform.OS === 'ios') {
  AppleAuthentication.isAvailableAsync().then((v) => {
    appleAvailable = v;
  });
}

/** Apple / Google sign-in with tracking and error alerts, and the guest path (after a warning) */
export function useSocialSignIn() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [loading, setLoading] = useState(false);

  const signIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    trackSignInAttempt(provider);
    try {
      await (provider === 'google' ? signInWithGoogle() : signInWithApple());
      trackSignInSuccess(provider);
    } catch (e: unknown) {
      const message = reportSignInError(provider, e);
      if (message) Alert.alert(t('auth.signIn.failed'), message);
    } finally {
      setLoading(false);
    }
  };

  const guest = () =>
    Alert.alert(t('auth.guest.title'), t('auth.guest.message'), [
      { text: t('common.goBack'), style: 'cancel' },
      { text: t('common.continue'), onPress: continueAsGuest },
    ]);

  return { appleAvailable, loading, signIn, guest };
}
