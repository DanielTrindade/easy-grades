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
 * Expected grade: a decimal text field (accepts a comma) with 44 px step buttons.
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
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="size-11 shrink-0"
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
        className="h-11 w-20 text-center text-base tabular-nums md:h-8 md:text-sm"
      />
      <Button
        type="button"
        variant="outline"
        className="size-11 shrink-0"
        aria-label={`Aumentar nota em ${courseName}`}
        onClick={() => onChange(stepGrade(value, 0.1))}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
