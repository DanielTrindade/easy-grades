import { progressWithPendingAacc, type Curriculum, type Progress, type Transcript } from '@easy-grades/core';
import { useMemo } from 'react';
import { useAaccActivities } from '@/lib/use-aacc-activities';

/** Registered activities on top of the official progress. They never change the official percentage. */
export function usePendingAacc(curriculum: Curriculum, transcript: Transcript, progress: Progress) {
  const aacc = useAaccActivities();
  const pendingHours = aacc.items.reduce((sum, activity) => sum + activity.hours, 0);
  const withPending = useMemo(
    () => progressWithPendingAacc(curriculum, transcript, pendingHours),
    [curriculum, transcript, pendingHours],
  );
  // Same base as `progress`, so the difference is only the registered activities.
  const pendingPercent =
    pendingHours > 0 ? Math.max(0, Number((withPending.percent - progress.percent).toFixed(2))) : 0;
  const category = progress.categories.find((item) => item.key === 'aacc');

  return {
    aacc,
    pendingPercent,
    countedHours: withPending.addedHours,
    officialAacc: { doneHours: category?.doneHours ?? 0, requiredHours: category?.requiredHours ?? 0 },
  };
}
