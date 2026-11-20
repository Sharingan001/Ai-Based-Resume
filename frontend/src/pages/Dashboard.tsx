import { useQuery } from "@tanstack/react-query"
import { fetchOverview } from "@/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, CheckCircle2, Clock, TrendingUp, UserCheck } from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from "recharts"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

const pipelineData = [
  { month: "Feb", screened: 280, shortlisted: 80 },
  { month: "Mar", screened: 340, shortlisted: 110 },
  { month: "Apr", screened: 520, shortlisted: 160 },
  { month: "May", screened: 680, shortlisted: 210 },
  { month: "Jun", screened: 890, shortlisted: 290 },
  { month: "Jul", screened: 1200, shortlisted: 420 },
  { month: "Aug", screened: 1480, shortlisted: 530 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-xl text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    )
  }


export default function Dashboard() {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverview,
  })

  if (isError) return <div role="alert" className="p-6 border rounded-lg">Unable to load data. Check the API connection. <button className="underline" onClick={() => refetch()}>Retry</button></div>;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <div className="md:col-span-4 h-80 bg-muted rounded-xl" />
          <div className="md:col-span-3 h-80 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const kpis = [
    { label: "Total Candidates", value: overview?.total_candidates?.toLocaleString() || "—", sub: "In talent pool", icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", href: "/candidates" },
    { label: "Active Jobs", value: overview?.active_jobs ?? "—", sub: "Open requisitions", icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", href: "/jobs" },
    { label: "Shortlisted", value: overview?.shortlisted ?? "—", sub: "In pipeline", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", href: "/candidates" },
    { label: "Time Saved (unmeasured)", value: overview?.screening_time_saved || "—", sub: "Not tracked yet", icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", href: "/analytics" },
  ]

  const categoryChartData = overview?.category_counts
    ? Object.entries(overview.category_counts)
        .map(([name, val]) => ({ name: name.substring(0, 12), count: val as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : []


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium tracking-tight">Your talent, in focus</h2>
          <p className="text-muted-foreground text-sm mt-0.5">A clear perspective on your talent pool and the work ahead.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/screening">Upload Resumes</Link></Button>
          <Button size="sm" asChild><Link to="/ranking">Run AI Match</Link></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} to={href}>
            <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Area Chart */}
        <Card className="md:col-span-4">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Candidate Pipeline (demo)</CardTitle>
              <span className="text-xs text-muted-foreground">Feb – Aug 2026</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gScreened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gShort" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142,60%,45%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(142,60%,45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="screened" name="Screened" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gScreened)" />
                  <Area type="monotone" dataKey="shortlisted" name="Shortlisted" stroke="hsl(142,60%,45%)" strokeWidth={2} fill="url(#gShort)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Bar Chart - Real Data */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Top Resume Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Resumes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Upload Resumes", desc: "Parse PDF/DOCX resumes with AI extraction", href: "/screening", icon: TrendingUp, cta: "Upload Now" },
          { title: "Run AI Match", desc: "Match your talent pool against a job description", href: "/ranking", icon: CheckCircle2, cta: "Start Matching" },
          { title: "View Analytics", desc: "Explore hiring trends and pipeline metrics", href: "/analytics", icon: UserCheck, cta: "View Report" },
        ].map(({ title, desc, href, icon: Icon, cta }) => (
          <Card key={title} className="hover:border-primary/40 hover:shadow-sm transition-all">
            <CardContent className="p-5 flex flex-col gap-3 h-full">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto" asChild>
                <Link to={href}>{cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
