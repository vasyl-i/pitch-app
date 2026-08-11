import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/shared/lib/supabase';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  guest: boolean;
  /** Call once on app mount to hydrate session and subscribe to changes. */
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  guest: false,

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
    await GoogleSignin.hasPlayServices();

    // Generate a nonce: Supabase will sha256-hash the raw nonce and compare
    // it against the nonce claim in the ID token. Google Sign-In SDK embeds
    // the nonce we provide as-is, so we must pass the HASH to Google and
    // the RAW value to Supabase.
    const rawNonce = Crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    // Pass hashed nonce to Google (patched native module reads it)
    const response = await GoogleSignin.signIn(
      { nonce: hashedNonce } as Parameters<typeof GoogleSignin.signIn>[0],
    );

    if (!response.data?.idToken) {
      throw new Error('Google sign-in failed: no ID token returned');
    }

    // Pass raw nonce to Supabase — it will hash it and match against the token
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
      nonce: rawNonce,
    });

    if (error) throw error;
  },

  continueAsGuest: () => {
    set({ guest: true, loading: false });
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google sign-out failure is non-critical
    }
    set({ session: null, user: null, guest: false });
  },
}));
