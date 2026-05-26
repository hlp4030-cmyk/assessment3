interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div className="h-3 rounded-full bg-emerald-100 shadow-inner">
      <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${safe}%` }} />
    </div>
  )
}
