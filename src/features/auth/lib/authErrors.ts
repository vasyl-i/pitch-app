import { Platform } from 'react-native';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { logError, logMessage, track } from '@/shared/lib/analytics';
import { t } from '@/shared/i18n';

export type AuthProvider = 'google' | 'apple' | 'email';

/**
 * Coarse buckets for sign-in failures — what the user sees and what we filter
 * on in Amplitude (`sign_in_failed.kind`).
 */
export type AuthErrorKind =
  | 'cancelled'
  /** Google: ASWebAuthenticationSession refused to start ("Unable to open Safari") —
   *  usually Safari blocked by Screen Time, or the app wasn't in the foreground. */
  | 'browser_unavailable'
  /** Apple: ASAuthorizationError.unknown — device not signed in to an Apple ID,
   *  or Apple ID changes restricted by Screen Time / MDM. */
  | 'apple_unavailable'
  | 'play_services'
  | 'in_progress'
  | 'network'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'no_token'
  | 'server'
  | 'unknown';

export interface AuthErrorInfo {
  kind: AuthErrorKind;
  code: string | null;
  message: string;
  /** Supabase AuthError name (AuthApiError, AuthRetryableFetchError, ...) when the
   *  provider step succeeded but exchanging the token with our backend failed. */
  backend: string | null;
}

/** Thrown by authStore when the native provider returns without a token. */
export class MissingTokenError extends Error {
  readonly code = 'NO_TOKEN';
}

const NETWORK_RE = /network|offline|internet|timed out|timeout|failed to fetch/i;

export function describeAuthError(e: unknown): AuthErrorInfo {
  const err = (e ?? {}) as { code?: unknown; message?: unknown; name?: unknown; status?: unknown };
  const code = err.code != null ? String(err.code) : null;
  const message = typeof err.message === 'string' ? err.message : String(e);
  const name = typeof err.name === 'string' ? err.name : '';
  const backend = name.startsWith('Auth') ? name : null;

  const info = (kind: AuthErrorKind): AuthErrorInfo => ({ kind, code, message, backend });

  if (e instanceof MissingTokenError) return info('no_token');

  // Supabase (token exchange / email+password)
  if (backend) {
    if (backend === 'AuthRetryableFetchError' || NETWORK_RE.test(message)) return info('network');
    if (code === 'invalid_credentials') return info('invalid_credentials');
    if (code === 'email_not_confirmed') return info('email_not_confirmed');
    return info('server');
  }

  // expo-apple-authentication
  if (code === 'ERR_REQUEST_CANCELED') return info('cancelled');
  if (code === 'ERR_REQUEST_UNKNOWN' || /RequestUnknownException/.test(message)) return info('apple_unavailable');

  // @react-native-google-signin
  if (code === statusCodes.SIGN_IN_CANCELLED) return info('cancelled');
  if (code === statusCodes.IN_PROGRESS) return info('in_progress');
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return info('play_services');
  if (/unable to open safari/i.test(message)) return info('browser_unavailable');

  if (NETWORK_RE.test(message)) return info('network');
  return info('unknown');
}

/** Localized, user-facing text for a failure. Never shows raw native errors. */
export function friendlyAuthErrorMessage(info: AuthErrorInfo): string {
  switch (info.kind) {
    case 'browser_unavailable':
      return t('auth.errors.browserUnavailable');
    case 'apple_unavailable':
      return t('auth.errors.appleUnavailable');
    case 'play_services':
      return t('auth.errors.playServices');
    case 'in_progress':
      return t('auth.errors.inProgress');
    case 'network':
      return t('auth.errors.network');
    case 'invalid_credentials':
      return t('auth.errors.invalidCredentials');
    case 'email_not_confirmed':
      return t('auth.errors.emailNotConfirmed');
    default:
      return t('auth.errors.generic');
  }
}

/** Analytics: sign-in attempt started. */
export function trackSignInAttempt(provider: AuthProvider): void {
  track('sign_in_attempted', { provider, platform: Platform.OS });
  logMessage(`sign_in_attempted provider=${provider}`);
}

/** Analytics: sign-in succeeded (Supabase session established). */
export function trackSignInSuccess(provider: AuthProvider): void {
  track('sign_in_succeeded', { provider, platform: Platform.OS });
}

/**
 * Analytics: sign-in failed. Cancellations are tracked but not reported to
 * Crashlytics; everything else becomes a non-fatal so it shows up in alerts.
 */
export function trackSignInFailure(provider: AuthProvider, info: AuthErrorInfo): void {
  track(info.kind === 'cancelled' ? 'sign_in_cancelled' : 'sign_in_failed', {
    provider,
    platform: Platform.OS,
    kind: info.kind,
    code: info.code,
    backend: info.backend,
    message: info.message.slice(0, 300),
  });
  if (info.kind === 'cancelled' || info.kind === 'invalid_credentials') return;
  const error = new Error(`[sign-in:${provider}:${info.kind}] ${info.message}`);
  error.name = `SignInError_${provider}_${info.kind}`;
  logError(error);
  if (__DEV__) console.warn('[auth] sign-in failed', provider, info);
}

/**
 * Classify + log a sign-in failure. Returns the message to show the user, or
 * null when nothing should be shown (user cancelled).
 */
export function reportSignInError(provider: AuthProvider, e: unknown): string | null {
  const info = describeAuthError(e);
  trackSignInFailure(provider, info);
  return info.kind === 'cancelled' ? null : friendlyAuthErrorMessage(info);
}
