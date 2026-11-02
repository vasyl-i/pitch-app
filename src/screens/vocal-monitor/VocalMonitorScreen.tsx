import { Screen, ScreenHeader } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';
import { VocalMonitorView } from '@/features/vocal-monitor';
import type { RootScreenProps } from '@/app/navigation/types';

export function VocalMonitorScreen({ navigation }: RootScreenProps<'VocalMonitor'>) {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader title={t('vocalMonitor.title')} subtitle={t('vocalMonitor.subtitle')} onBack={navigation.goBack} />
      <VocalMonitorView />
    </Screen>
  );
}
