import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { WinkCat } from '../../../assets/svg';
import type { AuthStackParamList } from '@/app/navigation/types';
import { useSocialSignIn } from './useSocialSignIn';
import { ProviderButton } from './ui/ProviderButton';
import { GradientSubtitle } from './ui/GradientSubtitle';

export function SignInScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { appleAvailable, loading, signIn, guest } = useSocialSignIn();
  const label = (key: 'apple' | 'google' | 'email') => (loading ? t('auth.signIn.signingIn') : t(`auth.signIn.${key}`));

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.hero}>
          <WinkCat />
          <AppText variant="headline" center>
            {t('auth.signIn.title')}
          </AppText>
          <GradientSubtitle text={t('auth.signIn.subtitle')} />
        </View>

        <View style={styles.actions}>
          {appleAvailable && <ProviderButton light icon="logo-apple" label={label('apple')} disabled={loading} onPress={() => signIn('apple')} />}
          <ProviderButton icon="logo-google" label={label('google')} disabled={loading} onPress={() => signIn('google')} />
          <ProviderButton icon="mail" label={label('email')} disabled={loading} onPress={() => navigation.navigate('EmailEntry')} />

          <View style={styles.guest}>
            <AppText variant="small" color={palette.textPrimary} gradient={false}>
              {t('auth.signIn.tryFirst')}
            </AppText>
            <Pressable onPress={guest}>
              <AppText variant="small" color={palette.buttonPrimaryBg}>
                {t('auth.signIn.withoutAccount')}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'flex-end' },
  hero: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: 40 },
  actions: { gap: spacing.md, paddingBottom: spacing.xxl },
  guest: { paddingTop: spacing.lg, alignItems: 'center' },
});
