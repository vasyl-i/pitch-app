import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

/** First screen a new install ever sees: what's about to happen, and why. */
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const { spacing } = useTheme();
  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="title" style={{ fontSize: 30, textAlign: 'center' }}>
          Let’s discover your vocal range
        </AppText>
        <AppText variant="body" style={{ textAlign: 'center', marginTop: spacing.md }}>
          We’ll find the lowest and highest notes you can comfortably sing.{'\n'}
          This helps us personalize every lesson and protect your voice.
        </AppText>
      </View>
      <Button title="Start" onPress={() => navigation.navigate('Why')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
});
