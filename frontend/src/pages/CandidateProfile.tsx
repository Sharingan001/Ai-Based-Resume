import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCandidateById, updateCandidateStatus, reparseCandidate } from "@/api/client";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Mail, Phone, MapPin, Briefcase, GraduationCap,
  BrainCircuit, CheckCircle2, Clock, Calendar, ChevronDown
} from "lucide-react";
import { useState } from "react";

const STATUSES = ["New", "Screening", "Reviewed", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"];
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

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const queryClient = useQueryClient();

  const { data: cand, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => fetchCandidateById(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCandidateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", id] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-stats"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setShowStatusMenu(false);
    },
  });

  const reparseMutation = useMutation({
    mutationFn: () => reparseCandidate(id!),
    onSuccess: () => {
      for (const key of ["candidate", "candidates", "candidate-stats", "overview", "matches"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  if (isError) return <div role="alert" className="p-6 border rounded-lg">Unable to load data. Check the API connection. <button className="underline" onClick={() => refetch()}>Retry</button></div>;

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-6 animate-pulse">
        <div className="h-10 w-40 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!cand) return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-xl font-medium">Candidate not found</p>
      <Button variant="link" asChild className="mt-2"><Link to="/candidates">Back to Candidates</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link to="/candidates"><ChevronLeft className="h-4 w-4" /> Candidates</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{cand.name}</span>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shrink-0">
                {cand.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{cand.name}</h1>
                <p className="text-muted-foreground">{cand.currentRole} · {cand.company}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{cand.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{cand.phone}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{cand.location}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
              {/* Live Status Changer */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(s => !s)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer border ${STATUS_COLORS[cand.status] || "bg-muted text-foreground"}`}
                >
                  Pipeline Status: <strong>{cand.status}</strong>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </button>
                {showStatusMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                    <div className="absolute z-50 mt-1 right-0 w-44 bg-card border rounded-xl shadow-xl py-1 overflow-hidden">
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => statusMutation.mutate(s)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${cand.status === s ? "font-semibold text-primary" : ""}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/ranking?candidate=${encodeURIComponent(id!)}`}>Run AI Match</Link>
              </Button>
              <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
                <div className="bg-muted/50 rounded-lg p-2">
                  <Clock className="h-4 w-4 mx-auto mb-0.5" />
                  <p>{cand.experienceYears} yrs exp</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <Calendar className="h-4 w-4 mx-auto mb-0.5" />
                  <p>{cand.appliedDate}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Timeline */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted ml-3 space-y-6">
                {cand.experience?.length ? (
                  cand.experience.map((exp, i) => (
                    <div key={i} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                      <p className="font-semibold">{exp.role}</p>
                      <p className="text-sm text-primary">{exp.company}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{exp.duration}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">No work history extracted</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cand.education?.length ? (
                <div className="space-y-4">
                  {cand.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{edu.degree}</p>
                        <p className="text-xs text-muted-foreground">{edu.university} · {edu.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No education data extracted</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" /> Extracted profile
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              <p>Recorded category: <strong>{cand.category}</strong>. Extracted experience: <strong>{cand.experienceYears} years</strong>{cand.experienceYears === 0 ? " (unknown or not stated)" : ""}. Skills listed in this profile: <strong>{cand.skills?.slice(0, 3).join(", ") || "not available"}</strong>.</p>
              <p className="mt-3 text-xs text-muted-foreground">{cand.parsed_by === "ollama" ? `Parsed by ${cand.model || "Qwen"}; source text checked.` : cand.parsed_by === "regex_fallback" ? "Regex fallback — manual review needed." : "Existing seed profile — extraction provenance is unverified."}</p>
              {cand.extraction_warnings?.map(warning => <p key={warning} className="mt-3 text-xs text-amber-700 dark:text-amber-200">{warning}</p>)}
              <Button className="mt-4 w-full" variant="outline" size="sm" disabled={reparseMutation.isPending} onClick={() => reparseMutation.mutate()}>{reparseMutation.isPending ? "Checking source with Qwen…" : "Re-extract with Qwen"}</Button>
              {reparseMutation.isError && <p role="alert" className="mt-3 text-xs text-destructive">{(reparseMutation.error as any)?.response?.data?.detail || "Extraction failed. Existing profile was preserved."}</p>}
              {reparseMutation.isSuccess && <p role="status" className="mt-3 text-xs text-primary">Profile re-extracted from the original resume.</p>}
              {cand.filename && (
                <p className="mt-3 text-xs text-muted-foreground">Source: {cand.filename}</p>
              )}
              <div className="mt-4 pt-3 border-t border-primary/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recorded category</p>
                <Badge className="w-full justify-center py-1">{cand.category}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Extracted Skills ({cand.skills?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cand.skills?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {cand.skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills detected in resume text</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
