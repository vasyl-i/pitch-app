/**
 * Fitting a day's lesson to the time the user said they want to practise.
 *
 * Every generator — the weekly plan, the free fixed progression, the adaptive
 * lesson — picks *which* exercises a day holds. This decides *how much* of
 * each: exercises are short (an ear drill is under a minute, a melody run
 * about half that), so a day reaches its budget by repeating them — more
 * rounds of a drill, more keys of a scale or arpeggio — rather than by
 * cramming in more different exercises than the catalog can supply. A song is
 * never repeated: it is heard once and sung once, in one key.
 *
 * Pure — runs under `node --test`.
 */
import { categoryRepeats } from '../../../entities/exercise/categories';
import { melodyById } from '../../../entities/exercise/library';
import { ladderRoom } from '../../../entities/exercise/transpose';
import type { PitchRange } from '../../../shared/lib/music';
import type { Activity, DailyLesson } from '../model/types';
import { displayMinutes, sessionSeconds } from './catalog';

/** most rounds an ear drill stretches to, as a multiple of its default */
export const MAX_EAR_ROUND_FACTOR = 3;
/** most keys a scale or arpeggio climbs through in one session */
export const MAX_LADDER_ROUNDS = 4;

/**
 * The most repetitions one session of `activity` may be stretched to. A
 * scale or arpeggio climbs a semitone per round, so the singer's range
 * (`trainingRange`) bounds it too; without one it may take every round.
 */
export function maxReps(activity: Activity, range: PitchRange | null = null): number {
  if (activity.kind === 'ear') return activity.rounds * MAX_EAR_ROUND_FACTOR;
  const exercise = melodyById(activity.id);
  if (!exercise || categoryRepeats(exercise.category) === 'once') return 1;
  return Math.min(MAX_LADDER_ROUNDS, ladderRoom(exercise, range));
}

/**
 * Keys a planner counts on a scale or arpeggio climbing through, before the
 * singer's range is known: a scale spans an octave, so a typical training
 * range leaves room for two or three.
 */
const PLANNING_LADDER_ROUNDS = 2;

/**
 * The most seconds `activity` can be counted on to fill once stretched —
 * what a planner needs to know to put enough exercises in a day. A song only
 * ever fills one run.
 */
export function capacitySeconds(activity: Activity): number {
  const cap = maxReps(activity);
  return sessionSeconds(activity, activity.kind === 'melody' ? Math.min(cap, PLANNING_LADDER_ROUNDS) : cap);
}

/**
 * Stretch each step's repetitions until the day fills `dailyMinutes`, one rep
 * at a time to whichever step is currently shortest, so time spreads evenly
 * across the exercises. Stops at each exercise's cap; a day whose exercises
 * are all capped stays under budget rather than repeating forever.
 */
export function fitLessonToBudget(
  lesson: DailyLesson,
  dailyMinutes: number,
  range: PitchRange | null = null,
): DailyLesson {
  const budgetSec = dailyMinutes * 60;
  const caps = lesson.steps.map((s) => maxReps(s.activity, range));
  const reps = lesson.steps.map((s, i) => Math.min(s.activity.rounds, caps[i]));
  const seconds = (i: number) => sessionSeconds(lesson.steps[i].activity, reps[i]);
  const total = () => reps.reduce((sum, _, i) => sum + seconds(i), 0);

  while (total() < budgetSec) {
    let shortest = -1;
    for (let i = 0; i < reps.length; i++) {
      if (reps[i] >= caps[i]) continue;
      if (shortest < 0 || seconds(i) < seconds(shortest)) shortest = i;
    }
    if (shortest < 0) break;
    reps[shortest] += 1;
  }

  const steps = lesson.steps.map((step, i) => ({
    ...step,
    rounds: reps[i],
    estMinutes: displayMinutes(seconds(i)),
  }));
  return { ...lesson, steps, estMinutes: displayMinutes(total()) };
}
