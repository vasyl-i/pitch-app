/**
 * The recommendation engine: a fixed, ordered list of deterministic rules —
 * no models, no randomness. Every recommendation carries the reason it fired,
 * in plain language, so the "why" can always be shown next to the "what".
 *
 * Rule order (highest priority first):
 *   1. due-review   — spaced repetition says a skill is due/overdue
 *   2. tendency     — a consistent sharp/flat tendency on a pitch class
 *   3. goal-gap     — the weakest skill on the user's stated goal path
 *   4. declining    — a skill whose trend turned downward
 *   5. unexplored   — a goal-relevant skill never trained at all
 *   6. level-up     — a strong, confident skill ready for the next tier
 */
import type {
  Activity,
  LearningPreferences,
  Recommendation,
  ReviewState,
  SessionAnnotation,
  SkillId,
  SkillState,
} from '../model/types';
import { SKILL_LABELS } from '../model/types';
import { pickChallengeDifficultyId, pickDifficultyId } from './adaptiveDifficulty';
import { FREE_CATALOG } from './catalog';
import type { TendencyFact } from './lessonGenerator';
import { GOAL_SKILLS } from './skillMap';
import { dueReviews } from './spacedRepetition';

export interface RecommendationInput {
  skills: Record<SkillId, SkillState>;
  reviews: Partial<Record<SkillId, ReviewState>>;
  prefs: LearningPreferences | null;
  focus: SkillId | null;
  tendencies: TendencyFact[];
  /** newest first */
  annotations: SessionAnnotation[];
  now: number;
  /** activities this user may open; defaults to free-only (see catalog) */
  catalog?: Activity[];
}

/** the catalog activity whose primary skill matches, preferring already-seen material for reviews */
function activityForSkill(catalog: Activity[], skill: SkillId, preferFamiliar: boolean) {
  const pool = catalog.filter((a) => a.skills[0] === skill);
  const fallback = catalog.filter((a) => a.skills.includes(skill));
  const candidates = pool.length ? pool : fallback;
  if (candidates.length === 0) return undefined;
  if (preferFamiliar) return candidates[0];
  // fresh material: lowest challenge first so new skills start gently
  return [...candidates].sort((a, b) => a.challenge - b.challenge)[0];
}

export function buildRecommendations(input: RecommendationInput, limit = 3): Recommendation[] {
  const { skills, prefs } = input;
  const catalog = input.catalog ?? FREE_CATALOG;
  const out: Recommendation[] = [];
  const coveredSkills = new Set<SkillId>();

  const add = (
    ruleId: Recommendation['ruleId'],
    skill: SkillId,
    reason: string,
    opts?: { challenge?: boolean; preferFamiliar?: boolean }
  ) => {
    if (coveredSkills.has(skill)) return;
    const activity = activityForSkill(catalog, skill, opts?.preferFamiliar ?? true);
    if (!activity) return;
    coveredSkills.add(skill);
    out.push({
      id: `${ruleId}:${skill}`,
      ruleId,
      title: activity.title,
      reason,
      activity,
      difficultyId: opts?.challenge
        ? pickChallengeDifficultyId(activity, skills, prefs, input.annotations)
        : pickDifficultyId(activity, skills, prefs, input.annotations),
      priority: out.length,
    });
  };

  // 1. due reviews (weakest first, as dueReviews orders them)
  for (const due of dueReviews(input.reviews, skills, input.now).slice(0, 2)) {
    add(
      'due-review',
      due.skill,
      due.overdueDays > 0
        ? `${SKILL_LABELS[due.skill]} is ${due.overdueDays} day${due.overdueDays === 1 ? '' : 's'} overdue for review — a quick session keeps it from fading.`
        : `${SKILL_LABELS[due.skill]} is due for its spaced review today (last practiced ${due.daysSincePracticed} days ago).`
    );
  }

  // 2. consistent sharp/flat tendency on a pitch class
  const tendency = input.tendencies
    .filter((t) => t.count >= 5 && Math.abs(t.avgCents) >= 20)
    .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents))[0];
  if (tendency) {
    const direction = tendency.avgCents > 0 ? 'sharp' : 'flat';
    add(
      'tendency',
      'pitch-accuracy',
      `You consistently sing ${tendency.name} slightly ${direction} (about ${Math.abs(Math.round(tendency.avgCents))} cents). Targeted pitch work will tighten it.`
    );
  }

  // 3. weakest goal-aligned skill still below solid mastery
  if (prefs) {
    const goalPath = GOAL_SKILLS[prefs.primaryGoal];
    const weakest = [...goalPath].sort((a, b) => skills[a].mastery - skills[b].mastery)[0];
    if (weakest && skills[weakest].mastery < 60) {
      add(
        'goal-gap',
        weakest,
        `${SKILL_LABELS[weakest]} (${skills[weakest].mastery}/100) is the biggest gap on your "${prefs.primaryGoal === 'complete-beginner' ? 'fundamentals' : SKILL_LABELS[goalPath[0]].toLowerCase()}" path.`,
        { preferFamiliar: false }
      );
    }
  }

  // 4. a skill that has started slipping
  const declining = (Object.keys(skills) as SkillId[])
    .filter((s) => skills[s].trend === 'declining' && skills[s].exercisesCompleted >= 3)
    .sort((a, b) => skills[a].mastery - skills[b].mastery)[0];
  if (declining) {
    add(
      'declining',
      declining,
      `${SKILL_LABELS[declining]} has dipped in recent sessions — one focused session usually brings it back.`
    );
  }

  // 5. goal-relevant skill never tried
  if (prefs) {
    const untried = GOAL_SKILLS[prefs.primaryGoal].find((s) => skills[s].exercisesCompleted === 0);
    if (untried) {
      add('unexplored', untried, `You haven't tried ${SKILL_LABELS[untried]} yet — it's part of your goal path.`, {
        preferFamiliar: false,
      });
    }
  }

  // 6. strong skill ready for the next level
  const strong = (Object.keys(skills) as SkillId[])
    .filter((s) => skills[s].mastery >= 70 && skills[s].confidence >= 0.5)
    .sort((a, b) => skills[b].mastery - skills[a].mastery)[0];
  if (strong) {
    add(
      'level-up',
      strong,
      `${SKILL_LABELS[strong]} is strong (${skills[strong].mastery}/100) — you're ready to try it a level harder.`,
      { challenge: true }
    );
  }

  return out.slice(0, limit);
}
