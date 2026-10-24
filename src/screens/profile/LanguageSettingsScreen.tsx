/**
 * App language picker. The pick is persisted and wins over the phone's
 * language from then on; strings, content and fonts switch live.
 */
import { StyleSheet, View } from 'react-native';
import { ChipGroup, Screen, ScreenHeader } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { currentLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useTranslation } from '@/shared/i18n';
import { languageFlag, setAppLanguage } from '@/shared/i18n/device';
import type { RootScreenProps } from '@/app/navigation/types';

export function LanguageSettingsScreen({ navigation }: RootScreenProps<'LanguageSettings'>) {
  const { t } = useTranslation();
  const options = SUPPORTED_LANGUAGES.map((value) => ({ value, label: `${languageFlag(value)}  ${LANGUAGE_NAMES[value]}` }));

  return (
    <Screen>
      <ScreenHeader title={t('profile.language')} onBack={navigation.goBack} />
      <View style={styles.body}>
        <ChipGroup
          title={t('profile.languageSettings.appLanguage')}
          options={options}
          selected={[currentLanguage()]}
          onSelect={setAppLanguage}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
});
