import { Platform } from 'react-native';
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/shared/lib/supabase';
import { mmkv } from '@/shared/lib/storage';
import { useProfileStore } from '@/entities/profile';
import { useProgressStore } from '@/features/progress';
import { useLearningStore, usePreferencesStore, useLessonSessionStore } from '@/features/learning';
import { useInstrumentalStore } from '@/features/instrumental';
import { useSubscriptionStore } from '@/features/subscription';
import { prepareSyncGate } from './syncService';
import { unregisterPushToken } from '@/shared/lib/notifications';
import { logOutRevenueCat } from '@/features/subscription';
import { MissingTokenError } from '../lib/authErrors';

/** the session Supabase persisted (key shape `sb-<ref>-auth-token`), read without any network */
async function readStoredSession(): Promise<Session | null> {
  try {
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey;
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    return parsed?.access_token && parsed.refresh_token && parsed.user ? (parsed as Session) : null;
  } catch {
    return null;
  }
}

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
  useLessonSessionStore.setState({ dayKey: null, planDate: null, steps: [], estMinutes: 0, completedSlots: [], activeSlot: null });
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Returns true if the user's email is already confirmed (instant sign-in). */
  signUpWithEmail: (email: string, name: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  pendingPasswordReset: boolean;
  clearPendingPasswordReset: () => void;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  guest: false,
  pendingPasswordReset: false,
  clearPendingPasswordReset: () => set({ pendingPasswordReset: false }),

  initialize: () => {
    // Detect fresh install: MMKV is cleared on uninstall but iOS Keychain
    // (used by expo-secure-store for Supabase sessions) persists. If no
    // profile data exists in MMKV but a Keychain session is found, sign out
    // to clear the stale session so the user sees the sign-in screen.
    const stored = mmkv.getString('pitch-coach-profile');
    const hasProfile = !!stored && (stored.includes('"hasOnboarded":true') || stored.includes('"onboardingStep":"complete"') || stored.includes('"onboardingStep":"range-complete"') || stored.includes('"onboardingStep":"goals-complete"'));

    // Track whether we cleared a stale session so the auth listener doesn't
    // immediately restore it from the SIGNED_OUT event's null → SIGNED_IN echo.
    let clearedStale = false;
    // Block the onAuthStateChange listener until the initial hydrate settles.
    // Without this, the listener can fire with a stale session before hydrate
    // decides to clear it, causing a login → onboarding → login flash.
    let hydrated = false;

    const hydrate = async () => {
      // Read the persisted session straight from storage. `getSession()` would
      // try to refresh an expired access token first, and offline that retries
      // for ~30s (and then reports "no session"), holding the whole app on a
      // blank screen. Supabase's own auto-refresh renews the token in the
      // background, and `onAuthStateChange` reports it if it is rejected.
      const session = await readStoredSession();
      if (session && !hasProfile) {
        // Stale Keychain session from a previous install — clear it
        clearedStale = true;
        await supabase.auth.signOut();
        hydrated = true;
        set({ session: null, user: null, loading: false });
        return;
      }
      hydrated = true;
      // Returning user with MMKV data — no need to gate on server pull.
      // The gate is only needed for fresh sign-ins (MMKV cleared by signOut).
      set({ session, user: session?.user ?? null, loading: false });
    };

    hydrate();

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore events until the initial hydrate has settled
      if (!hydrated) return;
      // A null session is only real on an explicit sign-out. Supabase can also
      // report null at startup when it could not refresh (offline); the stored
      // session is still valid, so keep the user signed in.
      if (!session && event !== 'SIGNED_OUT') return;
      // After clearing a stale session, ignore the SIGNED_OUT echo
      if (clearedStale && !session) return;
      clearedStale = false;
      // Only gate on fresh sign-in (no current user → new user), not token refreshes
      const currentUser = useAuthStore.getState().user;
      if (session?.user && !currentUser) prepareSyncGate();
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    await GoogleSignin.hasPlayServices();

    if (Platform.OS === 'android') {
      // Android Google Sign-In SDK does not support embedding a nonce in the
      // ID token, so we skip nonce verification on Android.
      const response = await GoogleSignin.signIn();

      if (!response.data?.idToken) {
        throw new MissingTokenError('Google sign-in returned no ID token');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken,
      });

      if (error) throw error;
      return;
    }

    // iOS: Generate a nonce for extra security. Supabase will sha256-hash the
    // raw nonce and compare it against the nonce claim in the ID token. Google
    // Sign-In SDK embeds the nonce we provide as-is, so we must pass the HASH
    // to Google and the RAW value to Supabase.
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
      throw new MissingTokenError('Google sign-in returned no ID token');
    }

    if (__DEV__) {
      // TEMP diagnostic for "Nonces mismatch": compare the nonce Google embedded with the one we sent
      try {
        const payload = response.data.idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(globalThis.atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
        console.log('[google-nonce]', { sent: hashedNonce, inToken: claims.nonce ?? null, iat: claims.iat });
      } catch (e) {
        console.log('[google-nonce] could not decode id token', e);
      }
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
      throw new MissingTokenError('Apple sign-in returned no identity token');
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

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUpWithEmail: async (email, name, password) => {
    const redirectTo = 'https://pitchgym.anyabedrytska.com/auth/callback.html';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
    // If the session exists, the user was auto-confirmed (no email verification needed)
    return !!data.session;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://pitchgym.anyabedrytska.com/auth/callback.html',
    });
    if (error) throw error;
  },

  continueAsGuest: () => {
    set({ guest: true, loading: false });
  },

  signOut: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (userId) await unregisterPushToken(userId);
    await logOutRevenueCat().catch(() => {});
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
    const userId = useAuthStore.getState().user?.id;
    console.log('22222', userId)
    if (userId) await unregisterPushToken(userId);
    const { error } = await supabase.rpc('delete_own_account');
    console.log('error', error);
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
