import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Exercise } from '@/entities/exercise';
import { starsForScore } from '@/features/progress';
import { DirectionChips, isPremiumSpeed, MAX_FREE_SPEED, SpeedChips, useSpeedStore } from '@/features/staff-practice';
import { AppText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { formatKeyName, useTranslation } from '@/shared/i18n';
import { ExerciseRowFrame } from './ExerciseRowFrame';

/** a melody or scale: best score as stars, and its remembered tempo (and a scale's direction) */
export const MelodyRow = memo(function MelodyRow({ exercise, color, locked, best, premium, onPress, onAdd, onLocked }: {
  exercise: Exercise;
  color: string;
  locked: boolean;
  best: number | undefined;
  premium: boolean;
  onPress: (exerciseId: string) => void;
  onAdd: (exerciseId: string) => void;
  /** a free user tapped a Premium exercise or speed */
  onLocked: () => void;
}) {
  // the tempo it runs at, preview and singing alike — remembered per exercise
  const picked = useSpeedStore((s) => s.speeds[exercise.id] ?? 1);
  // a Premium speed kept from a lapsed subscription plays at the free maximum
  const speed = !premium && isPremiumSpeed(picked) ? MAX_FREE_SPEED : picked;
  const setSpeed = useSpeedStore((s) => s.setSpeed);
  // a scale practised here sweeps through the keys endlessly, from this end first
  const direction = useSpeedStore((s) => s.directions[exercise.id] ?? 'up');
  const setDirection = useSpeedStore((s) => s.setDirection);

  return (
    <ExerciseRowFrame
      id={exercise.id}
      color={color}
      title={exercise.title}
      description={`${exercise.source} · ${formatKeyName(exercise.key)}`}
      locked={locked}
      onPress={locked ? onLocked : () => onPress(exercise.id)}
      onAdd={() => onAdd(exercise.id)}
      infoFooter={best !== undefined && <BestScore score={best} />}
    >
      <SpeedChips
        bpm={exercise.bpm}
        value={speed}
        premium={premium}
        onChange={(level) => setSpeed(exercise.id, level)}
        onLocked={onLocked}
        style={styles.speed}
      />
      {exercise.pattern === 'scale' && (
        <DirectionChips value={direction} onChange={(id) => setDirection(exercise.id, id)} style={styles.direction} />
      )}
    </ExerciseRowFrame>
  );
});

function BestScore({ score }: { score: number }) {
  const { t } = useTranslation();
  const earned = starsForScore(score);
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Ionicons key={i} name={i < earned ? 'star' : 'star-outline'} size={11} color={i < earned ? palette.accent : palette.textFaint} />
      ))}
      <AppText variant="caption" style={styles.bestLabel}>
        {t('exercises.best', { score })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  bestLabel: { marginLeft: spacing.xs },
  speed: { marginTop: 10 },
  direction: { marginTop: 6 },
});
