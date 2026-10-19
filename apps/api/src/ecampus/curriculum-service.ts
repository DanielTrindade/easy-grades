import type { Curriculum } from '@easy-grades/core';
import { parseCurriculumDocument } from '../parsers/documents';
import { ecampusClient, type EcampusCourse, type EcampusVersion } from './client';

/** How long a cached answer stays good. The e-Campus changes matrices between semesters, not between hours. */
const COURSES_TTL_MS = 12 * 60 * 60 * 1000;
const VERSIONS_TTL_MS = 12 * 60 * 60 * 1000;
const CURRICULUM_TTL_MS = 6 * 60 * 60 * 1000;
const CURRICULUM_CACHE_SIZE = 40;

/** The part of the e-Campus the app reads. Swapped for a fake in tests. */
export interface EcampusReader {
  listCourses(): Promise<EcampusCourse[]>;
  listVersions(courseId: number): Promise<EcampusVersion[]>;
  fetchCurriculumPdf(courseId: number, versionId: number): Promise<Uint8Array>;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Keeps the newest entries and forgets the rest, so a long-running instance cannot grow without bound. */
class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}

export class CurriculumService {
  private readonly coursesCache = new TtlCache<EcampusCourse[]>(COURSES_TTL_MS, 1);
  private readonly versionsCache = new TtlCache<EcampusVersion[]>(VERSIONS_TTL_MS, 400);
  private readonly curriculumCache = new TtlCache<Curriculum>(CURRICULUM_TTL_MS, CURRICULUM_CACHE_SIZE);

  constructor(
    private readonly client: EcampusReader = ecampusClient,
  ) {}

  async listCourses(): Promise<EcampusCourse[]> {
    const cached = this.coursesCache.get('all');
    if (cached) return cached;
    const courses = await this.client.listCourses();
    this.coursesCache.set('all', courses);
    return courses;
  }

  async listVersions(courseId: number): Promise<EcampusVersion[]> {
    const key = String(courseId);
    const cached = this.versionsCache.get(key);
    if (cached) return cached;
    const versions = await this.client.listVersions(courseId);
    this.versionsCache.set(key, versions);
    return versions;
  }

  /** The curriculum of one course version, parsed and ready to use. */
  async getCurriculum(courseId: number, versionId: number): Promise<Curriculum> {
    const key = `${courseId}:${versionId}`;
    const cached = this.curriculumCache.get(key);
    if (cached) return cached;
    const pdf = await this.client.fetchCurriculumPdf(courseId, versionId);
    // The matrix is a small, public document: reading it here costs a few hundred milliseconds and saves a
    // worker start, which is far more expensive than the read itself.
    const curriculum = await parseCurriculumDocument(pdf);
    this.curriculumCache.set(key, curriculum);
    return curriculum;
  }

  clearCaches(): void {
    this.coursesCache.clear();
    this.versionsCache.clear();
    this.curriculumCache.clear();
  }
}
