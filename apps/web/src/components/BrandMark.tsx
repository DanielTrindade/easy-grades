import { useId } from 'react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Symbol size in px. */
  size?: number;
  className?: string;
}

/**
 * Symbol and wordmark. The symbol is the same drawing as brand/icon.svg (the favicon): a 3×3 grid on a pen blue
 * gradient, done cells in white and pending cells in translucent white. The colors are fixed, not themed, like a logo.
 */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  const gradientId = useId();

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg aria-hidden="true" viewBox="0 0 512 512" width={size} height={size} className="shrink-0">
        <defs>
          <linearGradient id={gradientId} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4677EE" />
            <stop offset="1" stopColor="#1F47B4" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill={`url(#${gradientId})`} />
        <rect x="72" y="72" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="72" y="204" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="72" y="336" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="72" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="204" width="104" height="104" rx="26" fill="#FFFFFF" />
        <rect x="204" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="72" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="204" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
        <rect x="336" y="336" width="104" height="104" rx="26" fill="#FFFFFF" fillOpacity=".22" />
      </svg>
      <span className="heading-ink text-xl">Easy Grades</span>
    </span>
  );
}
