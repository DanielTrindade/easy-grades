import { Ellipsis } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface OptionsMenuProps {
  onNewUpload: () => void;
  /** Opens the confirmation. The dialog lives in the dashboard, so it stays mounted after this menu closes. */
  onClearData: () => void;
  /** Slot for "Instalar app", filled by the PWA task. Rendered after "Novo upload". */
  installItem?: ReactNode;
  className?: string;
}

export function OptionsMenu({ onNewUpload, onClearData, installItem, className }: OptionsMenuProps) {
  // Closing the menu would hand focus back to the trigger, over the dialog that "Limpar dados" just opened.
  const dialogRequested = useRef(false);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mais opções" className={cn('max-md:size-11', className)}>
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
        {installItem}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            dialogRequested.current = true;
            onClearData();
          }}
          className="text-correcao focus:text-correcao max-md:min-h-11"
        >
          Limpar dados
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
