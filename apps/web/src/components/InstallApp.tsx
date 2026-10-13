import { Download } from 'lucide-react';
import type { RefObject } from 'react';
import type { InstallOption } from '@/components/OptionsMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export const IOS_INSTALL_HINT = 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início';

/** Header shortcut for "Instalar app", shown on md+ where the options menu is hidden. */
export function InstallAppButton({ install }: { install: InstallOption }) {
  return (
    <Button variant="ghost" size="sm" onClick={(event) => install.onSelect(event.currentTarget)}>
      <Download aria-hidden="true" />
      Instalar app
    </Button>
  );
}

interface IosInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The control that opened the hint. Focus goes back to it on close, as with "Limpar dados". */
  openerRef: RefObject<HTMLElement | null>;
}

/** iOS has no install prompt, so the app explains the manual steps instead. */
export function IosInstallDialog({ open, onOpenChange, openerRef }: IosInstallDialogProps) {
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
          <AlertDialogTitle>Instalar o Easy Grades</AlertDialogTitle>
          <AlertDialogDescription>{IOS_INSTALL_HINT}.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="max-md:h-11">Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
