import type { PropsWithChildren } from 'react'

export function Card({ children }: PropsWithChildren) {
  return (
    <div className="glass-card rounded-[28px] p-8 shadow-[0_12px_40px_rgba(2,6,23,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(2,6,23,0.1)]">
      {children}
    </div>
  )
}
