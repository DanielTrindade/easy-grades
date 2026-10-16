import { Minus, Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatGradeInput, parseGradeInput, stepGrade } from './grade-input';

interface GradeInputProps {
  id: string;
  /** Used in the accessible names: "Nota esperada em <disciplina>". */
  courseName: string;
  value: number;
  onChange: (grade: number) => void;
}

/**
 * Expected grade as a compact stepper: − | value | +. It is 34 px tall from md up, but 44 px on any touch screen
 * (`pointer-coarse`), so a tablet keeps the 44 px targets too. A decimal text field (accepts a comma) sits in the middle.
 * While the field has focus it holds the student's text; the grade is committed on blur or Enter, and invalid text reverts.
 */
export function GradeInput({ id, courseName, value, onChange }: GradeInputProps) {
  // null = not editing, so the field shows the grade from props.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatGradeInput(value);

  function commit(text: string) {
    const parsed = parseGradeInput(text);
    if (parsed !== null) onChange(parsed);
    setDraft(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      commit(event.currentTarget.value);
    } else if (event.key === 'Escape') {
      setDraft(null);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const base = parseGradeInput(shown) ?? value;
      onChange(stepGrade(base, event.key === 'ArrowUp' ? 0.1 : -0.1));
      setDraft(null);
    }
  }

  return (
    <div className="inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-lg border border-field focus-within:ring-3 focus-within:ring-ring/50 md:h-[34px] md:pointer-coarse:h-11">
      <Button
        type="button"
        variant="ghost"
        className="h-full w-11 rounded-none px-0 text-ink-muted md:w-8 md:pointer-coarse:w-11"
        aria-label={`Diminuir nota em ${courseName}`}
        onClick={() => onChange(stepGrade(value, -0.1))}
      >
        <Minus aria-hidden />
      </Button>
      <Input
        id={id}
        inputMode="decimal"
        aria-label={`Nota esperada em ${courseName}`}
        value={shown}
        onFocus={() => setDraft(formatGradeInput(value))}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={onKeyDown}
        className="h-full w-12 rounded-none border-x border-y-0 border-hairline bg-transparent px-1 text-center text-base tabular-nums shadow-none focus-visible:ring-0 md:w-11 md:text-sm md:pointer-coarse:w-12 dark:bg-transparent"
      />
      <Button
        type="button"
        variant="ghost"
        className="h-full w-11 rounded-none px-0 text-ink-muted md:w-8 md:pointer-coarse:w-11"
        aria-label={`Aumentar nota em ${courseName}`}
        onClick={() => onChange(stepGrade(value, 0.1))}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
