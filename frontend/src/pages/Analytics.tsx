import { useQuery } from "@tanstack/react-query";
import { fetchOverview } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, Briefcase, CheckCircle2, TrendingUp } from "lucide-react";

const COLORS = ["hsl(233,60%,40%)", "hsl(210,70%,55%)", "hsl(142,60%,45%)", "hsl(38,90%,50%)", "hsl(0,75%,55%)", "hsl(280,60%,55%)", "hsl(190,70%,45%)", "hsl(60,70%,45%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-primary">{payload[0].name}: <span className="font-bold">{payload[0].value}</span></p>
      </div>
    );
  };


export default function Analytics() {
  const { data: overview, isLoading, isError, refetch } = useQuery({ queryKey: ["overview"], queryFn: fetchOverview });

  if (isError) return <div role="alert" className="p-6 border rounded-lg">Unable to load data. Check the API connection. <button className="underline" onClick={() => refetch()}>Retry</button></div>;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  const rolesData = overview?.top_roles
    ? Object.entries(overview.top_roles).map(([name, val]) => ({ name: name.length > 20 ? name.substring(0, 20) + "…" : name, count: val as number })).slice(0, 8)
    : [];

  const companiesData = overview?.top_companies
    ? Object.entries(overview.top_companies).map(([name, val]) => ({ name: name.length > 18 ? name.substring(0, 18) + "…" : name, count: val as number })).slice(0, 8)
    : [];

  const categoryPieData = overview?.category_counts
    ? Object.entries(overview.category_counts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 8)
    : [];

  const lengthData = (overview?.resume_length_distribution || []).map((d: any) => ({
    ...d,
    label: d.range?.split(",")[0]?.replace("(", "")?.trim() || d.range,
  }));

  const kpis = [
    { label: "Total Candidates", value: overview?.total_candidates?.toLocaleString() || "—", icon: <Users className="h-5 w-5" />, color: "text-primary" },
    { label: "Active Jobs", value: overview?.active_jobs ?? "—", icon: <Briefcase className="h-5 w-5" />, color: "text-blue-600" },
    { label: "Shortlisted", value: overview?.shortlisted ?? "—", icon: <CheckCircle2 className="h-5 w-5" />, color: "text-amber-600" },
    { label: "Time Saved (unmeasured)", value: overview?.screening_time_saved || "—", icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-600" },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics & Insights</h2>
        <p className="text-muted-foreground mt-1">Real-time recruitment metrics derived from your talent database.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardContent className="py-5 px-5">
              <div className={`${color} mb-3`}>{icon}</div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Roles */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Candidate Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rolesData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={130} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Candidates" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution Pie */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Resume Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), "Resumes"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Candidate Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companiesData} margin={{ top: 8, right: 8, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Candidates" fill="hsl(142,60%,45%)" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resume Length Distribution */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Resume Length Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lengthData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Resumes" fill="hsl(38,90%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
