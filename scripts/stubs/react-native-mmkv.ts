/**
 * Test stub for react-native-mmkv — in-memory Map that satisfies the MMKV interface.
 */
const store = new Map<string, string | number | boolean | ArrayBuffer>();

const mmkvInstance = {
  id: 'default',
  get length() { return store.size; },
  get size() { return 0; },
  get byteSize() { return 0; },
  isReadOnly: false,
  isEncrypted: false,
  set(key: string, value: boolean | string | number | ArrayBuffer) { store.set(key, value); },
  getBoolean(key: string) { const v = store.get(key); return typeof v === 'boolean' ? v : undefined; },
  getString(key: string) { const v = store.get(key); return typeof v === 'string' ? v : undefined; },
  getNumber(key: string) { const v = store.get(key); return typeof v === 'number' ? v : undefined; },
  getBuffer(key: string) { const v = store.get(key); return v instanceof ArrayBuffer ? v : undefined; },
  contains(key: string) { return store.has(key); },
  remove(key: string) { return store.delete(key); },
  getAllKeys() { return [...store.keys()]; },
  clearAll() { store.clear(); },
  recrypt() {},
  encrypt() {},
  decrypt() {},
  trim() {},
  checkContentChanged() {},
  addOnValueChangedListener() { return { remove() {} }; },
  importAllFrom() { return 0; },
};

export function createMMKV() { return mmkvInstance; }
export function existsMMKV() { return false; }
export function deleteMMKV() { return false; }
export function useMMKV() { return mmkvInstance; }
export function useMMKVBoolean() { return [undefined, () => {}]; }
export function useMMKVBuffer() { return [undefined, () => {}]; }
export function useMMKVNumber() { return [undefined, () => {}]; }
export function useMMKVObject() { return [undefined, () => {}]; }
export function useMMKVString() { return [undefined, () => {}]; }
export function useMMKVListener() {}
export function useMMKVKeys() { return []; }
