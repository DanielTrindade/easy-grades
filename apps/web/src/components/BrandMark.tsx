import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Symbol size in px. */
  size?: number;
  /** Shorter wordmark below md, for the mobile top bar. */
  compactOnMobile?: boolean;
  className?: string;
}

/**
 * Symbol and wordmark. The symbol is the same drawing as brand/icon.svg (the favicon): a 3×3 grid whose first column
 * and two cells of the second are done in esmeralda, the rest are outlines. The colors are fixed, not themed, like a logo.
 */
export function BrandMark({ size = 28, compactOnMobile = false, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg aria-hidden="true" viewBox="0 0 512 512" width={size} height={size} className="shrink-0">
        <rect width="512" height="512" rx="112" fill="#18191C" />
        <rect x="72" y="72" width="104" height="104" rx="18" fill="#2FBF8A" />
        <rect x="72" y="204" width="104" height="104" rx="18" fill="#2FBF8A" />
        <rect x="72" y="336" width="104" height="104" rx="18" fill="#2FBF8A" />
        <rect x="204" y="72" width="104" height="104" rx="18" fill="#2FBF8A" />
        <rect x="204" y="204" width="104" height="104" rx="18" fill="#2FBF8A" />
        <rect x="209" y="341" width="94" height="94" rx="14" fill="none" stroke="#ECEDEE" strokeOpacity=".35" strokeWidth="10" />
        <rect x="341" y="77" width="94" height="94" rx="14" fill="none" stroke="#ECEDEE" strokeOpacity=".35" strokeWidth="10" />
        <rect x="341" y="209" width="94" height="94" rx="14" fill="none" stroke="#ECEDEE" strokeOpacity=".35" strokeWidth="10" />
        <rect x="341" y="341" width="94" height="94" rx="14" fill="none" stroke="#ECEDEE" strokeOpacity=".35" strokeWidth="10" />
      </svg>
      <span className={cn('heading-ink', compactOnMobile ? 'text-lg md:text-xl' : 'text-xl')}>Easy Grades</span>
    </span>
  );
}
