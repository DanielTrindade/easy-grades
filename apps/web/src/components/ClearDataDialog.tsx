import type { RefObject } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClearDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** The control that opened the dialog. Focus goes back to it on close, since the dialog has no trigger of its own. */
  openerRef: RefObject<HTMLElement | null>;
}

/** Confirmation for "Limpar dados". Controlled, so the desktop button and the options menu can both open it. */
export function ClearDataDialog({ open, onOpenChange, onConfirm, openerRef }: ClearDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!openerRef.current) return;
          event.preventDefault();
          openerRef.current.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar dados deste navegador?</AlertDialogTitle>
          <AlertDialogDescription>
            O currículo, o histórico e as atividades complementares que você registrou serão apagados deste navegador. Você pode enviar os PDFs de novo quando quiser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="max-md:h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-correcao text-correcao-foreground hover:bg-correcao/90 max-md:h-11">
            Limpar dados
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
