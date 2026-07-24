import type { ReactNode } from 'react'

/** @deprecated Use Section for flat editorial layout. Kept until Task 4 removes the last uses. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-xl p-4 border border-line ${className}`}>{children}</div>
}
