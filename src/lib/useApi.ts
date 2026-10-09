'use client';

import { useEffect, useState } from 'react';

interface ApiState<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/** Fetches JSON from our API. `url = null` disables the request. */
export function useApi<T>(url: string | null): { data: T | null; error: string | null; loading: boolean } {
  const [state, setState] = useState<ApiState<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async res => {
        const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
        if (!res.ok || json.success === false) throw new Error(json.error || `HTTP ${res.status}`);
        setState({ key: url, data: json as T, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key: url, data: null, error: err instanceof Error ? err.message : 'Ошибка сети' });
      });
    return () => controller.abort();
  }, [url]);

  const fresh = state.key === url;
  return { data: fresh ? state.data : null, error: fresh ? state.error : null, loading: Boolean(url) && !fresh };
}
