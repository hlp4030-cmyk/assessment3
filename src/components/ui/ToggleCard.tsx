interface ToggleCardProps {
  title: string
  subtitle: string
  icon: string
  active: boolean
  onClick: () => void
}

export function ToggleCard({ title, subtitle, icon, active, onClick }: ToggleCardProps) {
  return (
    <button onClick={onClick} className={`rounded-3xl border p-8 text-left transition hover:-translate-y-0.5 ${active ? 'border-emerald-500 bg-emerald-50/60 shadow-[0_12px_30px_rgba(16,185,129,0.14)]' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
      <p className="text-3xl">{icon}</p>
      <h3 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-base text-slate-600">{subtitle}</p>
      <span className={`mt-5 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Active' : 'Inactive'}</span>
    </button>
  )
}
