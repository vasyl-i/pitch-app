import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/features/auth';

/** Navigates to NewPassword when a recovery deep link sets the flag. */
export function PasswordResetRedirect() {
  const pending = useAuthStore((s) => s.pendingPasswordReset);
  const clear = useAuthStore((s) => s.clearPendingPasswordReset);
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!pending) return;
    clear();
    navigation.navigate('NewPassword');
  }, [pending, clear, navigation]);

  return null;
}
