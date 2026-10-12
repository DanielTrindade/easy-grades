import { useEffect, useState } from 'react';
import {
  AACC_MAX_ITEMS,
  loadAaccActivities,
  saveAaccActivities,
  type AaccActivity,
  type AaccInput,
} from './aacc-storage';

/** Registered complementary activities, kept in this browser only. */
export function useAaccActivities() {
  const [items, setItems] = useState<AaccActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadAaccActivities().then((loaded) => {
      if (cancelled) return;
      setItems(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function commit(next: AaccActivity[]) {
    setItems(next);
    void saveAaccActivities(next);
  }

  function add(input: AaccInput) {
    // Before the first load, saving would overwrite what is stored.
    if (loading || items.length >= AACC_MAX_ITEMS) return;
    commit([...items, { id: crypto.randomUUID(), ...input }]);
  }

  function remove(id: string) {
    commit(items.filter((item) => item.id !== id));
  }

  return { items, add, remove, loading };
}
