import { useContext } from 'react'
import { AppStateContext } from './AppProviders.tsx'

export const useAppState = () => {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProviders')
  return ctx
}
