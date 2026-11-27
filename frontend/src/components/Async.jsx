import { useEffect, useState, useCallback } from 'react';

// Small data hook: { data, error, loading, reload }
export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, error: '', loading: true });
  const load = useCallback(() => {
    set((s) => ({ ...s, loading: true, error: '' }));
    fn().then((data) => set({ data, error: '', loading: false })).catch((e) => set({ data: null, error: e.message, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
export const Loading = () => <div className="empty">Loading...</div>;
export const ErrorBox = ({ message }) => (message ? <div className="err">{message}</div> : null);
