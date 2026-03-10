import { createMMKV } from 'react-native-mmkv';

export const appStorage = createMMKV({
  id: 'filters-megapack-storage',
});

export function readJSON<T>(key: string, fallback: T): T {
  const raw = appStorage.getString(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  appStorage.set(key, JSON.stringify(value));
}
