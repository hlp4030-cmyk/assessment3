import type { PropsWithChildren } from 'react'

export function SectionContainer({ children }: PropsWithChildren) {
  return <section className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">{children}</section>
}
