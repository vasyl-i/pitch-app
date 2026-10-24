import { StyleSheet, View } from 'react-native';
import { PremiumGate } from '@/features/subscription';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { todayColor } from '../../home/todayPalette';
import { LightLockedCard } from '../../home/ui/LightLockedCard';
import { LightPremiumBadge } from '../../home/ui/LightPremiumBadge';
import { SoftCard } from '../../home/ui/SoftCard';

/** the coach's note (Premium); free users see the locked card with a real teaser */
export function CoachSection({ message, teaser }: { message: string; teaser?: string }) {
  const { t } = useTranslation();
  return (
    <PremiumGate
      feature="ai-session-feedback"
      source="today-coach-card"
      fallback={(openPaywall) => (
        <LightLockedCard
          title={t('sing.hub.coachLockedTitle')}
          description={t('sing.hub.coachLockedBody')}
          preview={teaser}
          cta={t('sing.hub.coachLockedCta')}
          onPress={openPaywall}
        />
      )}
    >
      <SoftCard tint={todayColor.indigoTint} style={styles.card}>
        <View style={styles.header}>
          <AppText variant="small" weight="medium" color={todayColor.inkSecondary}>
            {t('sing.hub.yourCoach')}
          </AppText>
          <LightPremiumBadge />
        </View>
        <AppText variant="small" color={todayColor.ink} style={styles.message}>
          {message}
        </AppText>
      </SoftCard>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { marginTop: spacing.sm },
});
