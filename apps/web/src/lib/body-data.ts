import { useEffect } from 'react';

export type BodyDataKey = 'tabBar' | 'bottomAccessory';

export function useBodyData(key: BodyDataKey, value: string | null): void {
  useEffect(() => {
    if (value === null) return;
    document.body.dataset[key] = value;
    return () => {
      delete document.body.dataset[key];
    };
  }, [key, value]);
}
