import { exerciseById, useEarTrainingStore } from '@/features/ear-training';
import { colorForCents } from '@/shared/lib/music';
import { palette } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** What the round shows for its current phase, read from the session store. */
export function useRoundView() {
  const { t } = useTranslation();
  const phase = useEarTrainingStore((s) => s.phase);
  const exerciseId = useEarTrainingStore((s) => s.exerciseId);
  const round = useEarTrainingStore((s) => s.round);
  const totalRounds = useEarTrainingStore((s) => s.totalRounds);
  const instruction = useEarTrainingStore((s) => s.instruction);
  const countdown = useEarTrainingStore((s) => s.countdown);
  const waitSecondsLeft = useEarTrainingStore((s) => s.waitSecondsLeft);
  const choices = useEarTrainingStore((s) => s.choices);
  const live = useEarTrainingStore((s) => s.live);
  const roundResult = useEarTrainingStore((s) => s.roundResult);

  const exercise = exerciseId ? exerciseById(exerciseId) : undefined;
  const isChoice = choices !== null;
  const needsMic = exercise?.needsMic ?? false;
  // the sung note's colour: accuracy once scored, the accent while there's a note, nothing yet otherwise
  const noteColor = live.score?.signedCents != null ? colorForCents(live.score.signedCents) : live.note ? palette.accent : undefined;

  const subtitle =
    {
      preparing: t('session.round.preparing'),
      playing: t('session.round.listen'),
      waiting: t('session.round.hold'),
      countdown: t('session.round.getReady'),
      listening: isChoice ? instruction : t('earTraining.instructions.singBack'),
      evaluating: '...',
    }[phase as string] ?? '';

  return {
    phase,
    title: exercise?.title ?? '',
    subtitle,
    round,
    totalRounds,
    countdown: countdown ?? 0,
    waitSecondsLeft: waitSecondsLeft ?? 0,
    choices,
    isChoice,
    live,
    liveScore: live.score && live.score.actual !== '—' ? live.score.score : null,
    noteColor,
    roundResult,
    needsMic,
    isResult: phase === 'round-result',
  };
}
