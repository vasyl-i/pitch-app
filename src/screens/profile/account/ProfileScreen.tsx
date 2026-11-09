/**
 * The Account tab: you and your setup — your voice (range), goal and
 * preferences, the weekly plan, language, legal and account actions.
 */
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText, Screen, TabTitleRow } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ProfileScreenProps } from '@/app/navigation/types';
import { PremiumBanner } from '@/screens/subscription';
import { SettingsGroup } from './SettingsGroup';
import { useAccountSections } from './useAccountSections';

/** below this width (iPhone SE / mini) rows use the shorter `profile.compact` copy */
const COMPACT_WIDTH = 390;

export function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileHome'>) {
  const { t } = useTranslation();
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
  const sections = useAccountSections(navigation, compact);

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        <View style={styles.inset}>
          <TabTitleRow>
            <AppText variant="title">{t('profile.title')}</AppText>
          </TabTitleRow>
          {/* same gap under the heading as on Home, so the banner holds still across tabs */}
          <PremiumBanner source="profile" style={styles.banner} />
        </View>

        {sections.map((s) => (
          <SettingsGroup key={s.label} label={s.label} rows={s.rows} compact={compact} />
        ))}

        <AppText variant="caption" center style={styles.micNotice}>
          {t('profile.micNotice')}
        </AppText>
        <AppText variant="caption" center style={styles.version}>
          {t('profile.version', { version: require('../../../../app.json').expo.version })}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: spacing.lg },
  banner: { marginTop: spacing.lg },
  micNotice: { marginTop: spacing.xxl },
  version: { marginTop: spacing.xs, marginBottom: spacing.md },
});
