import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Season } from '../types';

/** Fetch seasons, deduplicated by name (keeps most recent) */
export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured.');
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const { data, error: e } = await supabase
          .from('seasons')
          .select('*')
          .order('created_at', { ascending: false });
        if (e) throw e;
        // Dedupe by name - keep most recent
        const seen = new Set<string>();
        const deduped = (data || []).filter((s) => {
          if (seen.has(s.name)) return false;
          seen.add(s.name);
          return true;
        });
        setSeasons(deduped);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { seasons, loading, error };
}
