/**
 * Write-through sync: subscribes to Zustand store changes and pushes
 * them to Supabase when the user is authenticated.
 *
 * Strategy (prototype):
 *   - On store change → upsert to Supabase (debounced)
 *   - On sign-in → pull from Supabase, merge (server wins)
 *   - Local AsyncStorage remains the primary store for offline use
 */
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from './authStore';
import { useProfileStore } from '@/entities/profile';
import { useProgressStore } from '@/features/progress';
import { useLearningStore, usePreferencesStore, type SkillId } from '@/features/learning';

type Unsubscribe = () => void;

let activeSubs: Unsubscribe[] = [];

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

// ── Pull from server (on sign-in) ──────────────────────────────────
export async function pullFromServer() {
  const userId = getUserId();
  if (!userId) return;

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
    });
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
}

export function stopSync() {
  activeSubs.forEach((unsub) => unsub());
  activeSubs = [];
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
}
