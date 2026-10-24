import { Image, StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';
import { useConfirmationPolling } from './useConfirmationPolling';

export function CheckEmailScreen({ navigation, route }: AuthScreenProps<'CheckEmail'>) {
  const { t } = useTranslation();
  const { email, password } = route.params;
  useConfirmationPolling(email, password);

  return (
    <Screen>
      <View style={styles.back}>
        <BackButton onPress={() => navigation.popToTop()} />
      </View>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.icon}>
            <Image source={require('../../../assets/email-solid.png')} />
          </View>
          <AppText variant="score" center gradient>
            {t('auth.checkEmail.title')}
          </AppText>
          <View style={styles.message}>
            <AppText variant="heading" weight="regular" color={palette.textSecondaryElevated} center>
              {t('auth.checkEmail.sentTo')}
            </AppText>
            <AppText variant="heading" center>
              {email}
            </AppText>
            <AppText variant="heading" weight="regular" color={palette.textSecondaryElevated} center>
              {t('auth.checkEmail.tapLink')}
            </AppText>
          </View>
        </View>
        <Button onPress={() => navigation.popToTop()} variant="ghost" title={t('auth.backToSignIn')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: 40 },
  hero: { alignItems: 'center', gap: spacing.lg },
  icon: { width: 118, height: 118, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  message: { alignItems: 'center', gap: 10 },
});
