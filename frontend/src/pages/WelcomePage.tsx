import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.tsx'

/* ── Inline SVG feature icons ── */
function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c-1.5 0-3 .5-3.5 2C6 4.5 4.5 7 4.5 10c0 4.5 3 8.5 7.5 12 4.5-3.5 7.5-7.5 7.5-12 0-3-1.5-5.5-4-6-.5-1.5-2-2-3.5-2Z" />
      <path d="M12 2c0-1 1.5-2 2.5-2" />
    </svg>
  )
}

function FryingPanIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="12" r="7" />
      <line x1="16.5" y1="7.5" x2="22" y2="2" />
      <path d="M10 5V3" />
    </svg>
  )
}

function GoalIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

/* ── Feature data ── */
const features = [
  {
    icon: <AppleIcon />,
    title: 'Ingredient Managing',
    description:
      'Track what\'s in your fridge, get expiry alerts, and never lose sight of your groceries again.',
  },
  {
    icon: <FryingPanIcon />,
    title: 'Recipe Recommendations',
    description:
      'Get personalised meal ideas based on what you already have — reduce waste, eat better.',
  },
  {
    icon: <GoalIcon />,
    title: 'Smart Goal Tracking',
    description:
      'Set and monitor goals for cooking, savings, and environmental impact with visual progress.',
  },
]

export function WelcomePage() {
  return (
    <div className="space-y-20 pb-20">
      {/* ─── Hero Section ─── */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left — Copy & CTA */}
          <div className="fade-in-up">
            <p className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Ready to eat it up?
            </p>

            <h1 className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Don't waste it,
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                eat it up!
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-500 sm:text-xl">
              Smart Fridge Tracking & Effortless Meal Ideas
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/login">
                <Button>Get Started</Button>
              </Link>
              <Link to="/signup">
                <Button variant="secondary">Create Account</Button>
              </Link>
            </div>
          </div>

          {/* Right — Hero image */}
          <div className="relative flex justify-center fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Decorative blob */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl sm:h-[26rem] sm:w-[26rem]"
            />
            <img
              className="relative h-64 w-full rounded-3xl object-cover shadow-[0_20px_60px_rgba(2,6,23,0.12)] sm:h-80 lg:h-96"
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80"
              alt="Fresh groceries and home cooking"
            />
          </div>
        </div>
      </section>

      {/* ─── Feature Highlights Section ─── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Three powerful features to
            <br />
            <span className="text-emerald-600">transform how you manage food at home.</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card group rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(2,6,23,0.12)]"
            >
              {/* Icon circle */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-transform duration-300 group-hover:scale-105">
                {f.icon}
              </div>

              <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-slate-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}