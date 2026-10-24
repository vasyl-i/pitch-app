import { useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { Button, TextField } from '@/shared/ui';
import { reportSignInError, trackSignInAttempt, trackSignInSuccess, useAuthStore } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';
import { AuthLayout } from './ui/AuthLayout';
import { AuthHeader } from './ui/AuthHeader';
import { SwitchLink } from './ui/SwitchLink';

export function EmailSignInScreen({ navigation, route }: AuthScreenProps<'EmailSignIn'>) {
  const { t } = useTranslation();
  const { email } = route.params;
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const valid = password.length >= 6;

  const signIn = async () => {
    setLoading(true);
    trackSignInAttempt('email');
    try {
      await signInWithEmail(email, password);
      trackSignInSuccess('email');
    } catch (e: unknown) {
      const message = reportSignInError('email', e);
      if (message) Alert.alert(t('auth.signIn.failed'), message);
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    setResetting(true);
    try {
      await resetPassword(email);
      navigation.navigate('ResetPasswordSent', { email });
    } catch {
      Toast.show({ type: 'error', text1: t('common.somethingWentWrong'), text2: t('common.tryAgainLater') });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthLayout onBack={navigation.goBack}>
      <AuthHeader title={t('auth.emailSignIn.title')} subtitle={email} />
      <TextField
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoFocus
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={() => valid && !loading && signIn()}
      />
      <Button variant="accent" title={loading ? t('auth.signIn.signingIn') : t('auth.signInCta')} disabled={!valid || loading} onPress={signIn} />
      <SwitchLink action={resetting ? t('auth.emailSignIn.sending') : t('auth.emailSignIn.forgot')} onPress={forgot} disabled={resetting} />
      <SwitchLink
        lead={t('auth.emailSignIn.noAccount')}
        action={t('auth.emailSignIn.createOne')}
        onPress={() => navigation.replace('EmailSignUp', { email })}
      />
    </AuthLayout>
  );
}
