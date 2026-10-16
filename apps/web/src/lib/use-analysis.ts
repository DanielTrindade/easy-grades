import {
  attemptInsights,
  computeCr,
  computeProgress,
  crByTerm,
  crProjectionInsights,
  delayInsights,
  forecastGraduation,
  gradeInsights,
  inProgressInsights,
  latestTerm,
  milestoneInsights,
  paceInsights,
  pendingInsights,
  performanceInsights,
  streakInsights,
  timelineInsights,
  type ParseResponse,
} from '@easy-grades/core';
import { useMemo } from 'react';

export function analyze({ curriculum, transcript }: ParseResponse) {
  const forecast = forecastGraduation(curriculum, transcript);
  return {
    cr: computeCr(transcript.entries),
    crHistory: crByTerm(transcript),
    progress: computeProgress(curriculum, transcript),
    forecast,
    pace: paceInsights(curriculum, transcript),
    performance: performanceInsights(curriculum, transcript),
    currentTerm: latestTerm(transcript),
    unknownStatuses: transcript.entries.filter((entry) => entry.status === 'desconhecido'),
    timeline: timelineInsights(curriculum, transcript, forecast),
    milestone: milestoneInsights(curriculum, transcript),
    inProgress: inProgressInsights(curriculum, transcript),
    pending: pendingInsights(curriculum, transcript),
    projection: crProjectionInsights(curriculum, transcript),
    delay: delayInsights(curriculum, transcript),
    attempts: attemptInsights(transcript),
    streak: streakInsights(transcript),
    grades: gradeInsights(transcript),
  };
}

export type Analysis = ReturnType<typeof analyze>;

export function useAnalysis(data: ParseResponse): Analysis {
  return useMemo(() => analyze(data), [data]);
}
