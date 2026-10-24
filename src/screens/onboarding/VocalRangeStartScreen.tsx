import { Image, StyleSheet, View } from 'react-native';
import { AppText, Button, FlowScreen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const ICON = require('../../../assets/onboarding/tune.png');

/** Before range detection: treble clef icon, what's about to happen, and Start. */
export function VocalRangeStartScreen({ navigation }: OnboardingScreenProps<'RangeStart'>) {
  const { t } = useTranslation();
  return (
    <FlowScreen onBack={navigation.goBack}>
      <View style={styles.content}>
        <Image source={ICON} style={styles.icon} resizeMode="contain" />
        <AppText variant="title" center style={styles.title}>
          {t('onboarding.rangeStart.title')}
        </AppText>
        <AppText variant="body" center style={styles.subtitle}>
          {t('onboarding.rangeStart.subtitle')}
        </AppText>
      </View>
      <Button title={t('common.start')} onPress={() => navigation.navigate('Lowest')} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 100, height: 100 },
  title: { marginTop: spacing.xl },
  subtitle: { marginTop: spacing.md },
});
