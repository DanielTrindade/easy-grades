import { ERROR_MESSAGES } from '@easy-grades/core';
import { useEffect, useState } from 'react';
import { ApiError, fetchCourses, type EcampusCourse } from '@/lib/api';

/** The courses the e-Campus publishes, loaded once when the screen opens. */
export function useCourses(): { courses: EcampusCourse[]; loading: boolean; error: string | null } {
  const [courses, setCourses] = useState<EcampusCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCourses()
      .then((list) => {
        if (!cancelled) setCourses(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : ERROR_MESSAGES.INTERNAL);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { courses, loading, error };
}
