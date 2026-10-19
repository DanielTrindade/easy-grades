import { ERROR_MESSAGES } from '@easy-grades/core';
import { useEffect, useState } from 'react';
import { ApiError, fetchCourseVersions, type EcampusCourse, type EcampusVersion } from '@/lib/api';

interface CourseVersions {
  versions: EcampusVersion[];
  version: EcampusVersion | null;
  setVersion: (version: EcampusVersion | null) => void;
  error: string | null;
}

/** The versions of the course the student picked, with the newest one already chosen. */
export function useCourseVersions(course: EcampusCourse | null): CourseVersions {
  const [versions, setVersions] = useState<EcampusVersion[]>([]);
  const [version, setVersion] = useState<EcampusVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) {
      setVersions([]);
      setVersion(null);
      return;
    }
    let cancelled = false;
    setVersion(null);
    fetchCourseVersions(course.id)
      .then((list) => {
        if (cancelled) return;
        setVersions(list);
        setVersion(list[0] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : ERROR_MESSAGES.INTERNAL);
      });
    return () => {
      cancelled = true;
    };
  }, [course]);

  return { versions, version, setVersion, error };
}
