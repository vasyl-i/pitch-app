import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../model/authStore';

interface AuthGateProps {
  /** Shown when user is not signed in */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Wraps the app tree. Renders children when authenticated,
 * fallback (sign-in screen) when not.
 *
 * While auth is loading the native splash screen stays visible (held by
 * App.tsx), so no spinner is needed here.
 */
export function AuthGate({ fallback, children }: AuthGateProps) {
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const guest = useAuthStore((s) => s.guest);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  if (loading) return null;

  return <>{session || guest ? children : fallback}</>;
}
