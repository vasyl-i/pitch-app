import { Platform } from 'react-native';
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/shared/lib/supabase';
import { mmkv } from '@/shared/lib/storage';
import { useProfileStore } from '@/entities/profile';
import { useProgressStore } from '@/features/progress';
import { useLearningStore, usePreferencesStore, useLessonSessionStore } from '@/features/learning';
import { useInstrumentalStore } from '@/features/instrumental';
import { useSubscriptionStore } from '@/features/subscription';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

/** Wipe all user-scoped persisted stores (progress, profile, learning, etc.) —
 *  both the MMKV-persisted data and the in-memory Zustand state so navigation
 *  immediately reflects a fresh-install experience. */
function clearUserStores() {
  useProfileStore.getState().clearProfile();
  useProfileStore.persist.clearStorage();
  useProgressStore.getState().clear();
  useProgressStore.persist.clearStorage();
  useLearningStore.getState().clearLearningData();
  useLearningStore.persist.clearStorage();
  usePreferencesStore.getState().clearPreferences();
  usePreferencesStore.persist.clearStorage();
  useLessonSessionStore.setState({ dayKey: null, steps: [], estMinutes: 0, completedSlots: [], activeSlot: null });
  useLessonSessionStore.persist.clearStorage();
  useInstrumentalStore.setState({ tracks: [] });
  useInstrumentalStore.persist.clearStorage();
  useSubscriptionStore.getState().reset();
  useSubscriptionStore.persist.clearStorage();
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  guest: boolean;
  /** Call once on app mount to hydrate session and subscribe to changes. */
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  guest: false,

  initialize: () => {
    // Detect fresh install: MMKV is cleared on uninstall but iOS Keychain
    // (used by expo-secure-store for Supabase sessions) persists. If no
    // profile data exists in MMKV but a Keychain session is found, sign out
    // to clear the stale session so the user sees the sign-in screen.
    const stored = mmkv.getString('pitch-coach-profile');
    const hasProfile = !!stored && stored.includes('"hasOnboarded":true');

    // Track whether we cleared a stale session so the auth listener doesn't
    // immediately restore it from the SIGNED_OUT event's null → SIGNED_IN echo.
    let clearedStale = false;

    const hydrate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !hasProfile) {
        // Stale Keychain session from a previous install — clear it
        clearedStale = true;
        await supabase.auth.signOut();
        set({ session: null, user: null, loading: false });
        return;
      }
      set({ session, user: session?.user ?? null, loading: false });
    };

    hydrate();

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // After clearing a stale session, ignore the SIGNED_OUT echo
      if (clearedStale && !session) return;
      clearedStale = false;
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

  signInWithApple: async () => {
    const rawNonce = Crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in failed: no identity token returned');
    }

    // Apple only provides the name on the very first sign-in — capture it now.
    const givenName = credential.fullName?.givenName;
    const familyName = credential.fullName?.familyName;
    const fullName = [givenName, familyName].filter(Boolean).join(' ') || undefined;

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) throw error;

    // Persist the name in user_metadata so it survives across sessions.
    if (fullName) {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }
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
    clearUserStores();
    set({ session: null, user: null, guest: false });
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
    // Auth row is gone server-side; clear local state
    try {
      await GoogleSignin.signOut();
    } catch {
      // non-critical
    }
    clearUserStores();
    set({ session: null, user: null, guest: false });
  },
}));
