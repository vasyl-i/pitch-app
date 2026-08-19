import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';

export function SignInScreen() {
  const { spacing, palette } = useTheme();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      await (provider === 'google' ? signInWithGoogle() : signInWithApple());
    } catch (e: unknown) {
      // User cancelled Apple sign-in — not an error
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      const message = e instanceof Error ? e.message : 'Something went wrong';
      Alert.alert('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Ionicons name="ear-outline" size={64} color={palette.accent} />
        <AppText variant="title" style={{ fontSize: 30, textAlign: 'center', marginTop: spacing.lg }}>
          PitchGym
        </AppText>
        <AppText variant="body" style={{ textAlign: 'center', marginTop: spacing.md }}>
          Train your ear. Find your pitch.{'\n'}Sing with confidence.
        </AppText>
      </View>
      <View style={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        {appleAvailable && (
          <Button
            title={loading ? 'Signing in...' : 'Continue with Apple'}
            onPress={() => handleSignIn('apple')}
            disabled={loading}
          />
        )}
        <Button
          title={loading ? 'Signing in...' : 'Continue with Google'}
          onPress={() => handleSignIn('google')}
          disabled={loading}
        />
        <Button
          title="Proceed without sign in"
          variant="ghost"
          onPress={continueAsGuest}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
});
