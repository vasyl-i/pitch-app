import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';
import { AuthIcon } from './ui/AuthIcon';

export function ResetPasswordSentScreen({ navigation, route }: AuthScreenProps<'ResetPasswordSent'>) {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.hero}>
          <AuthIcon name="mail-open" />
          <AppText variant="title" center>
            {t('auth.checkEmail.title')}
          </AppText>
          <AppText variant="body" center>
            {t('auth.resetSent.sentTo')}
            {'\n'}
            <AppText variant="body" color={palette.textPrimary}>
              {route.params.email}
            </AppText>
            {'\n'}
            {t('auth.resetSent.tapLink')}
          </AppText>
        </View>
        <Button variant="ghost" title={t('auth.backToSignIn')} onPress={() => navigation.popToTop()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.lg },
});
