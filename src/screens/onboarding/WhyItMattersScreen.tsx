import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, IconBubble, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { t } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const reasons = (): { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] => [
  {
    icon: 'options-outline',
    title: t('onboarding.why.fitsTitle'),
    body: t('onboarding.why.fitsBody'),
  },
  {
    icon: 'shield-checkmark-outline',
    title: t('onboarding.why.strainTitle'),
    body: t('onboarding.why.strainBody'),
  },
  {
    icon: 'trending-up-outline',
    title: t('onboarding.why.growsTitle'),
    body: t('onboarding.why.growsBody'),
  },
];

export function WhyItMattersScreen({ navigation }: OnboardingScreenProps<'Why'>) {
  const { spacing } = useTheme();
  return (
    <Screen>
      <AppText variant="title" style={{ fontSize: 34, marginTop: spacing.lg }}>
        {t('onboarding.why.title')}
      </AppText>
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {reasons().map((r) => (
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
      <Button title={t('common.continue')} onPress={() => navigation.navigate('Lowest')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start' },
  spacer: { flex: 1 },
});
