/**
 * Connectivity, as the rest of the app sees it: one store that is `true`
 * while the device is reachable. "Unknown" counts as online — we only ever
 * show offline UI or skip a request when the OS says there is no connection,
 * never on a guess.
 */
import { create } from 'zustand';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkState {
  online: boolean;
}

export const useNetworkStore = create<NetworkState>(() => ({ online: true }));

const isOnline = (s: NetInfoState) => s.isConnected !== false && s.isInternetReachable !== false;

export function isOffline(): boolean {
  return !useNetworkStore.getState().online;
}

/** true while there is no connection */
export function useIsOffline(): boolean {
  return !useNetworkStore((s) => s.online);
}

/** Run `fn` whenever the connection comes back. Returns an unsubscribe. */
export function onReconnect(fn: () => void): () => void {
  return useNetworkStore.subscribe((state, prev) => {
    if (state.online && !prev.online) fn();
  });
}

let stop: (() => void) | null = null;

/** Start listening to the OS connectivity state (idempotent). */
export function startNetworkMonitor(): () => void {
  if (!stop) {
    stop = NetInfo.addEventListener((s) => useNetworkStore.setState({ online: isOnline(s) }));
  }
  return () => {
    stop?.();
    stop = null;
  };
}
