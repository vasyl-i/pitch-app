import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Exercise } from '@/entities/exercise';
import { starsForScore } from '@/features/progress';
import { DirectionChips, resolveSpeed, SpeedChips, speedLevelsFor, useSpeedStore } from '@/features/staff-practice';
import { AppText } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { formatKeyName, useTranslation } from '@/shared/i18n';
import { ExerciseRowFrame } from './ExerciseRowFrame';

/** a melody or scale: best score as stars, and its remembered tempo (and a scale's direction) */
export const MelodyRow = memo(function MelodyRow({ exercise, color, locked, best, premium, onPress, onAdd, onLocked, onWholeSong }: {
  exercise: Exercise;
  color: string;
  locked: boolean;
  best: number | undefined;
  premium: boolean;
  onPress: (exerciseId: string) => void;
  onAdd: (exerciseId: string) => void;
  /** a free user tapped a Premium exercise or speed */
  onLocked: () => void;
  /** sing the whole song; offered only when the exercise is an excerpt of one */
  onWholeSong: (exerciseId: string) => void;
}) {
  // the tempo it runs at, preview and singing alike — remembered per exercise
  const picked = useSpeedStore((s) => s.speeds[exercise.id]);
  // only the speeds its quickest note can be sung at; a Premium speed kept
  // from a lapsed subscription plays at the free maximum
  const levels = useMemo(() => speedLevelsFor(exercise.notes), [exercise.notes]);
  const speed = resolveSpeed(picked, levels, premium);
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
        levels={levels}
        value={speed}
        premium={premium}
        onChange={(level) => setSpeed(exercise.id, level)}
        onLocked={onLocked}
        style={styles.speed}
      />
      {exercise.pattern === 'scale' && (
        <DirectionChips value={direction} onChange={(id) => setDirection(exercise.id, id)} style={styles.direction} />
      )}
      {exercise.fullNotes && <WholeSongButton onPress={() => onWholeSong(exercise.id)} />}
    </ExerciseRowFrame>
  );
});

/** sings the song from start to end rather than the verse the row opens */
function WholeSongButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('exercises.wholeSongA11y')}
      hitSlop={6}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [styles.wholeSong, pressed && styles.pressed]}
    >
      <Ionicons name="musical-notes" size={12} color={palette.accent} />
      <AppText variant="caption" color={palette.accent}>
        {t('exercises.wholeSong')}
      </AppText>
    </Pressable>
  );
}

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
  wholeSong: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
  },
  pressed: { opacity: 0.7 },
});
