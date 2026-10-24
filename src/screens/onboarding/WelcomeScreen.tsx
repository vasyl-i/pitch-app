import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Screen } from '@/shared/ui';
import { blackAlpha, glow, palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const WELCOME_IMAGE = require('../../../assets/onboarding/welcome.png');

/** Splash screen: cat illustration, tagline, and a single CTA. */
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Screen noHorizontalPadding noBottomPadding>
      <View style={styles.root}>
        {/* cat pinned to the bottom */}
        <View style={styles.imageContainer}>
          <Image source={WELCOME_IMAGE} style={styles.image} resizeMode="cover" />
        </View>

        {/* text + button overlaying the bottom of the cat */}
        <View style={styles.bottom}>
          <View style={styles.text}>
            <AppText variant="score" color={palette.black} center>
              {t('onboarding.welcome.title')}
            </AppText>
            <AppText variant="body" color={blackAlpha(0.6)} center style={styles.subtitle}>
              {t('onboarding.welcome.subtitle')}
            </AppText>
          </View>
          <View style={[styles.band, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Button title={t('onboarding.welcome.cta')} onPress={() => navigation.navigate('Goals')} style={styles.cta} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { height: '100%', width: '100%' },
  imageContainer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', alignItems: 'center' },
  image: { width: '100%' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: spacing.xl },
  text: { paddingHorizontal: spacing.xl },
  subtitle: { marginTop: spacing.sm },
  band: { backgroundColor: glow.periwinkle, paddingHorizontal: spacing.xl },
  cta: { marginTop: spacing.xl },
});
