/**
 * The persistent LearningProfile: long-term skill states, spaced-repetition
 * schedules, weekly focus, weekly mastery snapshots, and per-session
 * annotations. Written only by the learning tracker (which ingests finished
 * sessions from the progress store); screens subscribe read-only.
 *
 * Headline session facts (score, duration, date) stay in the progress store —
 * annotations store only the learning-side facts, joined by timestamp, so no
 * information is persisted twice. Editing preferences never touches this
 * store, so historical learning data survives any preference change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ingestSession, type SessionFacts } from '../lib/ingest';
import { emptySkillState } from '../lib/mastery';
import { chooseWeeklyFocus, weekKeyOf } from '../lib/weekly';
import {
  ALL_SKILLS,
  type LearningPreferences,
  type ReviewState,
  type SessionAnnotation,
  type SkillId,
  type SkillState,
} from './types';

const MAX_ANNOTATIONS = 400;
const MAX_SNAPSHOTS = 12;

export function emptySkills(): Record<SkillId, SkillState> {
  return Object.fromEntries(ALL_SKILLS.map((s) => [s, emptySkillState()])) as Record<SkillId, SkillState>;
}

export interface WeekSnapshot {
  weekKey: string;
  mastery: Record<SkillId, number>;
}

interface LearningState {
  skills: Record<SkillId, SkillState>;
  reviews: Partial<Record<SkillId, ReviewState>>;
  /** newest first, capped */
  annotations: SessionAnnotation[];
  /** progress sessions with `at` ≤ this are already folded in */
  lastIngestedAt: number;
  weeklyFocus: { weekKey: string; skill: SkillId } | null;
  /** mastery at the start of each recent week, for weekly-review deltas */
  weekSnapshots: WeekSnapshot[];

  /** roll the week over if needed: pick a focus and snapshot mastery */
  ensureWeek: (prefs: LearningPreferences | null, now?: number) => void;
  /** fold newly-recorded practice sessions into the profile (oldest first) */
  ingest: (records: SessionFacts[]) => void;
  clearLearningData: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      skills: emptySkills(),
      reviews: {},
      annotations: [],
      lastIngestedAt: 0,
      weeklyFocus: null,
      weekSnapshots: [],

      ensureWeek: (prefs, now = Date.now()) => {
        const s = get();
        const weekKey = weekKeyOf(now);
        if (s.weeklyFocus?.weekKey === weekKey) return;
        const skill = chooseWeeklyFocus(s.skills, prefs, weekKey, s.weeklyFocus?.skill ?? null);
        const mastery = Object.fromEntries(
          (Object.keys(s.skills) as SkillId[]).map((k) => [k, s.skills[k].mastery])
        ) as Record<SkillId, number>;
        set({
          weeklyFocus: { weekKey, skill },
          weekSnapshots: [{ weekKey, mastery }, ...s.weekSnapshots.filter((w) => w.weekKey !== weekKey)].slice(
            0,
            MAX_SNAPSHOTS
          ),
        });
      },

      ingest: (records) => {
        if (records.length === 0) return;
        const s = get();
        let { skills, reviews } = s;
        const annotations = [...s.annotations];
        let lastIngestedAt = s.lastIngestedAt;

        for (const facts of [...records].sort((a, b) => a.at - b.at)) {
          if (facts.at <= s.lastIngestedAt) continue;
          const result = ingestSession(skills, reviews, facts, s.weeklyFocus?.skill ?? null);
          skills = result.skills;
          reviews = result.reviews;
          annotations.unshift(result.annotation);
          lastIngestedAt = Math.max(lastIngestedAt, facts.at);
        }

        set({ skills, reviews, annotations: annotations.slice(0, MAX_ANNOTATIONS), lastIngestedAt });
      },

      clearLearningData: () =>
        set({
          skills: emptySkills(),
          reviews: {},
          annotations: [],
          lastIngestedAt: 0,
          weeklyFocus: null,
          weekSnapshots: [],
        }),
    }),
    {
      name: 'pitch-coach-learning',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // new skills added in later app versions get a fresh empty state
      merge: (persisted, current) => {
        const p = persisted as Partial<LearningState> | undefined;
        return {
          ...current,
          ...p,
          skills: { ...emptySkills(), ...(p?.skills ?? {}) },
        };
      },
    }
  )
);
