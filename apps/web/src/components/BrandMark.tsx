import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Symbol size in px. */
  size?: number;
  className?: string;
}

/**
 * Symbol and wordmark. The symbol is the same drawing as brand/icon.svg (the favicon): a 3×3 notebook grid whose
 * first column and two cells of the second are done in highlighter. The colors are fixed, not themed, like a logo.
 */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg aria-hidden="true" viewBox="0 0 512 512" width={size} height={size} className="shrink-0">
        <rect width="512" height="512" rx="112" fill="#1D3FA0" />
        <rect x="72" y="72" width="104" height="104" rx="18" fill="#F2E94E" />
        <rect x="72" y="204" width="104" height="104" rx="18" fill="#F2E94E" />
        <rect x="72" y="336" width="104" height="104" rx="18" fill="#F2E94E" />
        <rect x="204" y="72" width="104" height="104" rx="18" fill="#F2E94E" />
        <rect x="204" y="204" width="104" height="104" rx="18" fill="#F2E94E" />
        <rect x="209" y="341" width="94" height="94" rx="14" fill="none" stroke="#F4F6FA" strokeOpacity=".45" strokeWidth="10" />
        <rect x="341" y="77" width="94" height="94" rx="14" fill="none" stroke="#F4F6FA" strokeOpacity=".45" strokeWidth="10" />
        <rect x="341" y="209" width="94" height="94" rx="14" fill="none" stroke="#F4F6FA" strokeOpacity=".45" strokeWidth="10" />
        <rect x="341" y="341" width="94" height="94" rx="14" fill="none" stroke="#F4F6FA" strokeOpacity=".45" strokeWidth="10" />
      </svg>
      <span className="heading-ink text-xl font-[800] font-stretch-[75%]">Easy Grades</span>
    </span>
  );
}
