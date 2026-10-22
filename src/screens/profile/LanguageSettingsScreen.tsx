/**
 * App language picker. The pick is persisted and wins over the phone's
 * language from then on; strings, content and fonts switch live.
 */
import { View } from 'react-native';
import { AppText, BackButton, ChipGroup, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { currentLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useTranslation } from '@/shared/i18n';
import { languageFlag, setAppLanguage } from '@/shared/i18n/device';
import type { RootScreenProps } from '@/app/navigation/types';

export function LanguageSettingsScreen({ navigation }: RootScreenProps<'LanguageSettings'>) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const options = SUPPORTED_LANGUAGES.map((value) => ({ value, label: `${languageFlag(value)}  ${LANGUAGE_NAMES[value]}` }));

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <AppText variant="title" style={{ marginTop: spacing.md }}>
        {t('profile.language')}
      </AppText>

      <View style={{ marginTop: spacing.lg }}>
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
