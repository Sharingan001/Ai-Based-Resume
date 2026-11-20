import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCandidates, fetchCandidateStats, updateCandidateStatus } from "@/api/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, ChevronLeft, ChevronRight, Eye, ChevronDown,
  Users, Clock, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

const STATUSES = ["All", "New", "Screening", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"];
const PAGE_SIZE = 15;

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Screening: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Reviewed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Shortlisted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Interview: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Hired: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function Candidates() {
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState(new URLSearchParams(window.location.search).get("search") || "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const search = useDebounce(rawSearch, 400);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidates", page, statusFilter, search],
    queryFn: () =>
      fetchCandidates(page, PAGE_SIZE, statusFilter === "All" ? undefined : statusFilter, search || undefined),
  });

  const { data: stats } = useQuery({ queryKey: ["candidate-stats"], queryFn: fetchCandidateStats });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateCandidateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-stats"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-stats"] });
      setShowStatusMenu(null);
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    statusMutation.mutate({ id, status });
  };

  if (isError) return <div role="alert" className="p-6 border rounded-lg">Unable to load data. Check the API connection. <button className="underline" onClick={() => refetch()}>Retry</button></div>;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
          <p className="text-muted-foreground mt-1">Manage and screen your entire talent pool.</p>
        </div>
        <Button asChild><Link to="/screening">Upload Resumes</Link></Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total || 0, icon: <Users className="h-4 w-4" />, color: "text-foreground" },
          { label: "New", value: stats?.status_counts?.New || 0, icon: <Clock className="h-4 w-4" />, color: "text-blue-600" },
          { label: "Shortlisted", value: (stats?.status_counts?.Shortlisted || 0) + (stats?.status_counts?.Interview || 0), icon: <CheckCircle2 className="h-4 w-4" />, color: "text-amber-600" },
          { label: "Hired", value: stats?.status_counts?.Hired || 0, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardContent className="py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
              </div>
              <div className={`${color} opacity-60`}>{icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, role, skills..."
            className="pl-9"
            value={rawSearch}
            onChange={e => { setRawSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-muted hover:border-primary/40 hover:text-foreground"}`}
            >
              {s} {s !== "All" && stats?.status_counts?.[s] ? `(${stats.status_counts[s]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Candidate</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Exp</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Applied</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="h-14">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  </TableCell>
                </TableRow>
              ))
            ) : !data?.candidates?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                  {rawSearch || statusFilter !== "All" ? "No candidates match your filters." : "No candidates found."}
                </TableCell>
              </TableRow>
            ) : (
              data.candidates.map((cand: any) => (
                <TableRow key={cand.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {cand.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-none">{cand.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cand.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium leading-none">{cand.currentRole}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cand.location}</p>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{cand.experienceYears}y</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cand.skills?.slice(0, 2).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 font-normal">{s}</Badge>
                      ))}
                      {cand.skills?.length > 2 && <span className="text-xs text-muted-foreground">+{cand.skills.length - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{cand.category}</span>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusMenu(showStatusMenu === cand.id ? null : cand.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[cand.status] || "bg-muted text-muted-foreground"}`}
                      >
                        {cand.status}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showStatusMenu === cand.id && (
                        <div className="absolute z-50 mt-1 left-0 w-36 bg-card border rounded-lg shadow-xl py-1">
                          {STATUSES.filter(s => s !== "All").map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(cand.id, s)}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${cand.status === s ? "font-semibold text-primary" : "text-foreground"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {cand.appliedDate}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                      <Link to={`/candidates/${cand.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/10">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, data.total)} of ${data.total.toLocaleString()} candidates` : "—"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || isLoading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Close status dropdown on outside click */}
      {showStatusMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(null)} />
      )}
    </div>
  );
}
