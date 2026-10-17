import { ChoiceGroup, type ChoiceItem } from '@/features/courses/ChoiceGroup';
import { cn } from '@/lib/utils';

interface ChipGroupProps<T extends string> {
  label: string;
  items: readonly ChoiceItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function ChipGroup<T extends string>({ className, ...props }: ChipGroupProps<T>) {
  return (
    <ChoiceGroup
      {...props}
      className={cn('flex flex-wrap gap-2', className)}
      itemClassName="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[checked=false]:hover:bg-muted aria-checked:border-ink aria-checked:bg-ink aria-checked:text-canvas aria-checked:focus-visible:ring-offset-2 aria-checked:focus-visible:ring-offset-background md:min-h-8 md:pointer-coarse:min-h-11"
    />
  );
}
