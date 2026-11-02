import { Image, ImageBackground, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

const BACKGROUND = require('../../../../assets/background-monitor.png');
const CAT = require('../../../../assets/monitor-cat.png');
const ARROW_RIGHT = require('../../../../assets/account-tab/arrow-right.png');

/** the Today tab's entry to the Vocal Monitor: a fixed 72pt banner, the mascot with its pitch screen on the Premium banner's light backdrop */
export function VocalMonitorBanner({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.banner, style]}>
      <ImageBackground source={BACKGROUND} style={styles.background} imageStyle={styles.backgroundImage}>
        <Image source={CAT} style={styles.cat} resizeMode="contain" />
        <View style={styles.text}>
          <AppText variant="label" weight="medium" color={palette.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {t('home.monitorBanner.title')}
          </AppText>
          <AppText variant="caption" color={palette.inkMuted} numberOfLines={2}>
            {t('home.monitorBanner.subtitle')}
          </AppText>
        </View>
        <Image source={ARROW_RIGHT} style={styles.chevron} tintColor={palette.ink} />
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', borderRadius: 10 },
  background: { flexDirection: 'row', alignItems: 'center', height: 72 },
  backgroundImage: { borderRadius: 10 },
  // already cropped at the chest, so it sits flush with the bottom edge, leaving room above its ears; the gap to the banner's edge equals the gap to the text
  cat: { width: 52, height: 64, marginLeft: spacing.lg, alignSelf: 'flex-end' },
  text: { flex: 1, marginLeft: spacing.lg, gap: 2 },
  chevron: { width: 16, height: 16, marginRight: spacing.lg },
});
