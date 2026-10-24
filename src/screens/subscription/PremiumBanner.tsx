/**
 * Premium banner: "Unlock all exercises" for free users, plan and time left
 * for subscribers. Tapping opens the paywall, Manage subscription, or — for
 * guests — offers to sign in first, since a purchase needs an account.
 * A trial on its last day adds a reminder pill pinned over the top-right
 * corner (absolutely positioned, so it never shifts the layout).
 *
 * Lives with the subscription screens rather than in `shared/ui` because it
 * composes the auth and subscription features.
 */
import { Alert, Image, ImageBackground, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/features/auth';
import { usePaywall, usePremiumStatus, type PaywallSource } from '@/features/subscription';
import { AppText } from '@/shared/ui';
import { typography } from '@/shared/theme';
import { t, useTranslation } from '@/shared/i18n';

const UNLOCK_BG = require('../../../assets/background-unlock.png');
const UNLOCK_CAT = require('../../../assets/unlock-cat.png');
const ARROW_RIGHT = require('../../../assets/account-tab/arrow-right.png');

function formatTimeLeft(endMs: number): string {
  const diff = endMs - Date.now();
  if (diff <= 0) return t('subscription.banner.expired');
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days > 60) {
    return t('subscription.banner.monthsLeft', { count: Math.round(days / 30) });
  }
  return t('subscription.banner.daysLeft', { count: days });
}

interface PremiumBannerProps {
  /** paywall attribution for free users' taps */
  source: PaywallSource;
  style?: StyleProp<ViewStyle>;
}

export function PremiumBanner({ source, style }: PremiumBannerProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const premium = usePremiumStatus();
  const openPaywall = usePaywall(source);
  const guest = useAuthStore((s) => s.guest);
  const signOut = useAuthStore((s) => s.signOut);

  const handlePress = () => {
    if (guest) {
      Alert.alert(
        t('subscription.banner.signInTitle'),
        t('subscription.banner.signInMessage'),
        [
          { text: t('common.notNow'), style: 'cancel' },
          { text: t('auth.signInCta'), onPress: () => signOut() },
        ],
      );
    } else if (premium.isPremium) {
      navigation.navigate('ManageSubscription' as never);
    } else {
      openPaywall();
    }
  };

  const trialEnding = premium.trialDaysLeft !== null && premium.trialDaysLeft <= 1;

  const planName = premium.plan?.name ?? t('subscription.premium');
  const title = premium.isPremium ? 'PitchGym Premium' : t('subscription.banner.freeTitle');

  const subtitle = premium.isPremium
    ? premium.status === 'trialing'
      ? t('subscription.banner.trial', { count: premium.trialDaysLeft ?? 0 })
      : premium.currentPeriodEnd
        ? `${planName} · ${formatTimeLeft(premium.currentPeriodEnd)}`
        : `${planName} · ${t('subscription.banner.active')}`
    : t('subscription.banner.freeSubtitle');

  return (
    <Pressable onPress={handlePress} style={[styles.banner, style]}>
      <ImageBackground source={UNLOCK_BG} style={styles.bannerBg} imageStyle={{ borderRadius: 10 }}>
        <Image source={UNLOCK_CAT} style={styles.bannerCat} resizeMode="contain" />
        <View style={styles.bannerTextWrap}>
          {/* fixed 72pt banner: one title line + up to two subtitle lines fit, so never let the title wrap */}
          <AppText
            variant="body"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{ fontSize: 16, lineHeight: 20, color: '#0D022F', fontFamily: typography.family.medium }}
          >
            {title}
          </AppText>
          <AppText variant="body" numberOfLines={2} style={{ fontSize: 12, lineHeight: 16, color: '#3D3E42', fontFamily: typography.family.regular }}>
            {subtitle}
          </AppText>
        </View>
        <Image source={ARROW_RIGHT} style={styles.chevron} tintColor="#21222C" />
      </ImageBackground>
      {trialEnding && (
        <Pressable onPress={() => navigation.navigate('ManageSubscription' as never)} style={styles.trialReminder}>
          <Ionicons name="alert-circle" size={13} color="#F0943A" />
          <AppText variant="caption" color="#F0943A" style={{ fontSize: 12, lineHeight: 16, fontFamily: typography.family.medium }}>
            {t('home.trialEndsTomorrow')}
          </AppText>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', overflow: 'visible', borderRadius: 10 },
  bannerBg: { flexDirection: 'row', alignItems: 'center', height: 72 },
  bannerCat: { width: 64, height: 64, marginLeft: 12, marginBottom: -8 },
  bannerTextWrap: { flex: 1, marginLeft: 24, gap: 2 },
  chevron: { width: 16, height: 16, marginRight: 16 },
  trialReminder: {
    position: 'absolute',
    top: -10,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    // opaque (14% orange over the app background): it straddles the banner edge
    backgroundColor: '#291B12',
  },
});
