import { useEffect, useState } from 'react';
import { useProfileStore } from '@/entities/profile';
import { waitForSyncReady } from '@/features/auth';
import type { OnboardingStackParamList } from './types';

/**
 * When the root can pick its first screen, and which. It waits for the
 * profile store to hydrate (Zustand's persist can defer, and choosing early
 * would flash a returning user through onboarding) and for the post-login
 * server pull, which restores whether the user has onboarded. A user who
 * quit mid-onboarding resumes at their step.
 */
export function useRootReady() {
  const [hydrated, setHydrated] = useState(() => useProfileStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    if (useProfileStore.persist.hasHydrated()) return setHydrated(true);
    return useProfileStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    waitForSyncReady().then(() => !cancelled && setSynced(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const step = useProfileStore((s) => s.onboardingStep);
  const onboardingStart: keyof OnboardingStackParamList =
    step === 'goals-complete' ? 'PracticeRhythm' : step === 'range-complete' ? 'Goals' : 'Welcome';

  return { ready: hydrated && synced, onboarded: step === 'complete', onboardingStart };
}
