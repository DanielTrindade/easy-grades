import {
  computeCr,
  computeProgress,
  crByTerm,
  forecastGraduation,
  latestTerm,
  type ParseResponse,
} from '@easy-grades/core';
import { useMemo } from 'react';

export function analyze({ curriculum, transcript }: ParseResponse) {
  return {
    cr: computeCr(transcript.entries),
    crHistory: crByTerm(transcript),
    progress: computeProgress(curriculum, transcript),
    forecast: forecastGraduation(curriculum, transcript),
    currentTerm: latestTerm(transcript),
    unknownStatuses: transcript.entries.filter((entry) => entry.status === 'desconhecido'),
  };
}

export type Analysis = ReturnType<typeof analyze>;

export function useAnalysis(data: ParseResponse): Analysis {
  return useMemo(() => analyze(data), [data]);
}
