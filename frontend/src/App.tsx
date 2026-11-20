import { MotionConfig } from "framer-motion"
import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { AppShell } from "./components/layout/AppShell"
const LandingPage = lazy(() => import("./pages/LandingPage"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Candidates = lazy(() => import("./pages/Candidates"))
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"))
const Jobs = lazy(() => import("./pages/Jobs"))
const AIScreening = lazy(() => import("./pages/AIScreening"))
const AIRanking = lazy(() => import("./pages/AIRanking"))
const Analytics = lazy(() => import("./pages/Analytics"))
const Settings = lazy(() => import("./pages/Settings"))

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <p className="text-5xl font-black text-foreground">404</p>
      <p className="text-lg font-medium">Page not found</p>
      <a href="/dashboard" className="text-sm text-primary underline underline-offset-4">
        Go to Dashboard
      </a>
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8" role="status">Loading…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateProfile />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/screening" element={<AIScreening />} />
            <Route path="/ranking" element={<AIRanking />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
    </MotionConfig>
  )
}