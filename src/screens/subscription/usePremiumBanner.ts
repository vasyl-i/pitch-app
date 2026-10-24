import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/features/auth';
import { usePaywall, usePremiumStatus, type PaywallSource } from '@/features/subscription';
import { t, useTranslation } from '@/shared/i18n';

function formatTimeLeft(endMs: number): string {
  const diff = endMs - Date.now();
  if (diff <= 0) return t('subscription.banner.expired');
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 60
    ? t('subscription.banner.monthsLeft', { count: Math.round(days / 30) })
    : t('subscription.banner.daysLeft', { count: days });
}

/**
 * What the Premium banner says and does: "Unlock all exercises" for free
 * users, plan and time left for subscribers. A tap opens the paywall or
 * Manage subscription — or, for guests, offers to sign in first, since a
 * purchase needs an account.
 */
export function usePremiumBanner(source: PaywallSource) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const premium = usePremiumStatus();
  const openPaywall = usePaywall(source);
  const guest = useAuthStore((s) => s.guest);
  const signOut = useAuthStore((s) => s.signOut);

  const openManage = () => navigation.navigate('ManageSubscription' as never);

  const onPress = () => {
    if (guest) {
      Alert.alert(t('subscription.banner.signInTitle'), t('subscription.banner.signInMessage'), [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('auth.signInCta'), onPress: () => signOut() },
      ]);
    } else if (premium.isPremium) {
      openManage();
    } else {
      openPaywall();
    }
  };

  const planName = premium.plan?.name ?? t('subscription.premium');
  const title = premium.isPremium ? 'PitchGym Premium' : t('subscription.banner.freeTitle');
  const subtitle = !premium.isPremium
    ? t('subscription.banner.freeSubtitle')
    : premium.status === 'trialing'
      ? t('subscription.banner.trial', { count: premium.trialDaysLeft ?? 0 })
      : `${planName} · ${premium.currentPeriodEnd ? formatTimeLeft(premium.currentPeriodEnd) : t('subscription.banner.active')}`;

  return {
    title,
    subtitle,
    onPress,
    openManage,
    trialEnding: premium.trialDaysLeft !== null && premium.trialDaysLeft <= 1,
  };
}
