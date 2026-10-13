import { FileText } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { validatePdf } from './validate-pdf';

interface DropzoneProps {
  id: string;
  label: string;
  documentName: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export function Dropzone({ id, label, documentName, file, onFile, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validatePdf(candidate);
    setError(problem);
    onFile(problem ? null : candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files[0]);
  }

  const errorId = `${id}-erro`;
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        data-dragging={dragging || undefined}
        data-filled={file ? true : undefined}
        className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-dashed border-input bg-card p-5 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-[dragging]:border-esmeralda data-[dragging]:bg-accent data-[filled]:border-solid data-[filled]:border-esmeralda"
      >
        <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-texto" />
        <span className="grid gap-1">
          <span className="font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">
            {file ? file.name : `Arraste o PDF "${documentName}" para cá ou clique para escolher.`}
          </span>
        </span>
        <input
          id={id}
          name={id}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            accept(event.target.files?.[0]);
            // Clear the value so picking the same file again (after an error, say) still fires onChange.
            event.target.value = '';
          }}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-erro">
          {error}
        </p>
      )}
    </div>
  );
}
