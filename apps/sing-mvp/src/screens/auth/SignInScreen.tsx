import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';

export function SignInScreen() {
  const { spacing, palette } = useTheme();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
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
        <Button
          title={loading ? 'Signing in...' : 'Continue with Google'}
          onPress={handleGoogleSignIn}
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
