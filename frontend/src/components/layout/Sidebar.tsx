import { motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/utils/cn"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  BrainCircuit,
  Medal,
  Upload,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "Dashboard",       icon: LayoutDashboard, href: "/dashboard" },
  { label: "Candidates",      icon: Users,           href: "/candidates" },
  { label: "Job Descriptions",icon: Briefcase,        href: "/jobs" },
  { label: "AI Screening",    icon: Upload,           href: "/screening" },
  { label: "AI Ranking",      icon: Medal,            href: "/ranking" },
]

const INSIGHTS_ITEMS = [
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
]

const SYSTEM_ITEMS = [
  { label: "Settings", icon: Settings, href: "/settings" },
]

type NavItem = (typeof NAV_ITEMS)[0]

export function Sidebar() {
  const location = useLocation()

  const isActive = (item: NavItem) => {
    if (item.href === "/candidates") {
      return (
        location.pathname === "/candidates" ||
        location.pathname.startsWith("/candidates/")
      )
    }
    // Exact match for all other routes
    return location.pathname === item.href
  }

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.href}
      className={cn(
        "sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        isActive(item)
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {isActive(item) && <motion.span className="sidebar-active" layoutId="sidebar-indicator" transition={{ type: "spring", stiffness: 380, damping: 35 }} />}
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden md:flex w-64 flex-col border-r app-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight">Nexus HR</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            AI Recruitment Platform
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 scrollbar-thin">
        <nav className="space-y-5 px-3">
          <div>
            <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Recruitment
            </h4>
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <span key={item.href} className="block">{NavLink({item})}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Insights
            </h4>
            <div className="space-y-0.5">
              {INSIGHTS_ITEMS.map((item) => (
                <span key={item.href} className="block">{NavLink({item})}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              System
            </h4>
            <div className="space-y-0.5">
              {SYSTEM_ITEMS.map((item) => (
                <span key={item.href} className="block">{NavLink({item})}</span>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* User Profile footer */}
      <div className="border-t p-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted transition-colors cursor-pointer"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">Alex Recruiter</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Acme Corp</p>
          </div>
          <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Link>
      </div>
    </aside>
  )
}
