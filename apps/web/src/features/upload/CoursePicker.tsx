import { Check, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ListGroup, ListGroupRow } from '@/components/ListGroup';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EcampusCourse } from '@/lib/api';

const MAX_ROWS = 40;

interface CoursePickerProps {
  courses: EcampusCourse[];
  selected: EcampusCourse | null;
  onSelect: (course: EcampusCourse) => void;
  loading?: boolean;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function CoursePicker({ courses, selected, onSelect, loading = false }: CoursePickerProps) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = normalize(deferred.trim());
    if (!needle) return courses;
    return courses.filter(
      (course) => normalize(course.code).includes(needle) || normalize(course.name).includes(needle),
    );
  }, [courses, deferred]);

  const shown = matches.slice(0, MAX_ROWS);

  return (
    <div className="grid gap-3">
      <Label htmlFor="busca-curso" className="sr-only">
        Buscar curso
      </Label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          ref={searchRef}
          id="busca-curso"
          type="search"
          placeholder="Buscar por código ou nome"
          className="pl-10 max-md:h-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={loading}
        />
      </div>

      {loading ? (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Carregando os cursos do e-Campus…
        </p>
      ) : (
        <ListGroup
          heading="Seu curso"
          meta={matches.length > shown.length ? `${shown.length} de ${matches.length}` : `${matches.length}`}
        >
          {shown.length === 0 && (
            <ListGroupRow className="text-sm text-ink-muted">Nenhum curso com esse nome.</ListGroupRow>
          )}
          {shown.map((course) => {
            const isSelected = selected?.id === course.id;
            return (
              <ListGroupRow key={course.id}>
                <button
                  type="button"
                  onClick={() => onSelect(course)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="code-label w-16 shrink-0 text-ink-muted">{course.code}</span>
                  <span className="min-w-0 flex-1 truncate">{course.name}</span>
                  {isSelected && <Check aria-hidden className="size-4 shrink-0 text-pen" />}
                </button>
              </ListGroupRow>
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
