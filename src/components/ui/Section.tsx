import type { ReactNode } from 'react'

interface SectionProps {
  /** 1-based position on the page; renders as `NN / TITLE`. */
  index?: number
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ index, title, action, children, className = '' }: SectionProps) {
  const marker = index !== undefined ? `${String(index).padStart(2, '0')} / ${title}` : title
  return (
    <section className={`flex flex-col gap-3 pt-4 border-t border-line ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{marker}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
