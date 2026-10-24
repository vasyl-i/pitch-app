import { ScrollView, StyleSheet, View } from 'react-native';
import { useProfileStore } from '@/entities/profile';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { RangeSummaryCard } from './RangeSummaryCard';
import { OffDayAdjuster } from './OffDayAdjuster';

/**
 * Settings hub for the measured vocal range: view the current profile,
 * re-run detection, or temporarily shrink the range for an off day.
 */
export function VocalRangeSettingsScreen({ navigation }: RootScreenProps<'VocalRangeSettings'>) {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const measure = () => navigation.navigate('RedetectLow');

  const header = (
    <View style={styles.header}>
      <BackButton onPress={navigation.goBack} />
      <AppText variant="label">{t('vocalRange.settings.title')}</AppText>
    </View>
  );

  if (!profile) {
    return (
      <Screen noBottomPadding>
        {header}
        <View style={styles.empty}>
          <AppText variant="body" center>
            {t('vocalRange.settings.empty')}
          </AppText>
          <Button title={t('vocalRange.settings.measure')} onPress={measure} style={styles.measure} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {header}
        <RangeSummaryCard profile={profile} />
        <Button title={t('vocalRange.settings.redetect')} onPress={measure} style={styles.redetect} />
        <OffDayAdjuster adjustment={profile.temporaryAdjustment} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  measure: { marginTop: spacing.lg, alignSelf: 'stretch' },
  content: { paddingBottom: spacing.xl },
  redetect: { marginTop: spacing.xl },
});
