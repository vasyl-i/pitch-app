import { StyleSheet, View } from 'react-native';
import { MetronomeButton, metronomeSupported, speedBpm, useSpeedStore } from '@/features/staff-practice';
import { AppText, BackButton } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** back, the exercise and where this run sits (step, key, round, tempo), and the metronome switch */
export function SessionHeader({ title, context, bpm, rate, onBack }: {
  title: string;
  /** the step / key / round line, before the tempo */
  context: string;
  bpm: number;
  rate: number;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const metronome = useSpeedStore((s) => s.metronome);
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption">
          {context}
          {rate !== 1 ? ` · ${t('exercises.bpm', { bpm: speedBpm(bpm, rate) })}` : ''}
        </AppText>
      </View>
      {metronomeSupported() && <MetronomeButton on={metronome} onToggle={() => useSpeedStore.getState().setMetronome(!metronome)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
});
