/**
 * Practice reminder settings: toggle on/off, pick a time, and save. Mirrors
 * the onboarding reminder screen but with a back button, a switch, and no
 * skip option.
 */
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Button, HeroMessage, Screen, TimePicker } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { useReminderDraft } from './useReminderDraft';
import { ReminderToggle } from './ReminderToggle';

const BELL_IMAGE = require('../../../../assets/notification-bell.png');

export function ReminderSettingsScreen({ navigation }: RootScreenProps<'ReminderSettings'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { enabled, toggle, time, setTime, hasChanges, save } = useReminderDraft();

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <HeroMessage
          illustration={<Image source={BELL_IMAGE} style={styles.bell} resizeMode="contain" />}
          title={t('onboarding.reminder.title')}
          body={t('onboarding.reminder.subtitle')}
          style={styles.hero}
        />

        <ReminderToggle enabled={enabled} onToggle={toggle} />

        {enabled && (
          <View style={styles.picker}>
            <TimePicker label={t('onboarding.reminder.setTime')} value={time} onChange={setTime} />
          </View>
        )}

        <View style={styles.fill} />
        <Button
          title={t('common.save')}
          onPress={() => save().then(navigation.goBack)}
          disabled={!hasChanges}
          style={styles.save}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  hero: { flex: 0, paddingTop: 40, gap: spacing.lg },
  bell: { width: 100, height: 100 },
  picker: { marginTop: spacing.xl },
  fill: { flex: 1 },
  save: { marginTop: spacing.xl },
});
