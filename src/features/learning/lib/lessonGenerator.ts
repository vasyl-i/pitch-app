/**
 * The daily lesson generator. Deterministic: the same profile on the same day
 * always produces the same lesson (so regenerating mid-day is stable), while
 * the seed and novelty pressure guarantee different days produce different
 * lessons.
 *
 * Structure: Warm-up → Core 1 → Core 2 → Review → Challenge → Cool down,
 * trimmed from the middle outward when the daily time budget is short. Core
 * slots chase weak goal-aligned skills (new material), the review slot serves
 * spaced repetition, and the challenge slot pushes a strong skill one tier up
 * — or turns into recovery when today already ran long.
 */
import type {
  Activity,
  DailyLesson,
  LearningPreferences,
  LessonSlot,
  LessonStep,
  ReviewState,
  SessionAnnotation,
  SkillId,
  SkillState,
} from '../model/types';
import { SKILL_LABELS } from '../model/types';
import { pickChallengeDifficultyId, pickDifficultyId, targetChallenge } from './adaptiveDifficulty';
import { FREE_CATALOG } from './catalog';
import { hashSeed, mulberry32 } from './seeded';
import { GOAL_SKILLS } from './skillMap';
import { dueReviews, REVIEW_INTERVALS_DAYS } from './spacedRepetition';

/** what the generator needs to know about pitch tendencies (see noteHeatmap) */
export interface TendencyFact {
  name: string;
  /** signed cents, positive = sharp */
  avgCents: number;
  count: number;
}

export interface LessonInput {
  /** local calendar day key — the determinism anchor */
  dayKey: string;
  prefs: LearningPreferences | null;
  skills: Record<SkillId, SkillState>;
  reviews: Partial<Record<SkillId, ReviewState>>;
  focus: SkillId | null;
  streak: number;
  /** newest first */
  annotations: SessionAnnotation[];
  tendencies: TendencyFact[];
  minutesPracticedToday: number;
  /**
   * The activities this user may be given. Defaults to the free catalog so
   * the generator can never hand a free user a locked exercise by omission —
   * unlocking is an explicit act by the caller, not a default.
   */
  catalog?: Activity[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** slots included per daily time budget, in lesson order */
function slotsForBudget(minutes: number): LessonSlot[] {
  if (minutes <= 5) return ['warmup', 'core-1', 'cooldown'];
  if (minutes <= 10) return ['warmup', 'core-1', 'core-2', 'cooldown'];
  if (minutes <= 15) return ['warmup', 'core-1', 'core-2', 'review', 'cooldown'];
  return ['warmup', 'core-1', 'core-2', 'review', 'challenge', 'cooldown'];
}

function skillNeed(skills: Record<SkillId, SkillState>, skill: SkillId): number {
  return 100 - skills[skill].mastery;
}

export function generateDailyLesson(input: LessonInput): DailyLesson {
  const { skills, prefs, focus } = input;
  const catalog = input.catalog ?? FREE_CATALOG;
  const rand = mulberry32(hashSeed(`lesson:${input.dayKey}:${input.streak}:${prefs?.primaryGoal ?? 'none'}`));

  const goalSkills = new Set<SkillId>(
    prefs
      ? [...GOAL_SKILLS[prefs.primaryGoal], ...(prefs.secondaryGoal ? GOAL_SKILLS[prefs.secondaryGoal] : [])]
      : []
  );
  const now = Date.parse(input.dayKey) || Date.now();
  const due = dueReviews(input.reviews, skills, now + DAY_MS / 2);
  const dueSet = new Set(due.map((d) => d.skill));

  // an activity trains intonation if its primary skill is a pitch-target skill
  const tendency = input.tendencies.find((t) => t.count >= 5 && Math.abs(t.avgCents) >= 20);

  const fatigued = prefs !== null && input.minutesPracticedToday >= prefs.dailyMinutes * 1.5;
  const recentIds = new Set(
    input.annotations
      .filter((a) => now - a.sessionAt < 2 * DAY_MS)
      .map((a) => a.exerciseId.replace(/^ear:/, ''))
  );

  interface Scored {
    activity: Activity;
    score: number;
    why: string;
  }

  /** need-based score + the dominant reason, per activity */
  const scoreActivity = (activity: Activity, challengeTarget: number): Scored => {
    const primary = activity.skills[0];
    let best = { score: skillNeed(skills, primary) * 0.5, why: `${SKILL_LABELS[primary]} is at ${skills[primary].mastery}/100 — room to grow` };

    const bump = (score: number, why: string) => {
      if (score > best.score) best = { score, why };
    };

    if (goalSkills.has(primary) && prefs) {
      bump(
        skillNeed(skills, primary) * 0.5 + 15,
        `${SKILL_LABELS[primary]} (${skills[primary].mastery}/100) is central to your goal`
      );
    }
    if (focus && activity.skills.includes(focus)) {
      bump(skillNeed(skills, focus) * 0.5 + 20, `trains ${SKILL_LABELS[focus]} — this week's focus`);
    }
    const dueSkill = activity.skills.find((s) => dueSet.has(s));
    if (dueSkill) {
      const d = due.find((x) => x.skill === dueSkill);
      bump(
        skillNeed(skills, dueSkill) * 0.5 + 25,
        `${SKILL_LABELS[dueSkill]} is due for review — last practiced ${d?.daysSincePracticed ?? '?'} days ago`
      );
    }
    if (tendency && (primary === 'pitch-accuracy' || primary === 'interval-singing')) {
      bump(
        skillNeed(skills, primary) * 0.5 + 12,
        `you tend to sing ${tendency.name} slightly ${tendency.avgCents > 0 ? 'sharp' : 'flat'} — targeted pitch work helps`
      );
    }

    let score = best.score;
    score -= Math.abs(activity.challenge - challengeTarget) * 25;
    if (recentIds.has(activity.id)) score -= 18; // novelty: rotate material
    score += rand() * 6; // seeded tie-break jitter
    return { activity, score, why: best.why };
  };

  const rankFor = (pool: Activity[], challengeTarget: number): Scored[] =>
    pool.map((a) => scoreActivity(a, challengeTarget)).sort((a, b) => b.score - a.score);

  const used = new Set<string>();
  const steps: LessonStep[] = [];

  const push = (slot: LessonSlot, scored: Scored | undefined, opts?: { reason?: string; difficultyId?: string }) => {
    if (!scored) return;
    const { activity } = scored;
    used.add(activity.id);
    const difficultyId =
      opts?.difficultyId ?? pickDifficultyId(activity, skills, prefs, input.annotations, fatigued);
    steps.push({
      slot,
      activity,
      difficultyId,
      reason: opts?.reason ?? scored.why,
      estMinutes: activity.minutes,
    });
  };

  const firstUnused = (ranked: Scored[], filter?: (a: Activity) => boolean): Scored | undefined =>
    ranked.find((s) => !used.has(s.activity.id) && (filter ? filter(s.activity) : true));

  const slots = slotsForBudget(prefs?.dailyMinutes ?? 15);

  // warm-up: something gentle that wakes up the voice
  const warmupPool = catalog.filter(
    (a) => a.challenge <= 0.3 && a.skills.some((s) => s === 'voice-control' || s === 'pitch-stability' || s === 'pitch-accuracy')
  );
  push('warmup', firstUnused(rankFor(warmupPool, 0.2)), {
    reason: 'gentle start to wake up your voice and ear',
  });

  // cores: chase the weakest needs at a comfortable challenge level
  const primaryFor = (a: Activity) => a.skills[0];
  const coreTarget = (a: Activity) => targetChallenge(skills[primaryFor(a)], prefs, fatigued);
  const coreRanked = catalog.map((a) => scoreActivity(a, coreTarget(a))).sort((x, y) => y.score - x.score);
  if (slots.includes('core-1')) {
    const core1 = firstUnused(coreRanked);
    push('core-1', core1);
    if (slots.includes('core-2')) {
      // a different activity training a different primary skill, for balance
      const core2 = firstUnused(coreRanked, (a) => !core1 || primaryFor(a) !== primaryFor(core1.activity));
      push('core-2', core2 ?? firstUnused(coreRanked));
    }
  }

  // review: the most urgent spaced-repetition item the cores didn't cover
  if (slots.includes('review')) {
    const dueLeft = due.find((d) => !steps.some((s) => s.activity.skills.includes(d.skill)));
    const target = dueLeft ?? due[0];
    if (target) {
      const pool = catalog.filter((a) => a.skills.includes(target.skill) && skills[target.skill].exercisesCompleted > 0);
      const idx = input.reviews[target.skill]?.intervalIndex ?? 0;
      push('review', firstUnused(rankFor(pool, 0.3)), {
        reason: `spaced review: ${SKILL_LABELS[target.skill]} comes back after ${REVIEW_INTERVALS_DAYS[idx]} day${REVIEW_INTERVALS_DAYS[idx] === 1 ? '' : 's'} so it sticks`,
      });
    }
  }

  // challenge: push a strong skill one tier — or recover if today ran long
  if (slots.includes('challenge')) {
    if (fatigued) {
      const easyPool = catalog.filter((a) => a.challenge <= 0.3);
      push('challenge', firstUnused(rankFor(easyPool, 0.2)), {
        reason: 'you already practiced a lot today — something light instead of a push',
      });
    } else {
      const strong = (Object.keys(skills) as SkillId[])
        .filter((s) => skills[s].mastery >= 55)
        .sort((a, b) => skills[b].mastery - skills[a].mastery)[0];
      const pool = strong ? catalog.filter((a) => a.skills[0] === strong) : catalog.filter((a) => a.challenge >= 0.4);
      const scored = firstUnused(rankFor(pool, 0.7)) ?? firstUnused(rankFor(catalog, 0.7));
      if (scored) {
        push('challenge', scored, {
          reason: strong
            ? `stretch goal: ${SKILL_LABELS[strong]} is strong (${skills[strong].mastery}/100) — push it one level up`
            : 'a stretch beyond your comfort zone — misses here are progress',
          difficultyId: pickChallengeDifficultyId(scored.activity, skills, prefs, input.annotations),
        });
      }
    }
  }

  // cool down: easy and familiar, end on a win
  const coolPool = catalog.filter((a) => a.challenge <= 0.3);
  push('cooldown', firstUnused(rankFor(coolPool, 0.15)), {
    reason: 'finish relaxed — an easy rep you can nail',
  });

  return {
    dayKey: input.dayKey,
    focus,
    steps,
    estMinutes: steps.reduce((sum, s) => sum + s.estMinutes, 0),
  };
}
