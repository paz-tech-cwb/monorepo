import { cn } from '@/lib/utils'

interface WipOverlayProps {
  children: React.ReactNode
  label?: string
  className?: string
}

export function WipOverlay({ children, label = 'WIP', className }: WipOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <span className="pointer-events-none absolute right-1 top-1 z-50 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
        {label}
      </span>
    </div>
  )
}
