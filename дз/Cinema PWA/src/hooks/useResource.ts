import { useEffect, useState, useCallback } from 'react';
import { errorMessage } from '../api/pocketbase';

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({ data: null, loading: true, error: '' });
      try {
        const data = await loader(controller.signal);
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: errorMessage(error) });
      }
    }
    void load();
    return () => controller.abort();
  }, [loader, revision]);
  return { ...state, reload };
}
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  return now;
}
