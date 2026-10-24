import { StyleSheet, View } from 'react-native';
import { CalendarIcon, NoteIcon, RhythmIcon, StarIcon, StatTile, SteadyIcon, TimeIcon } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { HistoryMetric } from '@/app/navigation/types';
import type { useProgressOverview } from '../useProgressOverview';

type Tiles = ReturnType<typeof useProgressOverview>['tiles'];

/** one size for every tile glyph — the icons share a 90% fill, so they match */
const ICON = 16;

/** the six headline numbers, two rows of three; each opens its history */
export function StatGrid({ tiles, onOpen }: { tiles: Tiles; onOpen: (metric: HistoryMetric) => void }) {
  const { t } = useTranslation();
  const hint = t('progress.stats.openHistory');
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatTile icon={<NoteIcon size={ICON} />} value={tiles.pitchAccuracy} label={t('progress.stats.pitchAccuracy')} accessibilityHint={hint} onPress={() => onOpen('pitch-accuracy')} />
        <StatTile icon={<StarIcon size={ICON} />} value={tiles.perfectNotes} label={t('progress.stats.perfectNotes')} accessibilityHint={hint} onPress={() => onOpen('perfect-notes')} />
        <StatTile icon={<RhythmIcon size={ICON} />} value={tiles.rhythm} label={t('progress.stats.rhythm')} accessibilityHint={hint} onPress={() => onOpen('rhythm-accuracy')} />
      </View>
      <View style={styles.row}>
        <StatTile icon={<SteadyIcon size={ICON} />} value={tiles.pitchStability} label={t('progress.stats.pitchStability')} accessibilityHint={hint} onPress={() => onOpen('pitch-stability')} />
        <StatTile icon={<CalendarIcon size={ICON} />} value={tiles.daysPracticed} label={t('progress.stats.daysPracticed')} accessibilityHint={hint} onPress={() => onOpen('practice-days')} />
        <StatTile icon={<TimeIcon size={ICON} />} value={tiles.practiceTime} label={t('progress.stats.practiceTime')} accessibilityHint={hint} onPress={() => onOpen('practice-time')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm, marginTop: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm },
});
