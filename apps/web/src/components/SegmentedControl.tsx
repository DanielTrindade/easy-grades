import { ChoiceGroup, type ChoiceItem } from '@/components/ChoiceGroup';
import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  label: string;
  items: readonly ChoiceItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ className, ...props }: SegmentedControlProps<T>) {
  return (
    <ChoiceGroup
      {...props}
      className={cn('inline-flex rounded-full bg-muted p-0.5', className)}
      itemClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm text-ink-muted outline-none transition-[color,background-color,box-shadow] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[checked=false]:hover:text-ink aria-checked:bg-surface aria-checked:ring-1 aria-checked:ring-field aria-checked:font-medium aria-checked:text-ink aria-checked:shadow-sm md:min-h-8 md:pointer-coarse:min-h-11"
    />
  );
}
