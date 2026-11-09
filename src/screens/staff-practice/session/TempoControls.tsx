import { ScrollView, StyleSheet, View } from 'react-native';
import { DirectionChips, SpeedChips, type ScaleDirection, type SpeedLevel } from '@/features/staff-practice';
import { AppText } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/**
 * Tempo (and a library scale's direction) while the preview plays. Always
 * laid out, only shown then, so the canvas above never resizes.
 */
export function TempoControls({ visible, bpm, levels, rate, onRate, premium, onLocked, direction, onDirection }: {
  visible: boolean;
  bpm: number;
  levels: readonly SpeedLevel[];
  rate: SpeedLevel;
  onRate: (level: SpeedLevel) => void;
  premium: boolean;
  onLocked: () => void;
  direction: ScaleDirection | null;
  onDirection: (d: ScaleDirection) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.block, !visible && styles.hidden]} pointerEvents={visible ? 'auto' : 'none'}>
      {/* the unit once, so the chips can be bare numbers and the row fits a narrow phone */}
      <AppText variant="caption" style={styles.caption}>
        {t('exercises.speedCaption')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <SpeedChips bpm={bpm} levels={levels} value={rate} premium={premium} onChange={(level) => level !== rate && onRate(level)} onLocked={onLocked} compact style={styles.noWrap} />
        {direction && <DirectionChips value={direction} onChange={onDirection} compact style={[styles.noWrap, styles.direction]} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.sm },
  hidden: { opacity: 0 },
  caption: { marginBottom: spacing.xs },
  row: { flexGrow: 0 },
  noWrap: { flexWrap: 'nowrap' },
  direction: { marginLeft: spacing.md },
});
