import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'

export function WelcomePage() {
  return (
    <SectionContainer>
      <Card>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Ready to eat it up?</p>
            <h1 className="mt-3 text-6xl font-semibold tracking-tight text-slate-900">
              Don't waste it,
              <br />
              <span className="text-emerald-600">eat it up!</span>
            </h1>
            <p className="mt-4 max-w-3xl text-xl leading-relaxed text-slate-600">Smart Fridge Tracking & Effortless Meal Ideas</p>
            <Link to="/login" className="mt-8 inline-block"><Button>Get Started</Button></Link>
          </div>
          <img
            className="h-72 w-full rounded-2xl object-cover"
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=80"
            alt="Fresh groceries and home cooking"
          />
        </div>
      </Card>
    </SectionContainer>
  )
}
