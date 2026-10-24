import { useRef, useState } from 'react';
import { Alert, StyleSheet, View, type TextInput } from 'react-native';
import { Button, TextField } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';
import { AuthLayout } from './ui/AuthLayout';
import { AuthHeader } from './ui/AuthHeader';
import { SwitchLink } from './ui/SwitchLink';

export function EmailSignUpScreen({ navigation, route }: AuthScreenProps<'EmailSignUp'>) {
  const { t } = useTranslation();
  const { email } = route.params;
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const valid = name.trim().length >= 1 && password.length >= 6;

  const signUp = async () => {
    setLoading(true);
    try {
      const confirmed = await signUpWithEmail(email, name.trim(), password);
      if (!confirmed) navigation.replace('CheckEmail', { email, password });
    } catch (e: unknown) {
      Alert.alert(t('auth.signUp.failed'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onBack={navigation.goBack}>
      <AuthHeader title={t('auth.signUp.title')} subtitle={email} />
      <View style={styles.fields}>
        <TextField
          placeholder={t('auth.signUp.namePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          placeholder={t('auth.signUp.passwordPlaceholder')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={() => valid && !loading && signUp()}
        />
      </View>
      <Button variant="accent" title={loading ? t('auth.signUp.creating') : t('auth.signUp.cta')} disabled={!valid || loading} onPress={signUp} />
      <SwitchLink lead={t('auth.signUp.haveAccount')} action={t('auth.signInCta')} onPress={() => navigation.replace('EmailSignIn', { email })} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.sm },
});
