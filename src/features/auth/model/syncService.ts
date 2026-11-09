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
import { isOffline } from '@/shared/lib/network';
import { useAuthStore } from './authStore';
import { useProfileStore } from '@/entities/profile';
import { useProgressStore, type DayHistory, type SessionRecord } from '@/features/progress';
import {
  DEFAULT_PREFERENCES,
  useLearningStore,
  useLessonSessionStore,
  usePreferencesStore,
  type MasteryHistory,
  type SkillId,
} from '@/features/learning';

type Unsubscribe = () => void;

let activeSubs: Unsubscribe[] = [];
/** set while server data is merged in, so the watchers don't echo it back */
let importing = false;

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
async function pushTotalPractice() {
  const userId = getUserId();
  if (!userId) return;
  const totalPracticeSec = useProgressStore.getState().totalPracticeSec;
  await supabase.from('profiles').update({ total_practice_sec: totalPracticeSec }).eq('id', userId);
}

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
    updated_at: new Date(useProfileStore.getState().updatedAt || Date.now()).toISOString(),
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
    reminder_hour: prefs.reminderHour,
    reminder_minute: prefs.reminderMinute ?? 0,
    exercise_balance: prefs.exerciseBalance ?? 0.5,
    disabled_exercises: prefs.disabledExercises ?? [],
    skip_redo_warning: prefs.skipRedoWarning ?? false,
    weekly_plan: prefs.weeklyPlan ?? null,
    updated_at: new Date(prefs.updatedAt || Date.now()).toISOString(),
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

type PushableSession = { exerciseId: string; exerciseTitle: string; at: number; score: number; stars: number; avgCents: number; stability: number; rhythm: number; durationSec?: number; notes: Record<number, unknown>; notesByMidi?: Record<number, unknown>; intervals?: Record<string, unknown> };

async function pushSessions(sessions: PushableSession[]) {
  const userId = getUserId();
  if (!userId || sessions.length === 0) return;

  await supabase.from('sessions').insert(
    sessions.map((session) => ({
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
    })),
  );
}

const pushSession = (session: PushableSession) => pushSessions([session]);

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

// ── Daily stats (one row per local day, two writers) ───────────────
// Rows are pushed by day key as they change. The progress store writes the
// counters and the learning store the closing mastery — each upsert carries
// only its own columns, so the two never clobber each other.
const UPSERT_CHUNK = 500;
const dirtyDays = new Set<string>();
const dirtyMasteryDays = new Set<string>();

async function upsertDailyStats(rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    await supabase.from('daily_stats').upsert(rows.slice(i, i + UPSERT_CHUNK));
  }
}

async function pushDirtyDays() {
  const userId = getUserId();
  if (!userId || dirtyDays.size === 0) return;
  const { days } = useProgressStore.getState();
  const keys = [...dirtyDays];
  dirtyDays.clear();
  const updatedAt = new Date().toISOString();
  await upsertDailyStats(
    keys.flatMap((day) => {
      const row = days[day];
      return row
        ? [{
            user_id: userId,
            day,
            sessions: row.sessions,
            practice_sec: row.practiceSec,
            perfect_notes: row.perfectNotes,
            graded_notes: row.gradedNotes,
            updated_at: updatedAt,
          }]
        : [];
    }),
  );
}

async function pushDirtyMastery() {
  const userId = getUserId();
  if (!userId || dirtyMasteryDays.size === 0) return;
  const { masteryHistory } = useLearningStore.getState();
  const keys = [...dirtyMasteryDays];
  dirtyMasteryDays.clear();
  const updatedAt = new Date().toISOString();
  await upsertDailyStats(
    keys.flatMap((day) =>
      masteryHistory[day] ? [{ user_id: userId, day, mastery: masteryHistory[day], updated_at: updatedAt }] : [],
    ),
  );
}

/** keys whose row is new or replaced between two snapshots of a day-keyed map */
function changedKeys<T>(next: Record<string, T>, prev: Record<string, T>): string[] {
  return Object.keys(next).filter((k) => next[k] !== prev[k]);
}

/** pull the day history, merge it in, and send back what the server lacks */
async function syncDailyStats(userId: string) {
  const { data } = await supabase
    .from('daily_stats')
    .select('day, sessions, practice_sec, perfect_notes, graded_notes, mastery')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(5000);
  const serverDays: DayHistory = {};
  const serverMastery: MasteryHistory = {};
  for (const row of data ?? []) {
    serverDays[row.day] = {
      day: row.day,
      sessions: row.sessions ?? 0,
      practiceSec: row.practice_sec ?? 0,
      perfectNotes: row.perfect_notes ?? 0,
      gradedNotes: row.graded_notes ?? 0,
    };
    if (row.mastery) serverMastery[row.day] = row.mastery;
  }
  useProgressStore.getState().importDays(serverDays);
  useLearningStore.getState().importMasteryHistory(serverMastery);

  // anything the server is missing or holds a smaller copy of goes back up
  const { days } = useProgressStore.getState();
  for (const [day, row] of Object.entries(days)) {
    const remote = serverDays[day];
    if (!remote || remote.sessions !== row.sessions || remote.practiceSec !== row.practiceSec) dirtyDays.add(day);
  }
  for (const day of Object.keys(useLearningStore.getState().masteryHistory)) {
    if (!serverMastery[day]) dirtyMasteryDays.add(day);
  }
  await pushDirtyDays();
  await pushDirtyMastery();
}

// ── Reconcile with the server ──────────────────────────────────────
// Local MMKV is the source of truth for the UI; the server is a replica. Each
// pull compares both sides per record by timestamp: the newer side wins, and
// when that is the device, it is sent up. That one rule covers edits made
// offline (they were never pushed), a second device, and a fresh sign-in.
const PULL_SESSIONS_LIMIT = 500;
const SESSION_PUSH_CHUNK = 100;
/** longest the first screen waits on the server before showing local data */
const SYNC_GATE_MAX_MS = 6000;

const toMs = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

async function reconcileVocalProfile(userId: string) {
  const { data: vp, error } = await supabase.from('vocal_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) return null; // unreachable or denied: change nothing, and don't mistake it for "no row"
  const local = useProfileStore.getState();
  const serverAt = toMs(vp?.updated_at);

  if (vp && (!local.profile || serverAt > local.updatedAt)) {
    useProfileStore.getState().importProfile({
      maximumRange: { lowMidi: vp.max_low_midi, highMidi: vp.max_high_midi },
      comfortRange:
        vp.comfort_low_midi != null && vp.comfort_high_midi != null
          ? { lowMidi: vp.comfort_low_midi, highMidi: vp.comfort_high_midi }
          : null,
      confidence: vp.confidence,
      detectedAt: vp.detected_at ? toMs(vp.detected_at) : Date.now(),
      temporaryAdjustment: vp.temp_adjustment ?? null,
      autoTranspose: vp.auto_transpose ?? null,
      updatedAt: serverAt,
    });
  } else if (local.profile && (!vp || local.updatedAt > serverAt)) {
    await pushVocalProfile();
  }
  return vp;
}

async function reconcilePreferences(userId: string) {
  const { data: lp, error } = await supabase.from('learning_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) return null;
  const local = usePreferencesStore.getState().preferences;
  const serverAt = toMs(lp?.updated_at);

  if (lp && (!local || serverAt > local.updatedAt)) {
    usePreferencesStore.getState().importPreferences({
      ...(local ?? DEFAULT_PREFERENCES),
      primaryGoal: lp.primary_goal,
      secondaryGoal: lp.secondary_goal,
      dailyMinutes: lp.daily_minutes,
      experience: lp.experience,
      musicReading: lp.music_reading,
      preferredGenres: lp.preferred_genres ?? [],
      coachStyle: lp.coach_style,
      reminderHour: lp.reminder_hour ?? null,
      reminderMinute: lp.reminder_minute ?? 0,
      preferredDifficulty: lp.preferred_difficulty,
      exerciseBalance: lp.exercise_balance ?? 0.5,
      disabledExercises: lp.disabled_exercises ?? [],
      skipRedoWarning: lp.skip_redo_warning ?? false,
      weeklyPlan: lp.weekly_plan ?? undefined,
      updatedAt: serverAt,
    });
  } else if (local && (!lp || local.updatedAt > serverAt)) {
    await pushLearningPreferences();
  }
  return lp;
}

/** merge server sessions in, then send up the local ones the server lacks */
async function syncSessions(userId: string) {
  const { data: serverSessions, error } = await supabase
    .from('sessions')
    .select('exercise_id, exercise_title, score, stars, avg_cents, stability, rhythm, duration_sec, notes, notes_by_midi, intervals, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(PULL_SESSIONS_LIMIT);
  if (error || !serverSessions) return;

  if (serverSessions.length > 0) {
    const records: SessionRecord[] = serverSessions.map((row) => ({
      exerciseId: row.exercise_id,
      exerciseTitle: row.exercise_title ?? '',
      at: toMs(row.created_at),
      score: row.score ?? 0,
      stars: row.stars ?? 0,
      avgCents: row.avg_cents ?? 0,
      stability: row.stability ?? 0,
      rhythm: row.rhythm ?? 0,
      durationSec: row.duration_sec ?? undefined,
      notes: row.notes ?? {},
      notesByMidi: row.notes_by_midi ?? undefined,
      intervals: row.intervals ?? undefined,
    }));
    // already on the server: the session watcher must not send them back
    importing = true;
    try {
      useProgressStore.getState().importSessions(records);
    } finally {
      importing = false;
    }
  }

  // Local sessions the server doesn't have (recorded offline). When the
  // server page was full, older local ones may just be beyond it — skip those.
  const onServer = new Set(serverSessions.map((r) => toMs(r.created_at)));
  const floor = serverSessions.length >= PULL_SESSIONS_LIMIT ? Math.min(...onServer) : 0;
  const missing = useProgressStore.getState().sessions.filter((s) => s.at >= floor && !onServer.has(s.at));
  for (let i = 0; i < missing.length; i += SESSION_PUSH_CHUNK) {
    await pushSessions(missing.slice(i, i + SESSION_PUSH_CHUNK));
  }
}

// ── Pull from server (on sign-in, cold start and reconnect) ────────
let pulling: Promise<void> | null = null;

export function pullFromServer(): Promise<void> {
  // Gate every pull, not just fresh sign-ins, so consumers that care about
  // server data (e.g. the weekly-plan rebuild) also wait on cold starts.
  // Synchronous, before the first await, so effects that run right after
  // the caller's already see it.
  if (!syncReadyResolve) prepareSyncGate();
  // never hold the first screen hostage to a slow or dead connection
  const gateTimer = setTimeout(resolveSyncGate, SYNC_GATE_MAX_MS);

  if (!getUserId() || isOffline()) {
    clearTimeout(gateTimer);
    resolveSyncGate();
    return Promise.resolve();
  }
  if (!pulling) {
    pulling = runPull()
      .catch((e) => {
        if (__DEV__) console.warn('[sync] pull failed', e);
      })
      .finally(() => {
        pulling = null;
      });
  }
  return pulling.finally(() => clearTimeout(gateTimer));
}

async function runPull() {
  const userId = getUserId();
  if (!userId) return;

  try {
    const vp = await reconcileVocalProfile(userId);
    const lp = await reconcilePreferences(userId);

    // If both vocal profile and preferences exist on server, the user
    // has fully completed onboarding — mark it so they skip the flow.
    if (vp && lp) {
      useProfileStore.getState().completeOnboarding();
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

    await syncSessions(userId);
    await syncDailyStats(userId);

    // Total practice time (monotonically increasing: the larger side wins)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('total_practice_sec')
      .eq('id', userId)
      .maybeSingle();

    if (profileRow) {
      const serverTotal = profileRow.total_practice_sec ?? 0;
      const localTotal = useProgressStore.getState().totalPracticeSec;
      if (serverTotal > localTotal) {
        useProgressStore.setState({ totalPracticeSec: serverTotal });
      } else if (localTotal > serverTotal) {
        await pushTotalPractice();
      }
    }

    // Daily plan progress (today's completedSlots): the newer side wins
    const localSession = useLessonSessionStore.getState();
    const todayDayKey = localSession.dayKey;
    if (todayDayKey) {
      const { data: dp, error: dpError } = await supabase
        .from('daily_plans')
        .select('plan_data, updated_at')
        .eq('user_id', userId)
        .eq('day_key', todayDayKey)
        .maybeSingle();

      if (!dpError) {
        const serverUpdatedAt = toMs(dp?.updated_at);
        const localUpdatedAt = localSession.updatedAt ?? 0;
        if (dp?.plan_data && serverUpdatedAt > localUpdatedAt && Array.isArray(dp.plan_data.completedSlots)) {
          // new-device login or another device ahead of this one
          useLessonSessionStore.setState({
            completedSlots: dp.plan_data.completedSlots,
            ...(dp.plan_data.partialProgress ? { partialProgress: dp.plan_data.partialProgress } : {}),
            updatedAt: serverUpdatedAt,
          });
        } else if (!dp?.plan_data || localUpdatedAt > serverUpdatedAt) {
          await pushDailyPlan();
        }
      }
    }

    // Skills and weekly snapshots are replace-style upserts: re-send them so
    // anything written while offline reaches the server.
    await pushSkills();
    await pushWeekSnapshots();
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

  // Watch new sessions: a fresh practice record is prepended to the list
  activeSubs.push(
    useProgressStore.subscribe((state, prev) => {
      if (state.days !== prev.days) {
        changedKeys(state.days, prev.days).forEach((day) => dirtyDays.add(day));
        debounced('daily-stats', pushDirtyDays);
      }
      if (importing || state.sessions === prev.sessions) return;
      const newest = state.sessions[0];
      if (newest && newest.at > (prev.sessions[0]?.at ?? 0)) {
        pushSession(newest);
        debounced('total-practice', pushTotalPractice);
      }
    }),
  );

  // Watch each day's closing mastery
  activeSubs.push(
    useLearningStore.subscribe((state, prev) => {
      if (state.masteryHistory === prev.masteryHistory) return;
      changedKeys(state.masteryHistory, prev.masteryHistory).forEach((day) => dirtyMasteryDays.add(day));
      debounced('daily-mastery', pushDirtyMastery);
    }),
  );

  // Watch daily plan changes (new day, regeneration, step completion, or partial progress)
  let lastDayKey = useLessonSessionStore.getState().dayKey;
  let lastCompletedCount = useLessonSessionStore.getState().completedSlots.length;
  // by reference: the store replaces the object on every write, so a further
  // round saved on the same slot counts as a change too
  let lastPartial = useLessonSessionStore.getState().partialProgress;
  activeSubs.push(
    useLessonSessionStore.subscribe((state) => {
      const dayChanged = state.dayKey != null && state.dayKey !== lastDayKey;
      const slotsChanged = state.completedSlots.length !== lastCompletedCount;
      const partialChanged = state.partialProgress !== lastPartial;
      if (dayChanged || slotsChanged || partialChanged) {
        lastDayKey = state.dayKey;
        lastCompletedCount = state.completedSlots.length;
        lastPartial = state.partialProgress;
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
  dirtyDays.clear();
  dirtyMasteryDays.clear();
}
