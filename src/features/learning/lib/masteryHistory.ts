/**
 * Mastery over time: each practiced day's closing mastery per trained skill.
 * This is what the Progress tab charts and what "the last 7 days" compares
 * against — mastery only moves when a session is folded in, so a day's
 * closing value holds until the next practiced day.
 */
import { isoDay } from '@/features/progress/lib/history';
import { BASELINE_MASTERY } from './mastery';
import type { SessionAnnotation, SkillId, SkillState } from '../model/types';

/** `YYYY-MM-DD` → mastery 0–100 per skill trained by then */
export type MasteryHistory = Record<string, Partial<Record<SkillId, number>>>;

const clampRound = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

/** today's row set to the current mastery of every skill trained so far */
export function recordMasteryDay(
  history: MasteryHistory,
  skills: Record<SkillId, SkillState>,
  at: number,
): MasteryHistory {
  const row: Partial<Record<SkillId, number>> = {};
  for (const [skill, state] of Object.entries(skills) as [SkillId, SkillState][]) {
    if (state.exercisesCompleted > 0) row[skill] = state.mastery;
  }
  return { ...history, [isoDay(at)]: row };
}

/**
 * Rebuild the history from session annotations, for profiles that predate
 * it. Each annotation holds the mastery change its session caused, so
 * walking back from today's values undoes one day at a time.
 */
export function masteryHistoryFromAnnotations(
  skills: Record<SkillId, SkillState>,
  annotations: SessionAnnotation[],
): MasteryHistory {
  const values = Object.fromEntries(
    (Object.entries(skills) as [SkillId, SkillState][]).map(([skill, state]) => [skill, state.slow]),
  ) as Record<SkillId, number>;
  // newest first; a skill counts as trained from its earliest annotated day on
  const byDay = new Map<string, SessionAnnotation[]>();
  const firstDay = new Map<SkillId, string>();
  for (const a of [...annotations].sort((x, y) => y.sessionAt - x.sessionAt)) {
    const day = isoDay(a.sessionAt);
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
    for (const skill of Object.keys(a.skills) as SkillId[]) firstDay.set(skill, day);
  }

  const history: MasteryHistory = {};
  for (const [day, dayAnnotations] of byDay) {
    const row: Partial<Record<SkillId, number>> = {};
    for (const [skill, first] of firstDay) if (first <= day) row[skill] = clampRound(values[skill]);
    history[day] = row;
    // step back to the close of the previous practiced day
    for (const a of dayAnnotations) {
      for (const [skill, s] of Object.entries(a.skills) as [SkillId, { delta: number }][]) values[skill] -= s.delta;
    }
  }
  return history;
}

/**
 * Mastery as it stood at the close of `day`: the latest row on or before it.
 * A skill not yet trained by then sits at the neutral starting value.
 */
export function masteryAsOf(history: MasteryHistory, day: string, skills: SkillId[]): Record<SkillId, number> {
  const earlier = Object.keys(history).filter((d) => d <= day).sort().reverse();
  const out = {} as Record<SkillId, number>;
  for (const skill of skills) {
    const hit = earlier.find((d) => history[d][skill] !== undefined);
    out[skill] = hit ? history[hit][skill]! : BASELINE_MASTERY;
  }
  return out;
}

/**
 * One skill's line over a range: where it stood as the range opened, each
 * practiced day's close inside it, then held flat to today.
 */
export function masterySeries(
  history: MasteryHistory,
  skill: SkillId,
  startDay: string,
  endDay: string,
): { day: string; value: number }[] {
  const before = Object.keys(history).filter((d) => d < startDay).sort().reverse();
  const opening = before.find((d) => history[d][skill] !== undefined);
  const inside = Object.keys(history)
    .filter((d) => d >= startDay && d <= endDay && history[d][skill] !== undefined)
    .sort()
    .map((day) => ({ day, value: history[day][skill]! }));
  // first trained inside the range: the line starts that day, from the neutral prior
  const points =
    opening !== undefined
      ? [{ day: startDay, value: history[opening][skill]! }, ...inside.filter((p) => p.day !== startDay)]
      : inside.length > 0
        ? [{ day: inside[0].day, value: BASELINE_MASTERY }, ...inside]
        : [];
  if (points.length > 0 && points[points.length - 1].day !== endDay) points.push({ day: endDay, value: points[points.length - 1].value });
  return points;
}
