import { cn } from '@/lib/utils';

interface CompactHeaderProps {
  title: string;
  visible: boolean;
  asHeading?: boolean;
}

export function CompactHeader({ title, visible, asHeading = false }: CompactHeaderProps) {
  return (
    <div
      aria-hidden={asHeading ? undefined : true}
      className={cn(
        'glass scroll-edge fixed inset-x-0 top-0 z-30 rounded-none pt-[env(safe-area-inset-top)] transition-opacity duration-150 ease-snap',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="flex h-11 items-center justify-center px-16">
        {asHeading ? (
          <h1 className="font-sans text-headline font-semibold tracking-normal font-stretch-normal">{title}</h1>
        ) : (
          <span className="text-headline font-semibold">{title}</span>
        )}
      </div>
    </div>
  );
}
