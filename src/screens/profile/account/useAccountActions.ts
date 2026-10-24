import { Alert, Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/features/auth';
import { usePremiumStatus } from '@/features/subscription';
import { t } from '@/shared/i18n';

const FEEDBACK_EMAIL = 'legal@anyabedrytska.com';
const MANAGE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

/** No mail app installed (always the case on the iOS Simulator) — show the address instead. */
export function openFeedbackEmail() {
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('PitchGym Feedback')}`).catch(() => {
    Toast.show({ type: 'info', text1: t('profile.noEmailApp'), text2: t('profile.writeToUs', { email: FEEDBACK_EMAIL }) });
  });
}

/**
 * The account's destructive actions, each behind its confirmations: log out,
 * and delete — which first points a subscriber at the store's subscription
 * page (deleting the account doesn't cancel a store subscription), then asks
 * twice.
 */
export function useAccountActions() {
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const premium = usePremiumStatus();

  const logOut = () =>
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logOut'), style: 'destructive', onPress: () => signOut() },
    ]);

  const reallyDelete = () =>
    Alert.alert(t('profile.delete.sureTitle'), t('profile.delete.sureMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.delete.confirm'),
        style: 'destructive',
        onPress: () =>
          deleteAccount().catch(() =>
            Toast.show({ type: 'error', text1: t('common.somethingWentWrong'), text2: t('common.tryAgainLater') }),
          ),
      },
    ]);

  const confirmDelete = () =>
    Alert.alert(t('profile.deleteAccount'), t('profile.delete.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: reallyDelete },
    ]);

  const deleteAccountFlow = () => {
    if (!premium.isPremium) return confirmDelete();
    Alert.alert(t('profile.activeSub.title'), t('profile.activeSub.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.activeSub.manage'), onPress: () => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL) },
      { text: t('profile.activeSub.deleteAnyway'), style: 'destructive', onPress: confirmDelete },
    ]);
  };

  return { logOut, deleteAccount: deleteAccountFlow };
}
