interface StatusBadgeProps {
  text: string
  tone?: 'neutral' | 'success' | 'warning'
}

export function StatusBadge({ text, tone = 'neutral' }: StatusBadgeProps) {
  const toneClass = tone === 'success' ? 'bg-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold tracking-tight ${toneClass}`}>{text}</span>
}
