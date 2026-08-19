import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const REASONS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'options-outline',
    title: 'Fits every exercise to your voice',
    body: 'Melodies and drills shift into the register that’s actually comfortable for you.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Keeps you out of strain',
    body: 'We never push you toward notes that could hurt — comfortable beats impressive.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Grows with you',
    body: 'As your range improves, we’ll notice and offer to update it — you’ll keep practicing at the edge of what you can do.',
  },
];

export function WhyItMattersScreen({ navigation }: OnboardingScreenProps<'Why'>) {
  const { spacing } = useTheme();
  return (
    <Screen>
      <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.lg }}>
        Why your range matters
      </AppText>
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {REASONS.map((r) => (
          <Card key={r.title} style={styles.row}>
            <IconBubble name={r.icon} size={44} iconSize={20} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{r.title}</AppText>
              <AppText variant="caption" style={{ marginTop: 4 }}>
                {r.body}
              </AppText>
            </View>
          </Card>
        ))}
      </View>
      <View style={styles.spacer} />
      <Button title="Continue" onPress={() => navigation.navigate('Lowest')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start' },
  spacer: { flex: 1 },
});
