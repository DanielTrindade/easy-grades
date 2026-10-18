import { Ellipsis } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance, type Appearance } from '@/lib/appearance';
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
  /** False on wide screens, where the header already shows the actions; the menu then keeps only the appearance. */
  showActions?: boolean;
  className?: string;
}

export function OptionsMenu({ onNewUpload, onClearData, install, showActions = true, className }: OptionsMenuProps) {
  const [appearance, setAppearance] = useAppearance();
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
          className={cn('rounded-full max-md:size-11 md:pointer-coarse:size-11', className)}
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
        {showActions && (
          <>
            <DropdownMenuItem onSelect={onNewUpload} className="max-md:min-h-11 md:pointer-coarse:min-h-11">
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
                className="max-md:min-h-11 md:pointer-coarse:min-h-11"
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
              className="text-danger focus:text-danger max-md:min-h-11 md:pointer-coarse:min-h-11"
            >
              Limpar dados
            </DropdownMenuItem>
          </>
        )}
        {showActions && <DropdownMenuSeparator />}
        <DropdownMenuLabel className="text-footnote font-normal text-ink-muted">Aparência</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={appearance} onValueChange={(value) => setAppearance(value as Appearance)}>
          <DropdownMenuRadioItem value="glass" className="max-md:min-h-11 md:pointer-coarse:min-h-11">
            Vidro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="solid" className="max-md:min-h-11 md:pointer-coarse:min-h-11">
            Sólida
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
