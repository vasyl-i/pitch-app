/**
 * MMKV-backed storage for Zustand's persist middleware.
 *
 * MMKV is synchronous and roughly 30x faster than AsyncStorage for small
 * key-value reads, which eliminates the hydration delay that previously
 * required a splash-screen wait.
 */
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const mmkv = createMMKV();

export const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => { mmkv.remove(name); },
};
