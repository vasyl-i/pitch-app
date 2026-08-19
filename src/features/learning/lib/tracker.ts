/**
 * The bridge from practice to learning: watches the progress store's session
 * history and folds anything new into the learning profile. Because the hook
 * point is the persisted SessionRecord stream — which every practice mode
 * already writes through `features/progress` — no exercise engine needs to
 * know the learning platform exists, and future modes participate for free.
 */
import { useProgressStore } from '@/features/progress';
import { useLearningStore } from '../model/learningStore';
import { usePreferencesStore } from '../model/preferencesStore';

let started = false;

function ingestNewSessions() {
  const learning = useLearningStore.getState();
  learning.ensureWeek(usePreferencesStore.getState().preferences);
  const fresh = useProgressStore
    .getState()
    .sessions.filter((s) => s.at > learning.lastIngestedAt)
    .map((s) => ({
      exerciseId: s.exerciseId,
      at: s.at,
      score: s.score,
      stability: s.stability,
      rhythm: s.rhythm,
      avgCents: s.avgCents,
      durationSec: s.durationSec,
    }));
  if (fresh.length > 0) useLearningStore.getState().ingest(fresh);
}

function whenBothHydrated(run: () => void) {
  let remaining = 2;
  const arrive = () => {
    remaining -= 1;
    if (remaining === 0) run();
  };
  for (const store of [useProgressStore, useLearningStore] as const) {
    if (store.persist.hasHydrated()) arrive();
    else store.persist.onFinishHydration(arrive);
  }
}

/** idempotent; call once at app start */
export function startLearningTracker() {
  if (started) return;
  started = true;
  whenBothHydrated(() => {
    ingestNewSessions();
    useProgressStore.subscribe((state, prev) => {
      if (state.sessions !== prev.sessions) ingestNewSessions();
    });
  });
}
