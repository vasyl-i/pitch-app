import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { MonitorPitchCanvas } from '@/features/pitch-visualization';
import { LIVE } from '../model/liveMonitor';
import { useVocalMonitor, VISIBLE_SECONDS } from '../model/useVocalMonitor';
import { MonitorReadout } from './MonitorReadout';

/** the sandbox: an endless piano roll and the two readouts, listening from the moment it opens */
export function VocalMonitorView() {
  const { t } = useTranslation();
  const { status, errorMessage, metrics, trail, now, start } = useVocalMonitor();

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.fill}>
      <View style={styles.canvas}>
        <MonitorPitchCanvas trail={trail} live={LIVE} currentTime={now} running={status === 'listening'} visibleSeconds={VISIBLE_SECONDS} />
      </View>

      <AppText variant="small" center color={status === 'error' ? palette.danger : palette.textSecondary} style={styles.message}>
        {status === 'error' ? errorMessage : status === 'interrupted' ? t('vocalMonitor.interrupted') : t('vocalMonitor.hint')}
      </AppText>

      <MonitorReadout metrics={metrics} />

      {status === 'error' && <Button title={t('common.tryAgain')} variant="ghost" onPress={start} style={styles.button} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  canvas: { flex: 1, marginTop: spacing.lg },
  message: { marginVertical: spacing.md, minHeight: 20 },
  button: { marginTop: spacing.lg },
});
