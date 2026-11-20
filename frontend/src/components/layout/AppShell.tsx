import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Link, useLocation, useOutlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

export function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  return (
    <div className="glass-workspace min-h-screen bg-background">
      <div className="ambient-light" aria-hidden="true"/>
      <Sidebar />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar />
        <nav className="md:hidden flex flex-nowrap overflow-x-auto gap-1 px-3 py-2 border-b no-scrollbar">{["dashboard", "candidates", "jobs", "screening", "ranking", "analytics", "settings"].map(path => <Link key={path} to={`/${path}`} className={`shrink-0 capitalize px-3 py-2 text-xs rounded-md transition-colors ${location.pathname.startsWith(`/${path}`) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>{path}</Link>)}</nav>
        <main className="flex-1 py-6 px-4 md:px-8 max-w-[1400px] w-full mx-auto">
          <p className="demo-note mb-6">Local demo: existing seed profiles include unverified demonstration identities and statuses. Review extracted information before using a ranking.</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname + location.search} className="page-stage" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={{ duration: reduceMotion ? 0 : .24, ease: [.22, 1, .36, 1] }}>
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
