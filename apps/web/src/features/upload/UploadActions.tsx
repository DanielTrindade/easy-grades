import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadActionsProps {
  sending: boolean;
  online: boolean;
  ready: boolean;
  bothFiles: boolean;
  onCancel?: () => void;
  onToggleMode: () => void;
}

export function UploadActions({ sending, online, ready, bothFiles, onCancel, onToggleMode }: UploadActionsProps) {
  return (
    <>
      {/* Always mounted: screen readers announce text added to a live region, not a region inserted already filled. */}
      <p
        role="status"
        className={online ? 'sr-only' : 'flex items-start gap-2 rounded-card border border-border bg-muted p-4 text-sm'}
      >
        {!online && (
          <>
            <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" size="lg" disabled={!ready || sending || !online}>
          {sending ? 'Lendo o histórico…' : bothFiles ? 'Ler meus PDFs' : 'Ler meu histórico'}
        </Button>
        <Button type="button" size="lg" variant="ghost" disabled={sending} onClick={onToggleMode}>
          {bothFiles ? 'Buscar pelo e-Campus' : 'Prefiro enviar os dois PDFs'}
        </Button>
        {onCancel && (
          <Button type="button" size="lg" variant="ghost" disabled={sending} onClick={onCancel}>
            Voltar ao painel
          </Button>
        )}
      </div>
    </>
  );
}
