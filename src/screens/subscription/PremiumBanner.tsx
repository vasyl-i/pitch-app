/**
 * Premium banner: "Unlock all exercises" for free users, plan and time left
 * for subscribers (see `usePremiumBanner`). A trial on its last day adds a
 * reminder pill pinned over the top-right corner (absolutely positioned, so
 * it never shifts the layout).
 *
 * Lives with the subscription screens rather than in `shared/ui` because it
 * composes the auth and subscription features.
 */
import { Image, ImageBackground, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaywallSource } from '@/features/subscription';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { usePremiumBanner } from './usePremiumBanner';

const UNLOCK_BG = require('../../../assets/background-unlock.png');
const UNLOCK_CAT = require('../../../assets/unlock-cat.png');
const ARROW_RIGHT = require('../../../assets/account-tab/arrow-right.png');

interface PremiumBannerProps {
  /** paywall attribution for free users' taps */
  source: PaywallSource;
  style?: StyleProp<ViewStyle>;
}

export function PremiumBanner({ source, style }: PremiumBannerProps) {
  const { title, subtitle, onPress, openManage, trialEnding } = usePremiumBanner(source);

  return (
    <Pressable onPress={onPress} style={[styles.banner, style]}>
      <ImageBackground source={UNLOCK_BG} style={styles.background} imageStyle={styles.backgroundImage}>
        <Image source={UNLOCK_CAT} style={styles.cat} resizeMode="contain" />
        <View style={styles.text}>
          {/* fixed 72pt banner: one title line + up to two subtitle lines fit, so never let the title wrap */}
          <AppText variant="label" weight="medium" color={palette.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {title}
          </AppText>
          <AppText variant="caption" color={palette.inkMuted} numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>
        <Image source={ARROW_RIGHT} style={styles.chevron} tintColor={palette.ink} />
      </ImageBackground>
      {trialEnding && <TrialReminder onPress={openManage} />}
    </Pressable>
  );
}

/** "Trial ends tomorrow", pinned over the banner's top-right corner */
function TrialReminder({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={styles.trialReminder}>
      <Ionicons name="alert-circle" size={13} color={palette.caution} />
      <AppText variant="caption" weight="medium" color={palette.caution}>
        {t('home.trialEndsTomorrow')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', overflow: 'visible', borderRadius: 10 },
  background: { flexDirection: 'row', alignItems: 'center', height: 72 },
  backgroundImage: { borderRadius: 10 },
  cat: { width: 64, height: 64, marginLeft: spacing.md, marginBottom: -spacing.sm },
  text: { flex: 1, marginLeft: spacing.xl, gap: 2 },
  chevron: { width: 16, height: 16, marginRight: spacing.lg },
  trialReminder: {
    position: 'absolute',
    top: -10,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    // opaque: it straddles the banner edge
    backgroundColor: palette.cautionSurface,
  },
});
