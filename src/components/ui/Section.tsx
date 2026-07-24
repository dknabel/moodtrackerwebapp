import type { ReactNode } from 'react'
import { eyebrow } from '../../lib/styles'

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`flex flex-col gap-3 pt-4 border-t border-line first:border-t-0 first:pt-0 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className={eyebrow}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
