import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { ConsumptionResultPage } from '../pages/ConsumptionResultPage.tsx'
import { CookingGuidePage } from '../pages/CookingGuidePage.tsx'
import { GoalsPage } from '../pages/GoalsPage.tsx'
import { IngredientInputPage } from '../pages/IngredientInputPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { SignUpPage } from '../pages/SignUpPage.tsx'
import { MealSuggestionsPage } from '../pages/MealSuggestionsPage.tsx'
import { MyFridgePage } from '../pages/MyFridgePage.tsx'
import { OnboardingPage } from '../pages/OnboardingPage.tsx'
import { MyProfilePage } from '../pages/MyProfilePage.tsx'
import { UpdatedDashboardPage } from '../pages/UpdatedDashboardPage.tsx'
import { WelcomePage } from '../pages/WelcomePage.tsx'

export function AppRoutes() {
  const { isAuthenticated, user } = useAppState()
  const authenticatedHome = '/my-fridge'

  const withAuth = (element: ReactElement) => (isAuthenticated ? element : <Navigate to="/login" replace />)
  const publicOnly = (element: ReactElement) => (!isAuthenticated ? element : <Navigate to={authenticatedHome} replace />)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? authenticatedHome : '/welcome'} replace />} />
      <Route path="/welcome" element={publicOnly(<WelcomePage />)} />
      <Route
        path="/signup"
        element={
          isAuthenticated
            ? <Navigate to={user.onboardingComplete ? authenticatedHome : '/onboarding'} replace />
            : <SignUpPage />
        }
      />
      <Route path="/login" element={publicOnly(<LoginPage />)} />
      <Route path="/onboarding" element={withAuth(<OnboardingPage />)} />
      <Route path="/goals" element={withAuth(<GoalsPage />)} />
      <Route path="/ingredient-input" element={withAuth(<IngredientInputPage />)} />
      <Route path="/my-fridge" element={withAuth(<MyFridgePage />)} />
      <Route path="/meal-suggestions" element={withAuth(<MealSuggestionsPage />)} />
      <Route path="/cooking-guide" element={withAuth(<CookingGuidePage />)} />
      <Route path="/consumption-result" element={withAuth(<ConsumptionResultPage />)} />
      <Route path="/updated-dashboard" element={withAuth(<UpdatedDashboardPage />)} />
      <Route path="/my-profile" element={withAuth(<MyProfilePage />)} />
      <Route path="*" element={<Navigate to={isAuthenticated ? authenticatedHome : '/welcome'} replace />} />
    </Routes>
  )
}
