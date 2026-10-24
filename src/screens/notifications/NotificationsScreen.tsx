/**
 * Notifications. Empty-state only for now.
 * TODO: a real feed needs a notification source (push service or local
 * reminder scheduling) — none is wired up yet.
 */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';

export function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const { t } = useTranslation();
  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <View style={styles.empty}>
        <Ionicons name="notifications-outline" size={48} color={palette.textFaint} />
        <AppText variant="heading">{t('notifications.screen.title')}</AppText>
        <AppText variant="body" center>
          {t('notifications.screen.body')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
