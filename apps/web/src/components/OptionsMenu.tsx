import { Ellipsis } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InstallKind } from '@/lib/use-install-app';
import { cn } from '@/lib/utils';

export interface InstallOption {
  kind: InstallKind;
  /** Gets the menu trigger as its opener. Only the iOS hint opens a dialog, so only that path needs it. */
  onSelect: (opener: HTMLElement) => void;
}

interface OptionsMenuProps {
  onNewUpload: () => void;
  /**
   * Opens the confirmation. The dialog lives in the dashboard, so it stays mounted after this menu closes. Receives
   * the trigger, so the dialog can return focus to it.
   */
  onClearData: (opener: HTMLElement) => void;
  /** "Instalar app", shown when the app can be installed. Rendered after "Novo upload". */
  install?: InstallOption;
  className?: string;
}

export function OptionsMenu({ onNewUpload, onClearData, install, className }: OptionsMenuProps) {
  // Closing the menu would hand focus back to the trigger, over the dialog that "Limpar dados" just opened.
  const dialogRequested = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          aria-label="Mais opções"
          className={cn('max-md:size-11', className)}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (!dialogRequested.current) return;
          dialogRequested.current = false;
          event.preventDefault();
        }}
      >
        <DropdownMenuItem onSelect={onNewUpload} className="max-md:min-h-11">
          Novo upload
        </DropdownMenuItem>
        {install && (
          <DropdownMenuItem
            onSelect={() => {
              if (!triggerRef.current) return;
              // Only the iOS hint opens a dialog; the native prompt is the browser's own UI.
              dialogRequested.current = install.kind === 'ios';
              install.onSelect(triggerRef.current);
            }}
            className="max-md:min-h-11"
          >
            Instalar app
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            if (!triggerRef.current) return;
            dialogRequested.current = true;
            onClearData(triggerRef.current);
          }}
          className="text-danger focus:text-danger max-md:min-h-11"
        >
          Limpar dados
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
