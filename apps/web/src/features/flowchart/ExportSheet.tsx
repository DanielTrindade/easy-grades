import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { canShareImage, downloadImage, imageFile } from './export-image';

export interface ExportImage {
  url: string;
  blob: Blob;
}

/**
 * Bottom sheet with the exported PNG on a touch screen. The share sheet is where the image lands on Photos, Files or
 * another app; the preview also takes a long press, the one way an installed iOS PWA has to save it.
 */
export function ExportSheet({ image, onClose }: { image: ExportImage | null; onClose: () => void }) {
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
    <Sheet open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[85dvh] gap-5 overflow-y-auto rounded-t-xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-none"
      >
        <div aria-hidden className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-hairline" />
        <SheetHeader className="p-0">
          <SheetTitle className="heading-ink text-2xl">Fluxograma pronto</SheetTitle>
          <SheetDescription>
            {shareable
              ? 'Salve a imagem no celular ou compartilhe com quem quiser.'
              : 'Toque e segure a imagem para salvá-la no celular.'}
          </SheetDescription>
        </SheetHeader>
        <img src={image?.url} alt="Fluxograma do curso" className="w-full rounded-lg border border-border bg-card" />
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
          <SheetClose asChild>
            <Button variant="outline" className="max-md:h-11">
              Fechar
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
