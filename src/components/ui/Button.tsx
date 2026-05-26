import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
  loading?: boolean
  loadingText?: string
}

export function Button({ children, variant = 'primary', full, className = '', loading, loadingText, ...props }: PropsWithChildren<ButtonProps>) {
  const styles = {
    primary: 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-emerald-600 hover:to-emerald-700 hover:shadow-[0_6px_20px_rgba(16,185,129,0.45)]',
    secondary: 'bg-white text-slate-900 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 hover:ring-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }
  const display = loading ? (loadingText ?? 'Loading...') : children
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`rounded-full px-6 py-3 text-base font-medium tracking-tight transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 w-4 h-4" />
          <span>{display}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
