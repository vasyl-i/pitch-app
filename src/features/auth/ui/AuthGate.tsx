import { useEffect, type ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/shared/theme';
import { useAuthStore } from '../model/authStore';

interface AuthGateProps {
  /** Shown when user is not signed in */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Wraps the app tree. Renders children when authenticated,
 * fallback (sign-in screen) when not.
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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.palette.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.palette.accent} />
      </View>
    );
  }

  return <>{session || guest ? children : fallback}</>;
}
