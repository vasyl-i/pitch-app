/**
 * Write-through sync: subscribes to Zustand store changes and pushes
 * them to Supabase when the user is authenticated.
 *
 * Strategy (prototype):
 *   - On store change → upsert to Supabase (debounced)
 *   - On sign-in → pull from Supabase, merge (server wins)
 *   - Local MMKV remains the primary store for offline use
 */
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from './authStore';
import { useProfileStore } from '@/entities/profile';
import { useProgressStore } from '@/features/progress';
import { useLearningStore, useLessonSessionStore, usePreferencesStore, type SkillId } from '@/features/learning';

type Unsubscribe = () => void;

let activeSubs: Unsubscribe[] = [];

// ── Sync-ready signal ──────────────────────────────────────────────
// Lets consumers (e.g. RootNavigator) wait for the initial server pull
// before choosing a route — prevents showing onboarding to a returning
// user whose profile hasn't loaded from Supabase yet.
let syncReadyResolve: (() => void) | null = null;
let syncReadyPromise: Promise<void> | null = null;

/** Returns a promise that resolves once the initial pullFromServer completes. */
export function waitForSyncReady(): Promise<void> {
  return syncReadyPromise ?? Promise.resolve();
}

/** Prepare a fresh sync-ready gate. Call before pullFromServer(). */
export function prepareSyncGate() {
  syncReadyPromise = new Promise<void>((resolve) => {
    syncReadyResolve = resolve;
  });
}

function resolveSyncGate() {
  syncReadyResolve?.();
  syncReadyResolve = null;
}

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

// ── Debounce helper ─────────────────────────────────────────────────
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function debounced(key: string, fn: () => void, ms = 1000) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(fn, ms));
}

// ── Push helpers ────────────────────────────────────────────────────
async function pushVocalProfile() {
  const userId = getUserId();
  const profile = useProfileStore.getState().profile;
  if (!userId || !profile) return;

  await supabase.from('vocal_profiles').upsert({
    user_id: userId,
    max_low_midi: profile.maximumRange.lowMidi,
    max_high_midi: profile.maximumRange.highMidi,
    comfort_low_midi: profile.comfortRange.lowMidi,
    comfort_high_midi: profile.comfortRange.highMidi,
    confidence: profile.confidence,
    detected_at: profile.detectedAt ? new Date(profile.detectedAt).toISOString() : null,
    temp_adjustment: profile.temporaryAdjustment,
    auto_transpose: useProfileStore.getState().autoTranspose,
    updated_at: new Date().toISOString(),
  });
}

async function pushLearningPreferences() {
  const userId = getUserId();
  const prefs = usePreferencesStore.getState().preferences;
  if (!userId || !prefs) return;

  await supabase.from('learning_preferences').upsert({
    user_id: userId,
    primary_goal: prefs.primaryGoal,
    secondary_goal: prefs.secondaryGoal,
    daily_minutes: prefs.dailyMinutes,
    experience: prefs.experience,
    music_reading: prefs.musicReading,
    preferred_genres: prefs.preferredGenres,
    coach_style: prefs.coachStyle,
    preferred_difficulty: prefs.preferredDifficulty,
    exercise_balance: prefs.exerciseBalance ?? 0.5,
    disabled_exercises: prefs.disabledExercises ?? [],
    skip_redo_warning: prefs.skipRedoWarning ?? false,
    updated_at: new Date().toISOString(),
  });
}

async function pushSkills() {
  const userId = getUserId();
  const { skills, reviews } = useLearningStore.getState();
  if (!userId) return;

  const rows = Object.entries(skills).map(([skillId, s]) => {
    const review = reviews[skillId as SkillId];
    return {
      user_id: userId,
      skill_id: skillId,
      mastery: s.mastery,
      confidence: s.confidence,
      trend: s.trend,
      practice_time_sec: s.practiceTimeSec,
      exercises_completed: s.exercisesCompleted,
      fast_ewma: s.fast,
      slow_ewma: s.slow,
      review_interval_idx: review?.intervalIndex ?? null,
      review_next_due_at: review?.nextDueAt
        ? new Date(review.nextDueAt).toISOString()
        : null,
      review_last_at: review?.lastPracticedAt
        ? new Date(review.lastPracticedAt).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
  });

  if (rows.length > 0) {
    await supabase.from('skills').upsert(rows);
  }
}

async function pushSession(session: { exerciseId: string; exerciseTitle: string; at: number; score: number; stars: number; avgCents: number; stability: number; rhythm: number; durationSec?: number; notes: Record<number, unknown>; notesByMidi?: Record<number, unknown>; intervals?: Record<string, unknown> }) {
  const userId = getUserId();
  if (!userId) return;

  await supabase.from('sessions').insert({
    user_id: userId,
    exercise_id: session.exerciseId,
    exercise_title: session.exerciseTitle,
    score: session.score,
    stars: session.stars,
    avg_cents: session.avgCents,
    stability: session.stability,
    rhythm: session.rhythm,
    duration_sec: session.durationSec,
    notes: session.notes,
    notes_by_midi: session.notesByMidi,
    intervals: session.intervals,
    created_at: new Date(session.at).toISOString(),
  });
}

async function pushDailyPlan() {
  const userId = getUserId();
  const { dayKey, steps, estMinutes, completedSlots, partialProgress, updatedAt } = useLessonSessionStore.getState();
  if (!userId || !dayKey || steps.length === 0) return;

  await supabase.from('daily_plans').upsert({
    user_id: userId,
    day_key: dayKey,
    plan_data: { steps, estMinutes, completedSlots, partialProgress },
    updated_at: new Date(updatedAt || Date.now()).toISOString(),
  });
}

async function pushWeekSnapshots() {
  const userId = getUserId();
  const { weekSnapshots } = useLearningStore.getState();
  if (!userId || weekSnapshots.length === 0) return;

  const rows = weekSnapshots.map((s) => ({
    user_id: userId,
    week_key: s.weekKey,
    mastery: s.mastery,
  }));

  await supabase.from('skill_snapshots').upsert(rows);
}

// ── Pull from server (on sign-in) ──────────────────────────────────
export async function pullFromServer() {
  const userId = getUserId();
  if (!userId) {
    resolveSyncGate();
    return;
  }

  try {
    // Vocal profile
    const { data: vp } = await supabase
      .from('vocal_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (vp) {
      useProfileStore.getState().setDetectedRange(
        { lowMidi: vp.max_low_midi, highMidi: vp.max_high_midi },
        vp.confidence,
        vp.detected_at ? new Date(vp.detected_at).getTime() : undefined,
      );
      if (vp.comfort_low_midi != null && vp.comfort_high_midi != null) {
        useProfileStore.getState().setComfortRange({
          lowMidi: vp.comfort_low_midi,
          highMidi: vp.comfort_high_midi,
        });
      }
      if (vp.temp_adjustment) {
        useProfileStore.getState().setTemporaryAdjustment(vp.temp_adjustment);
      }
    }

    // Learning preferences
    const { data: lp } = await supabase
      .from('learning_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (lp) {
      usePreferencesStore.getState().setPreferences({
        primaryGoal: lp.primary_goal,
        secondaryGoal: lp.secondary_goal,
        dailyMinutes: lp.daily_minutes,
        experience: lp.experience,
        musicReading: lp.music_reading,
        preferredGenres: lp.preferred_genres ?? [],
        coachStyle: lp.coach_style,
        preferredDifficulty: lp.preferred_difficulty,
        exerciseBalance: lp.exercise_balance ?? 0.5,
        disabledExercises: lp.disabled_exercises ?? [],
        skipRedoWarning: lp.skip_redo_warning ?? false,
      });
    }

    // Skill snapshots (for long-term progress charts)
    const { data: snapshots } = await supabase
      .from('skill_snapshots')
      .select('week_key, mastery')
      .eq('user_id', userId)
      .order('week_key', { ascending: false })
      .limit(52);

    if (snapshots && snapshots.length > 0) {
      const local = useLearningStore.getState().weekSnapshots;
      const localKeys = new Set(local.map((s) => s.weekKey));
      const merged = [...local];
      for (const row of snapshots) {
        if (!localKeys.has(row.week_key)) {
          merged.push({ weekKey: row.week_key, mastery: row.mastery });
        }
      }
      merged.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
      useLearningStore.setState({ weekSnapshots: merged.slice(0, 52) });
    }

    // Practice sessions (merge server sessions into local MMKV store)
    const { data: serverSessions } = await supabase
      .from('sessions')
      .select('exercise_id, exercise_title, score, stars, avg_cents, stability, rhythm, duration_sec, notes, notes_by_midi, intervals, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (serverSessions && serverSessions.length > 0) {
      const localSessions = useProgressStore.getState().sessions;
      const localTimestamps = new Set(localSessions.map((s) => s.at));
      const newSessions: import('@/features/progress').SessionRecord[] = [];
      for (const row of serverSessions) {
        const at = new Date(row.created_at).getTime();
        if (!localTimestamps.has(at)) {
          newSessions.push({
            exerciseId: row.exercise_id,
            exerciseTitle: row.exercise_title ?? '',
            at,
            score: row.score ?? 0,
            stars: row.stars ?? 0,
            avgCents: row.avg_cents ?? 0,
            stability: row.stability ?? 0,
            rhythm: row.rhythm ?? 0,
            durationSec: row.duration_sec ?? undefined,
            notes: row.notes ?? {},
            notesByMidi: row.notes_by_midi ?? undefined,
            intervals: row.intervals ?? undefined,
          });
        }
      }
      if (newSessions.length > 0) {
        const merged = [...localSessions, ...newSessions]
          .sort((a, b) => b.at - a.at)
          .slice(0, 500);
        useProgressStore.setState({ sessions: merged });
      }
    }

    // Daily plan progress (restore today's completedSlots from server)
    const localSession = useLessonSessionStore.getState();
    const todayDayKey = localSession.dayKey;
    if (todayDayKey) {
      const { data: dp } = await supabase
        .from('daily_plans')
        .select('plan_data, updated_at')
        .eq('user_id', userId)
        .eq('day_key', todayDayKey)
        .single();

      if (dp?.plan_data) {
        const serverUpdatedAt = dp.updated_at ? new Date(dp.updated_at).getTime() : 0;
        const localUpdatedAt = localSession.updatedAt ?? 0;
        // Server wins if newer — handles new-device login and multi-device sync
        if (serverUpdatedAt > localUpdatedAt && Array.isArray(dp.plan_data.completedSlots)) {
          useLessonSessionStore.setState({
            completedSlots: dp.plan_data.completedSlots,
            ...(dp.plan_data.partialProgress ? { partialProgress: dp.plan_data.partialProgress } : {}),
            updatedAt: serverUpdatedAt,
          });
        }
      }
    }
  } finally {
    resolveSyncGate();
  }
}

// ── Start / stop sync ───────────────────────────────────────────────
export function startSync() {
  stopSync();

  // Watch profile changes
  activeSubs.push(
    useProfileStore.subscribe(() => {
      debounced('vocal-profile', pushVocalProfile);
    }),
  );

  // Watch learning preferences
  activeSubs.push(
    usePreferencesStore.subscribe(() => {
      debounced('learning-prefs', pushLearningPreferences);
    }),
  );

  // Watch skills
  activeSubs.push(
    useLearningStore.subscribe(() => {
      debounced('skills', pushSkills);
    }),
  );

  // Watch new sessions (append-only — track length changes)
  let lastSessionCount = useProgressStore.getState().sessions.length;
  activeSubs.push(
    useProgressStore.subscribe((state) => {
      if (state.sessions.length > lastSessionCount) {
        const newSession = state.sessions[0]; // newest is prepended
        if (newSession) pushSession(newSession);
        lastSessionCount = state.sessions.length;
      }
    }),
  );

  // Watch daily plan changes (new day, regeneration, step completion, or partial progress)
  let lastDayKey = useLessonSessionStore.getState().dayKey;
  let lastCompletedCount = useLessonSessionStore.getState().completedSlots.length;
  let lastPartialKeys = Object.keys(useLessonSessionStore.getState().partialProgress).length;
  activeSubs.push(
    useLessonSessionStore.subscribe((state) => {
      const dayChanged = state.dayKey != null && state.dayKey !== lastDayKey;
      const slotsChanged = state.completedSlots.length !== lastCompletedCount;
      const partialChanged = Object.keys(state.partialProgress).length !== lastPartialKeys;
      if (dayChanged || slotsChanged || partialChanged) {
        lastDayKey = state.dayKey;
        lastCompletedCount = state.completedSlots.length;
        lastPartialKeys = Object.keys(state.partialProgress).length;
        debounced('daily-plan', pushDailyPlan);
      }
    }),
  );

  // Watch week snapshots (pushed when ensureWeek runs)
  let lastSnapshotCount = useLearningStore.getState().weekSnapshots.length;
  activeSubs.push(
    useLearningStore.subscribe((state) => {
      if (state.weekSnapshots.length > lastSnapshotCount) {
        lastSnapshotCount = state.weekSnapshots.length;
        debounced('week-snapshots', pushWeekSnapshots);
      }
    }),
  );
}

export function stopSync() {
  activeSubs.forEach((unsub) => unsub());
  activeSubs = [];
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
}
