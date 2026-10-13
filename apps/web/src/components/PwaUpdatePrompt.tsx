import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Announces a new build when the service worker finds one. Nothing reloads on its own: the new version waits until the
 * user presses "Atualizar", so a reload never discards what they are doing.
 */
export function PwaUpdatePrompt() {
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      toast('Nova versão disponível', {
        id: 'pwa-update',
        // Stays until dismissed; a timer could hide the only way to load the new version.
        duration: Infinity,
        // Without a close button a keyboard user has no way to dismiss it.
        closeButton: true,
        action: { label: 'Atualizar', onClick: () => void updateServiceWorker(true) },
      });
    },
  });
  return null;
}
