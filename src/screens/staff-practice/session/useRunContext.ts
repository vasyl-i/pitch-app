import type { Exercise } from '@/entities/exercise';
import { formatKeyName, useTranslation } from '@/shared/i18n';
import { activeStepLabel } from '../../session/lessonFlow';

/**
 * Where this run sits, in words: the header's line (today's step, or the key
 * and round, or how far the melody was moved for the singer's range, else
 * its source) and the results card's round label.
 */
export function useRunContext({ exercise, guided, whole, endless, shift, round, rounds }: {
  exercise: Exercise;
  guided: boolean;
  whole: boolean;
  endless: boolean;
  shift: number;
  round: number;
  rounds: number;
}) {
  const { t } = useTranslation();
  const keyLabel = formatKeyName(exercise.key);
  const counter = t('session.round.counter', { round: round + 1, total: rounds });
  const roundLabel = rounds <= 1 ? undefined : endless ? t('session.results.round', { number: round + 1 }) : counter;

  const headerLine = guided
    ? `${activeStepLabel() ?? t('staff.header.todaysPractice')}${rounds > 1 ? ` · ${keyLabel} · ${counter}` : ''}`
    : endless
      ? `${keyLabel} · ${roundLabel}`
      : shift !== 0
        ? `${whole ? `${t('staff.header.wholeSong')} · ` : ''}${keyLabel} · ${t('staff.header.forRange', { shift: `${shift > 0 ? '+' : ''}${shift}` })}`
        : whole
          ? t('staff.header.wholeSong')
          : exercise.source;

  return { keyLabel, headerLine, roundLabel };
}
