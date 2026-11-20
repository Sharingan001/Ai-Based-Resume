import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, Bell, Sun, Moon, Settings } from "lucide-react"

export function TopBar() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    window.addEventListener("nexus-theme", sync);
    return () => window.removeEventListener("nexus-theme", sync);
  }, []);
  const toggleTheme = () => {
    const root = document.documentElement
    if (dark) root.classList.remove("dark")
    else root.classList.add("dark")
    setDark(!dark)
    localStorage.setItem("nexus-theme", !dark ? "dark" : "light")
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      <form className="relative flex flex-1 min-w-0 max-w-md" onSubmit={e => { e.preventDefault(); const value = new FormData(e.currentTarget).get("search"); navigate(`/candidates?search=${encodeURIComponent(String(value || ""))}`); }}>
        <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-lg border bg-muted/40 py-0 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          placeholder="Search candidates and press Enter"
          name="search"
          type="search"
        />
      </form>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button disabled title="Notifications are not configured" aria-label="Notifications unavailable" className="opacity-40 h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </button>
        <Link to="/settings" aria-label="Settings" className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Settings className="h-4 w-4" />
        </Link>
        <div className="ml-2 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold cursor-pointer">
          A
        </div>
      </div>
    </header>
  )
}
