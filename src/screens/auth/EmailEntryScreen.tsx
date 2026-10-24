import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, TextField } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import { t, useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';
import { AuthLayout } from './ui/AuthLayout';
import { AuthHeader } from './ui/AuthHeader';

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** does an account exist for this address? (decides sign-in vs sign-up) */
async function emailExists(email: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc('email_exists', { lookup_email: email });
    if (error) {
      Alert.alert(t('common.somethingWentWrong'), error.message);
      return null;
    }
    return !!data;
  } catch (e: unknown) {
    Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    return null;
  }
}

export function EmailEntryScreen({ navigation }: AuthScreenProps<'EmailEntry'>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);

  const proceed = async () => {
    if (!valid) return setError(t('auth.invalidEmail'));
    setError('');
    setLoading(true);
    const exists = await emailExists(trimmed);
    setLoading(false);
    if (exists === null) return;
    navigation.navigate(exists ? 'EmailSignIn' : 'EmailSignUp', { email: trimmed });
  };

  return (
    <AuthLayout onBack={navigation.goBack}>
      <AuthHeader title={t('auth.emailEntry.title')} subtitle={t('auth.emailEntry.subtitle')} />
      <View>
        <TextField
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError('');
          }}
          returnKeyType="go"
          onSubmitEditing={proceed}
        />
        {!!error && (
          <AppText variant="small" color={palette.danger} style={styles.error}>
            {error}
          </AppText>
        )}
      </View>
      <Button
        variant="accent"
        title={loading ? t('auth.emailEntry.checking') : t('auth.emailEntry.proceed')}
        disabled={!valid || loading}
        onPress={proceed}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: spacing.xs, paddingHorizontal: 20 },
});
