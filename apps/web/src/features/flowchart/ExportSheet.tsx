import type { RefObject } from 'react';
import { toast } from 'sonner';
import { DetentSheet } from '@/components/DetentSheet';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { canShareImage, downloadImage, imageFile } from './export-image';

export interface ExportImage {
  url: string;
  blob: Blob;
}

/**
 * Bottom sheet with the exported PNG on a touch screen. The share sheet is where the image lands on Photos, Files or
 * another app; the preview also takes a long press, the one way an installed iOS PWA has to save it.
 */
export function ExportSheet({
  image,
  onClose,
  returnFocusRef,
}: {
  image: ExportImage | null;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const shareable = image !== null && canShareImage(image.blob);

  async function share() {
    if (!image) return;
    try {
      await navigator.share({ files: [imageFile(image.blob)], title: 'Fluxograma do curso' });
      onClose();
    } catch (err) {
      // Dismissing the share sheet is a choice, not a failure.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error('Não foi possível compartilhar a imagem. Tente de novo.');
      }
    }
  }

  function download() {
    if (!image) return;
    downloadImage(image.blob);
    onClose();
    toast.success('Fluxograma exportado.');
  }

  return (
    <DetentSheet
      open={image !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Fluxograma pronto"
      description={
        shareable
          ? 'Salve a imagem no celular ou compartilhe com quem quiser.'
          : 'Toque e segure a imagem para salvá-la no celular.'
      }
      detents={['medium']}
      returnFocusRef={returnFocusRef}
      headerAction={
        <SheetClose asChild>
          <Button variant="ghost" className="h-11 rounded-full px-3">
            Fechar
          </Button>
        </SheetClose>
      }
    >
      <div className="grid gap-5">
        <img
          src={image?.url}
          alt="Fluxograma do curso"
          className="w-full rounded-group border border-hairline bg-surface"
        />
        <div className="grid gap-2">
          {shareable ? (
            <Button onClick={() => void share()} className="max-md:h-11">
              Salvar ou compartilhar
            </Button>
          ) : (
            <Button onClick={download} className="max-md:h-11">
              Baixar imagem
            </Button>
          )}
        </div>
      </div>
    </DetentSheet>
  );
}
