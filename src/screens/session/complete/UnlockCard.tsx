import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

const UNLOCK_BG = require('../../../../assets/background-unlock.png');
const UNLOCK_CAT = require('../../../../assets/unlock-cat.png');

/** the light "unlock everything" card shown to free users after practice */
export function UnlockCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <ImageBackground source={UNLOCK_BG} style={styles.background} imageStyle={styles.backgroundImage}>
        <Image source={UNLOCK_CAT} style={styles.cat} resizeMode="contain" />
        <View style={styles.content}>
          <AppText variant="heading" weight="medium" color={palette.ink}>
            {t('session.complete.unlockTitle')}
          </AppText>
          <AppText variant="small" color={palette.inkMuted} style={styles.body}>
            {t('session.complete.unlockBody')}
          </AppText>
          <View style={styles.button}>
            <AppText variant="caption" weight="medium" color={palette.white} gradient={false}>
              {t('subscription.unlockPremium')}
            </AppText>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', overflow: 'hidden', borderRadius: radii.lg, marginTop: spacing.xl },
  background: { flexDirection: 'row', alignItems: 'center', minHeight: 160 },
  backgroundImage: { borderRadius: radii.lg },
  cat: { position: 'absolute', bottom: 0, left: -10, width: 130, height: 130 },
  content: { flex: 1, paddingVertical: 20, paddingRight: 20, marginLeft: 140 },
  body: { marginTop: spacing.xs },
  button: {
    backgroundColor: palette.background,
    borderRadius: radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
});
