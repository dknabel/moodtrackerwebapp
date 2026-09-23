import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`flex flex-col gap-3 pt-4 border-t border-line ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
