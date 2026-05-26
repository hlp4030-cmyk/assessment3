import { AppShell } from '../components/layout/AppShell.tsx'
import { AppProviders } from '../context/AppProviders.tsx'

function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}

export default App
