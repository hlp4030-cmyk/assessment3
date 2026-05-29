/**
 * Skeleton loading primitives with a smooth shimmer gradient animation.
 *
 * Usage:
 *   <Skeleton className="h-6 w-3/4 rounded" />
 *   <SkeletonCard />
 *   <SkeletonText lines={3} />
 *   <SkeletonCircle size={48} />
 */

interface SkeletonProps {
  className?: string
  /** Extra inline styles (e.g. width overrides) */
  style?: React.CSSProperties
}

/** Base shimmer block — any shape via className */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 ${className}`}
      style={style}
    />
  )
}

/* ── Compound skeletons ─────────────────────────────────── */

interface SkeletonTextProps {
  /** Number of placeholder lines */
  lines?: number
  /** Tailwind widths for each line (cycles if shorter than `lines`) */
  widths?: string[]
  className?: string
}

/** Placeholder for a block of text lines */
export function SkeletonText({ lines = 3, widths = ['w-full', 'w-5/6', 'w-4/6'], className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}

interface SkeletonCircleProps {
  /** Diameter in pixels */
  size?: number
  className?: string
}

/** Placeholder for circular elements (avatars, icons) */
export function SkeletonCircle({ size = 48, className = '' }: SkeletonCircleProps) {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

interface SkeletonCardProps {
  /** Show an image placeholder at the top */
  imageHeight?: string
  /** Show text placeholders */
  textLines?: number
  /** Show a button-shaped placeholder */
  showButton?: boolean
  className?: string
}

/** Full card skeleton that mirrors a typical content card layout */
export function SkeletonCard({
  imageHeight = 'h-40',
  textLines = 2,
  showButton = true,
  className = '',
}: SkeletonCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
      <Skeleton className={`${imageHeight} w-full rounded-xl`} />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <SkeletonText lines={textLines} widths={['w-full', 'w-2/3']} />
        {showButton && <Skeleton className="h-9 w-28 rounded-full" />}
      </div>
    </div>
  )
}

/** Grid placeholder for Quick-Add style cards (compact square items) */
export function SkeletonQuickAddGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonCircle size={48} className="rounded-lg" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}