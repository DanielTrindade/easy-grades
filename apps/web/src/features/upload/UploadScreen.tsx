import { ERROR_MESSAGES, type ParseResponse } from '@easy-grades/core';
import { useState, type FormEvent } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { ApiError, uploadDocuments, uploadTranscript, type EcampusCourse } from '@/lib/api';
import { useOnline } from '@/lib/use-online';
import { CurriculumPicker } from './CurriculumPicker';
import { Dropzone } from './Dropzone';
import { UploadActions } from './UploadActions';
import { useCourseVersions } from './use-course-versions';
import { useCourses } from './use-courses';

interface UploadScreenProps {
  onParsed: (data: ParseResponse) => Promise<void>;
  onCancel?: () => void;
}

export function UploadScreen({ onParsed, onCancel }: UploadScreenProps) {
  const { courses, loading: coursesLoading, error: coursesError } = useCourses();
  const [course, setCourse] = useState<EcampusCourse | null>(null);
  const { versions, version, setVersion, error: versionsError } = useCourseVersions(course);
  const [historico, setHistorico] = useState<File | null>(null);
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [bothFiles, setBothFiles] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();

  const ready = bothFiles ? Boolean(curriculo && historico) : Boolean(course && version && historico);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !online) return;
    setSending(true);
    setError(null);
    try {
      const data = bothFiles
        ? await uploadDocuments(curriculo!, historico!)
        : await uploadTranscript(historico!, course!.id, version!.id);
      await onParsed(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ERROR_MESSAGES.INTERNAL);
      setSending(false);
    }
  }

  const problem = error ?? coursesError ?? versionsError;

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl content-center gap-12 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <section className="grid-paper">
        <BrandMark size={64} className="flex-col items-start gap-3" />
        <h1 className="mt-8 max-w-[18ch] text-large-title">
          Veja onde você está no curso e o que cabe no próximo semestre.
        </h1>
        <p className="mt-5 max-w-[60ch] text-muted-foreground">
          Escolha o seu curso e envie só o seu histórico. O currículo vem direto do e-Campus, então você não precisa
          gerar nenhum PDF dele.
        </p>
        <ol className="mt-8 grid max-w-[60ch] list-decimal gap-2 pl-5 text-sm">
          <li>Escolha o seu curso e a versão do currículo.</li>
          <li>No e-Campus, gere o relatório "Histórico Escolar Analítico".</li>
          <li>Salve em PDF e envie aqui.</li>
        </ol>
      </section>

      <form onSubmit={handleSubmit} className="grid content-start gap-4" aria-busy={sending}>
        {bothFiles ? (
          <>
            <Dropzone
              id="curriculo"
              label="Currículo do curso"
              documentName="Currículo de Curso"
              file={curriculo}
              onFile={setCurriculo}
              disabled={sending}
            />
            <Dropzone
              id="historico"
              label="Histórico escolar"
              documentName="Histórico Escolar Analítico"
              file={historico}
              onFile={setHistorico}
              disabled={sending}
            />
          </>
        ) : (
          <>
            <CurriculumPicker
              courses={courses}
              course={course}
              onCourse={setCourse}
              versions={versions}
              version={version}
              onVersion={setVersion}
              loading={coursesLoading}
            />
            <Dropzone
              id="historico"
              label="Histórico escolar"
              documentName="Histórico Escolar Analítico"
              file={historico}
              onFile={setHistorico}
              disabled={sending}
            />
          </>
        )}
        {problem && (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {problem}
          </p>
        )}
        <UploadActions
          sending={sending}
          online={online}
          ready={ready}
          bothFiles={bothFiles}
          onCancel={onCancel}
          onToggleMode={() => {
            setBothFiles((current) => !current);
            setError(null);
          }}
        />
      </form>
    </main>
  );
}
