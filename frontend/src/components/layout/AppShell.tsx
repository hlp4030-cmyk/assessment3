import { useLocation } from 'react-router-dom'
import { AppRoutes } from '../../app/routes.tsx'
import { Navbar } from './Navbar.tsx'

const HIDE_NAV = ['/welcome', '/login', '/signup', '/onboarding', '/goals']

export function AppShell() {
  const { pathname } = useLocation()
  const showNavbar = !HIDE_NAV.includes(pathname)

  return (
    <div className="min-h-screen bg-transparent">
      {showNavbar && <Navbar />}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <AppRoutes />
      </main>
    </div>
  )
}
