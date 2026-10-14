/**
 * Premium banner: "Unlock all exercises" for free users, plan and time left
 * for subscribers. Tapping opens the paywall, Manage subscription, or — for
 * guests — offers to sign in first, since a purchase needs an account.
 *
 * Lives with the subscription screens rather than in `shared/ui` because it
 * composes the auth and subscription features.
 */
import { Alert, Image, ImageBackground, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/features/auth';
import { usePaywall, usePremiumStatus, type PaywallSource } from '@/features/subscription';
import { AppText } from '@/shared/ui';
import { typography } from '@/shared/theme';

const UNLOCK_BG = require('../../../assets/background-unlock.png');
const UNLOCK_CAT = require('../../../assets/unlock-cat.png');
const ARROW_RIGHT = require('../../../assets/account-tab/arrow-right.png');

function formatTimeLeft(endMs: number): string {
  const diff = endMs - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days > 60) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'} left`;
  }
  return `${days} day${days === 1 ? '' : 's'} left`;
}

interface PremiumBannerProps {
  /** paywall attribution for free users' taps */
  source: PaywallSource;
  style?: StyleProp<ViewStyle>;
}

export function PremiumBanner({ source, style }: PremiumBannerProps) {
  const navigation = useNavigation();
  const premium = usePremiumStatus();
  const openPaywall = usePaywall(source);
  const guest = useAuthStore((s) => s.guest);
  const signOut = useAuthStore((s) => s.signOut);

  const handlePress = () => {
    if (guest) {
      Alert.alert(
        'Sign in required',
        'Create an account or sign in to unlock Premium and keep your progress safe across devices.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => signOut() },
        ],
      );
    } else if (premium.isPremium) {
      navigation.navigate('ManageSubscription' as never);
    } else {
      openPaywall();
    }
  };

  const title = premium.isPremium ? 'PitchGym Premium' : 'Unlock all exercises';

  const subtitle = premium.isPremium
    ? premium.status === 'trialing'
      ? `Free trial · ${premium.trialDaysLeft ?? 0} day${premium.trialDaysLeft === 1 ? '' : 's'} left`
      : premium.currentPeriodEnd
        ? `${premium.plan?.name ?? 'Premium'} · ${formatTimeLeft(premium.currentPeriodEnd)}`
        : `${premium.plan?.name ?? 'Premium'} · Active`
    : 'Get unlimited access to improve your voice';

  return (
    <Pressable onPress={handlePress} style={[styles.banner, style]}>
      <ImageBackground source={UNLOCK_BG} style={styles.bannerBg} imageStyle={{ borderRadius: 10 }}>
        <Image source={UNLOCK_CAT} style={styles.bannerCat} resizeMode="contain" />
        <View style={styles.bannerTextWrap}>
          <AppText variant="body" style={{ fontSize: 16, lineHeight: 20, color: '#0D022F', fontFamily: typography.family.medium }}>
            {title}
          </AppText>
          <AppText variant="body" style={{ fontSize: 12, lineHeight: 16, color: '#3D3E42', fontFamily: typography.family.regular }}>
            {subtitle}
          </AppText>
        </View>
        <Image source={ARROW_RIGHT} style={styles.chevron} tintColor="#21222C" />
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', overflow: 'hidden', borderRadius: 10 },
  bannerBg: { flexDirection: 'row', alignItems: 'center', height: 72 },
  bannerCat: { width: 64, height: 64, marginLeft: 12, marginBottom: -8 },
  bannerTextWrap: { flex: 1, marginLeft: 24, gap: 2 },
  chevron: { width: 16, height: 16, marginRight: 16 },
});
