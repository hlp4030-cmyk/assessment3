import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAppState } from '../../context/useAppState.ts'

const links = [
  { to: '/ingredient-input', label: 'Ingredient Input' },
  { to: '/my-fridge', label: 'My Fridge' },
  { to: '/meal-suggestions', label: 'Meal Suggestions' },
  { to: '/updated-dashboard', label: 'Goal Progress' },
]

export function Navbar() {
  const app = useAppState()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)

  const signOut = () => {
    const confirmed = window.confirm('Are you sure you want to sign out?')
    if (!confirmed) return
    // Reset in-memory state — the AppProviders useEffect handles localStorage cleanup
    // when isAuthenticated becomes false.
    if (app?.setAuthSession) app.setAuthSession(null)
    if (app?.setInventory) app.setInventory([])
    if (app?.setIsAuthenticated) app.setIsAuthenticated(false)
    setProfileOpen(false)
    navigate('/welcome')
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <p className="text-xl font-semibold tracking-tight text-emerald-700">eat it up</p>
        </div>
        <div className="flex items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="relative ml-2">
            <button
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700"
              onClick={() => setProfileOpen((s) => !s)}
            >
              {((app?.user?.nickname?.[0] ?? 'U') as string).toUpperCase()}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="px-4 py-3 text-sm text-slate-500 border-b border-slate-100">{app?.authSession?.email ?? 'anonymous'}</div>
                  <Link
                    to="/my-profile"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    onClick={() => setProfileOpen(false)}
                  >
                    Manage Account
                  </Link>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition rounded-b-xl"
                    onClick={signOut}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
