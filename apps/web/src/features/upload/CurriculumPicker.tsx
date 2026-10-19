import { ChipGroup } from '@/components/ChipGroup';
import type { EcampusCourse, EcampusVersion } from '@/lib/api';
import { CoursePicker } from './CoursePicker';

interface CurriculumPickerProps {
  courses: EcampusCourse[];
  course: EcampusCourse | null;
  onCourse: (course: EcampusCourse) => void;
  versions: EcampusVersion[];
  version: EcampusVersion | null;
  onVersion: (version: EcampusVersion | null) => void;
  loading: boolean;
}

/** The course and the version of its matrix, both published by the e-Campus. */
export function CurriculumPicker({
  courses,
  course,
  onCourse,
  versions,
  version,
  onVersion,
  loading,
}: CurriculumPickerProps) {
  return (
    <>
      <CoursePicker courses={courses} selected={course} onSelect={onCourse} loading={loading} />
      {course && (
        <div className="grid gap-2">
          <p className="text-footnote font-semibold text-ink">Versão do currículo</p>
          <ChipGroup
            label="Versão do currículo"
            items={versions.map((item) => ({
              value: String(item.id),
              content: item.situation ? `${item.version} · ${item.situation}` : item.version,
            }))}
            value={version ? String(version.id) : ''}
            onValueChange={(value) => onVersion(versions.find((item) => String(item.id) === value) ?? null)}
          />
        </div>
      )}
    </>
  );
}
