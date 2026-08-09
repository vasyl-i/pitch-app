import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Call once on app mount to hydrate session and subscribe to changes. */
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  initialize: () => {
    // Hydrate from stored session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'app.anya.eargym://auth/callback',
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null, user: null });
  },
}));
