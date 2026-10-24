import { StyleSheet, View } from 'react-native';
import { AppText, Button, TextField } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { AuthLayout } from './ui/AuthLayout';
import { AuthHeader } from './ui/AuthHeader';
import { AuthIcon } from './ui/AuthIcon';
import { useChangePassword } from './useChangePassword';

export function NewPasswordScreen({ navigation, route }: RootScreenProps<'NewPassword'>) {
  const { t } = useTranslation();
  const changing = route.params?.requireOldPassword ?? false;
  const form = useChangePassword(changing, navigation.goBack);

  return (
    <AuthLayout>
      <AuthHeader
        icon={<AuthIcon name="lock-closed" />}
        title={changing ? t('auth.newPassword.changeTitle') : t('auth.newPassword.setTitle')}
        subtitle={changing ? t('auth.newPassword.changeBody') : t('auth.newPassword.setBody')}
      />

      <View style={styles.fields}>
        {changing && (
          <TextField
            placeholder={t('auth.newPassword.current')}
            secureTextEntry
            autoFocus
            value={form.oldPassword}
            onChangeText={form.setOldPassword}
            returnKeyType="next"
          />
        )}
        <TextField
          placeholder={t('auth.newPassword.new')}
          secureTextEntry
          autoFocus={!changing}
          value={form.password}
          onChangeText={form.setPassword}
          returnKeyType="next"
        />
        <TextField
          placeholder={t('auth.newPassword.confirm')}
          secureTextEntry
          value={form.confirm}
          onChangeText={form.setConfirm}
          returnKeyType="go"
          onSubmitEditing={form.submit}
        />
        {form.tooShort && (
          <AppText variant="caption" color={palette.textSecondary} style={styles.hint}>
            {t('auth.newPassword.tooShort')}
          </AppText>
        )}
        {form.mismatch && (
          <AppText variant="caption" color={palette.danger} style={styles.hint}>
            {t('auth.newPassword.mismatch')}
          </AppText>
        )}
      </View>

      <Button
        variant="accent"
        title={form.loading ? t('auth.newPassword.updating') : t('auth.newPassword.cta')}
        disabled={!form.valid || form.loading}
        onPress={form.submit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  hint: { paddingHorizontal: 20 },
});
