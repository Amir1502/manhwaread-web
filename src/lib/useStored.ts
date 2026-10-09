'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { STORAGE_EVENT } from './storage';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(STORAGE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(STORAGE_EVENT, cb);
  };
}

/**
 * Reads a value derived from localStorage and re-renders when it changes (this tab or others).
 * SSR-safe: returns `serverValue` during hydration.
 */
export function useStored<T>(getter: () => T, serverValue: T): T {
  const cache = useRef<{ json: string; value: T } | null>(null);
  const getSnapshot = useCallback(() => {
    const value = getter();
    const json = JSON.stringify(value);
    if (cache.current && cache.current.json === json) return cache.current.value;
    cache.current = { json, value };
    return value;
  }, [getter]);
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}
