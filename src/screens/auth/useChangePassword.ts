import { useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '@/shared/lib/supabase';
import { t } from '@/shared/i18n';

/**
 * The new-password form: the fields, whether they're valid (6+ characters,
 * matching, and the current password when changing rather than setting), and
 * submitting — which first re-checks the current password, then updates.
 */
export function useChangePassword(requireOldPassword: boolean, onDone: () => void) {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= 6 && password === confirm && (!requireOldPassword || oldPassword.length > 0);

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    try {
      if (requireOldPassword) {
        const email = (await supabase.auth.getUser()).data.user?.email;
        if (!email) throw new Error(t('auth.newPassword.noEmail'));
        const { error } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
        if (error) throw new Error(t('auth.newPassword.wrongCurrent'));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Toast.show({ type: 'success', text1: t('auth.newPassword.updated'), text2: t('auth.newPassword.updatedBody') });
      onDone();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: t('auth.newPassword.failed'), text2: e instanceof Error ? e.message : t('common.somethingWentWrong') });
    } finally {
      setLoading(false);
    }
  };

  return { oldPassword, setOldPassword, password, setPassword, confirm, setConfirm, loading, valid, tooShort, mismatch, submit };
}
