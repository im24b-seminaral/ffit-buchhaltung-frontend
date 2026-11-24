import { ScissorsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The app mark: a payment slip with its receipt part cut off along the perforation. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" className={cn('h-4 w-6 shrink-0 text-slip-ink', className)}>
      <rect x="0.75" y="0.75" width="22.5" height="14.5" rx="2" fill="var(--card)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.6" />
      <path d="M11.5 5h8M11.5 8h5.5M11.5 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Dashed cut line with scissors, the boundary between recorded and pending work. */
export function Perforation({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  const vertical = orientation === 'vertical'
  return (
    <div
      aria-hidden="true"
      className={cn('relative shrink-0', vertical ? 'perforation-y w-[1.5px] self-stretch' : 'perforation-x h-[1.5px] w-full', className)}
    >
      <ScissorsIcon
        strokeWidth={1.75}
        className={cn(
          'absolute size-4 text-slip-ink',
          vertical ? 'top-6 left-1/2 -translate-x-1/2 rotate-90' : 'top-1/2 left-5 -translate-y-1/2',
        )}
        style={{ background: 'var(--slip)' }}
      />
    </div>
  )
}
