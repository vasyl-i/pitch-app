import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/shared/lib/supabase';

const POLL_INTERVAL = 4000;

/**
 * Waits for the sign-up confirmation link to be tapped by retrying the
 * sign-in — every few seconds and whenever the app comes back to the
 * foreground (the user went to their mail app). The first success signs the
 * user in; AuthGate's auth listener takes it from there.
 */
export function useConfirmationPolling(email: string, password: string) {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const trySignIn = async () => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && active) clearInterval(timer);
      } catch {
        // not confirmed yet
      }
    };

    const sub = AppState.addEventListener('change', (state) => state === 'active' && trySignIn());
    timer = setInterval(trySignIn, POLL_INTERVAL);
    return () => {
      active = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [email, password]);
}
