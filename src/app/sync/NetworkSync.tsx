import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { t } from '@/shared/i18n';
import { startNetworkMonitor, useNetworkStore } from '@/shared/lib/network';

/** Watches connectivity and tells the user once each time they drop offline. */
export function NetworkSync() {
  useEffect(() => {
    const stop = startNetworkMonitor();
    const warn = () =>
      Toast.show({
        type: 'info',
        text1: t('common.offlineToastTitle'),
        text2: t('common.offlineToastMessage'),
        visibilityTime: 4000,
      });
    if (!useNetworkStore.getState().online) warn();
    const unsub = useNetworkStore.subscribe((state, prev) => {
      if (!state.online && prev.online) warn();
    });
    return () => {
      unsub();
      stop();
    };
  }, []);
  return null;
}
