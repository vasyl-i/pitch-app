/**
 * Analytics & crash reporting — thin wrappers so the rest of the app never
 * imports Amplitude or Crashlytics directly.
 *
 * Initialised once at app start. Events are fire-and-forget; a broken
 * analytics call must never crash the app.
 *
 * Key metrics covered:
 * - New users / active users: automatic via Amplitude user identification
 * - Time spent in app: tracked via app_foregrounded / app_backgrounded events
 * - User properties: subscription tier, onboarding status, platform
 */
import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as amplitude from '@amplitude/analytics-react-native';
import { SessionReplayPlugin } from '@amplitude/plugin-session-replay-react-native';
import { setMonetizationSink } from '@/features/subscription/lib/analytics';

const API_KEY = '18679ad187e9ca5839b5934eea0b5feb';

let initialised = false;
let sessionStartMs = 0;

/** Lazy-load crashlytics — returns null if native module isn't available. */
function getCrashlytics() {
  try {
    return require('@react-native-firebase/crashlytics').default();
  } catch {
    return null;
  }
}

/** Call once at app start, before any tracking. */
export function initAnalytics(): void {
  if (initialised) return;
  initialised = true;

  try {
    amplitude.init(API_KEY, undefined, {
      flushIntervalMillis: 15_000,
      flushQueueSize: 30,
      trackingOptions: {
        ipAddress: false,
      },
    });

    const sessionReplay = new SessionReplayPlugin({
      sampleRate: 0.1,
      privacyConfig: {
        maskLevel: 'medium',
      },
    });
    amplitude.add(sessionReplay);
  } catch {
    // Amplitude init failed — continue without it
  }

  // Enable Crashlytics
  getCrashlytics()?.setCrashlyticsCollectionEnabled(true);

  // Wire existing monetization events into Amplitude
  setMonetizationSink((event) => {
    try {
      const { type, ...props } = event;
      amplitude.track(type, props);
    } catch {
      // best-effort
    }
  });

  // Track app open
  sessionStartMs = Date.now();
  try {
    amplitude.track('app_opened', { platform: Platform.OS });
  } catch {
    // best-effort
  }

  // Track foreground/background for session duration
  AppState.addEventListener('change', handleAppStateChange);
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (!initialised) return;
  try {
    if (nextState === 'active') {
      sessionStartMs = Date.now();
      amplitude.track('app_foregrounded');
    } else if (nextState === 'background' && sessionStartMs > 0) {
      const durationSec = Math.round((Date.now() - sessionStartMs) / 1000);
      amplitude.track('app_backgrounded', { session_duration_sec: durationSec });
      sessionStartMs = 0;
    }
  } catch {
    // best-effort
  }
}

/** Associate events with an authenticated user. */
export function identifyUser(userId: string, properties?: Record<string, string | number | boolean>): void {
  if (!initialised) return;
  try {
    amplitude.setUserId(userId);
    if (properties) {
      const identifyObj = new amplitude.Identify();
      for (const [key, value] of Object.entries(properties)) {
        identifyObj.set(key, value);
      }
      amplitude.identify(identifyObj);
    }
  } catch {
    // best-effort
  }
  getCrashlytics()?.setUserId(userId);
}

/**
 * Update user properties (call when subscription or onboarding state changes).
 * These appear as filterable user attributes in Amplitude.
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (!initialised) return;
  try {
    const identifyObj = new amplitude.Identify();
    for (const [key, value] of Object.entries(properties)) {
      identifyObj.set(key, value);
    }
    amplitude.identify(identifyObj);
  } catch {
    // best-effort
  }
}

/** Clear user identity on sign-out. */
export function resetAnalyticsUser(): void {
  if (!initialised) return;
  try {
    amplitude.reset();
  } catch {
    // best-effort
  }
}

/** Log a non-fatal error to Crashlytics. */
export function logError(error: Error): void {
  getCrashlytics()?.recordError(error);
}

/** Log a breadcrumb message to Crashlytics for context in crash reports. */
export function logMessage(message: string): void {
  getCrashlytics()?.log(message);
}

/** Track a named event with optional properties. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>): void {
  if (!initialised) return;
  try {
    amplitude.track(event, properties ?? undefined);
  } catch {
    // best-effort
  }
}
