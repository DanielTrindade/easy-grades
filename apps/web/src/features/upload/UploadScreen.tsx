import { ERROR_MESSAGES, type ParseResponse } from '@easy-grades/core';
import { WifiOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { ApiError, uploadDocuments } from '@/lib/api';
import { useOnline } from '@/lib/use-online';
import { Dropzone } from './Dropzone';

interface UploadScreenProps {
  onParsed: (data: ParseResponse) => Promise<void>;
  onCancel?: () => void;
}

export function UploadScreen({ onParsed, onCancel }: UploadScreenProps) {
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [historico, setHistorico] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!curriculo || !historico || !online) return;
    setSending(true);
    setError(null);
    try {
      await onParsed(await uploadDocuments(curriculo, historico));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ERROR_MESSAGES.INTERNAL);
      setSending(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl content-center gap-12 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <section className="grid-paper">
        <BrandMark size={64} className="flex-col items-start gap-3" />
        <h1 className="mt-8 max-w-[18ch] text-large-title">
          Veja onde você está no curso e o que cabe no próximo semestre.
        </h1>
        <p className="mt-5 max-w-[60ch] text-muted-foreground">
          Envie dois PDFs do e-Campus da UFAM. O servidor lê os arquivos e não guarda nada; o resultado fica salvo só
          neste navegador.
        </p>
        <ol className="mt-8 grid max-w-[60ch] list-decimal gap-2 pl-5 text-sm">
          <li>No e-Campus, gere o relatório "Currículo de Curso (por versão e situação)" da versão que aparece no seu histórico.</li>
          <li>Gere também o seu "Histórico Escolar Analítico".</li>
          <li>Salve os dois em PDF e envie aqui.</li>
        </ol>
      </section>

      <form onSubmit={handleSubmit} className="grid content-start gap-4" aria-busy={sending}>
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
        {/* Always mounted: screen readers announce text added to a live region, not a region inserted already filled. */}
        <p
          role="status"
          className={online ? 'sr-only' : 'flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm'}
        >
          {!online && (
            <>
              <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis.
            </>
          )}
        </p>
        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={!curriculo || !historico || sending || !online}>
            {sending ? 'Lendo os PDFs…' : 'Ler meus PDFs'}
          </Button>
          {onCancel && (
            <Button type="button" size="lg" variant="ghost" onClick={onCancel} disabled={sending}>
              Voltar ao painel
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
