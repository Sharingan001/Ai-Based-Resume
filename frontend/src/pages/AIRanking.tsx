import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs, fetchMatches, Job, MatchResult, fetchUploadedResumes, fetchResumeMatches, fetchCandidateById } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit, Sparkles, Briefcase, Upload, Clock, MapPin,
  Download, RefreshCw, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
  return "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900";
}

interface ScoreBarProps { label: string; val: number; color: string; }
function ScoreBar({ label, val, color }: ScoreBarProps) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-semibold">{Math.round(val)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={["h-1.5 rounded-full transition-all duration-500", color].join(" ")}
          style={{ width: `${Math.min(val, 100)}%` }}
        />
      </div>
    </div>
  );
}

function exportCSV(matches: MatchResult[]) {
  const header = "Rank,Name,Role,Experience,Location,Score,Semantic,Skills,Experience Score,Education,Reasoning";
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = matches.map((m, i) =>
    [
      i + 1,
      cell(m.candidate.name),
      cell(m.candidate.currentRole),
      m.candidate.experienceYears,
      cell(m.candidate.location),
      m.overallMatch,
      m.breakdown.semantic,
      m.breakdown.skills,
      m.breakdown.experience,
      m.breakdown.education,
      cell(m.aiReasoning),
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ai_ranking_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const SCORE_WEIGHTS = [
  { icon: "🧠", label: "Text Similarity",  desc: "TF-IDF cosine similarity (55%)" },
  { icon: "🔧", label: "Skill Overlap",   desc: "Required + preferred skills (25%)" },
  { icon: "⏱", label: "Experience",      desc: "Years of relevant experience (10%)" },
  { icon: "🎓", label: "Education",       desc: "Degree level scoring (10%)" },
];

function JobCandidateRanking() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("job"));
  const [topN, setTopN] = useState(20);
  const [source, setSource] = useState<"uploaded" | "all">("uploaded");

  const { data: jobs, isLoading: jobsLoading, isError: jobsError, refetch: reloadJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  const {
    data: matches,
    isLoading: isMatching,
    isError: matchError,
    error: matchErrorObj,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ["matches", selectedJobId, topN, source],
    queryFn: () => fetchMatches(selectedJobId!, topN, source),
    enabled: !!selectedJobId,
    retry: 1,
    staleTime: 30_000,
  });

  const selectedJob = jobs?.find((j: Job) => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Ranking</h2>
          <p className="text-muted-foreground mt-1">
            Rank uploaded resumes for a job. Choose the full pool to include demonstration profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/screening">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Resumes
            </Button>
          </Link>
          {matches && matches.length > 0 && (
            <Button
              variant="default"
              className="gap-2"
              onClick={() => exportCSV(matches)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[calc(100vh-13rem)] min-h-[560px]">
        {/* Left: Job Selector + Top-N */}
        <div className="md:col-span-4 flex flex-col gap-4 overflow-hidden max-h-[420px] md:max-h-none">
          <label className="text-sm font-medium">Candidate pool
            <select aria-label="Candidate pool" className="mt-2 w-full rounded-lg border bg-card p-2" value={source} onChange={event => setSource(event.target.value as "uploaded" | "all")}>
              <option value="uploaded">Uploaded resumes only</option><option value="all">All candidates (includes demo data)</option>
            </select>
          </label>
          {jobsError && <p role="alert">Could not load jobs. <button onClick={() => reloadJobs()} className="underline">Retry</button></p>}
          {/* Top-N Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground font-medium">Show Top</span>
            {[10, 20, 50].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={[
                  "px-3 py-1 rounded-lg text-sm border font-medium transition-colors",
                  topN === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-muted-foreground/30 hover:bg-muted",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Job List */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin flex-1">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider shrink-0">
              Select Job
            </h3>
            {jobsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))
              : jobs?.map((job: Job) => (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedJobId(job.id); }}
                    onClick={() => setSelectedJobId(job.id)}
                    className={[
                      "p-4 rounded-xl border transition-all cursor-pointer",
                      selectedJobId === job.id
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "bg-card hover:border-primary/40 hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <div className="font-medium text-sm leading-snug">{job.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>{job.department}</span>
                      <span>{job.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.requiredSkills?.slice(0, 3).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[9px] px-1 py-0 font-normal"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Right: Results */}
        <div className="md:col-span-8 min-h-[400px] flex flex-col bg-muted/20 rounded-xl border overflow-hidden">
          {!selectedJobId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center">
              <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
                <BrainCircuit className="h-10 w-10 opacity-30" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xl">Select a job to run AI ranking</p>
                <p className="text-sm max-w-xs mt-2">
                  Nexus HR scores the selected candidate pool using TF-IDF text similarity, skill overlap,
                  experience, and education signals.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-left max-w-sm w-full">
                {SCORE_WEIGHTS.map(({ icon, label, desc }) => (
                  <div key={label} className="bg-card border rounded-lg p-2.5 flex gap-2">
                    <span className="text-base">{icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isMatching ? (
            /* Loading state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
                <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-2 animate-bounce" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Ranking candidates for</p>
                <p className="text-primary font-bold">{selectedJob?.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  TF-IDF semantic matching + skill overlap + education scoring
                </p>
              </div>
            </div>
          ) : matchError ? (
            /* Error state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <div className="text-center">
                <p className="font-semibold text-lg text-red-600 dark:text-red-400">Match Failed</p>
                <p className="text-sm text-muted-foreground max-w-xs mt-2">
                  {(matchErrorObj as any)?.response?.data?.detail ||
                    (matchErrorObj as any)?.message ||
                    "Could not reach backend. Make sure the API server is running on port 8000."}
                </p>
              </div>
              <Button onClick={() => refetchMatches()} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Retry Match
              </Button>
            </div>
          ) : (
            /* Results */
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b px-5 py-3 flex items-center justify-between z-10">
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Top Matches — <span className="text-primary">{selectedJob?.title}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{matches?.length} ranked</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => refetchMatches()}
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                  {matches && matches.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => exportCSV(matches)}
                    >
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {matches?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <BrainCircuit className="h-10 w-10 opacity-20" />
                    <p>No resumes in the selected pool. Upload a resume or select All candidates.</p>
                  </div>
                ) : (
                  matches?.map((match: MatchResult, idx: number) => (
                    <div
                      key={match.candidate.id}
                      className="bg-card border rounded-xl overflow-hidden flex group hover:border-primary/40 transition-colors"
                    >
                      {/* Score */}
                      <div
                        className={[
                          "w-20 flex flex-col items-center justify-center p-3 border-r shrink-0",
                          getScoreColor(match.overallMatch),
                        ].join(" ")}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-0.5">
                          Score
                        </div>
                        <div className="text-3xl font-black tabular-nums">
                          {Math.round(match.overallMatch)}
                        </div>
                        <div className="text-[9px] font-medium mt-0.5 opacity-70">#{idx + 1}</div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold truncate">{match.candidate.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {match.candidate.currentRole}
                              </span>
                              {match.candidate.experienceYears > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {match.candidate.experienceYears}y exp
                                </span>
                              )}
                              {match.candidate.location && match.candidate.location !== "N/A" && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {match.candidate.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            asChild
                          >
                            <Link to={`/candidates/${match.candidate.id}`}>Profile</Link>
                          </Button>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.candidate.skills.slice(0, 5).map((s: string) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] px-1.5 font-normal"
                            >
                              {s}
                            </Badge>
                          ))}
                          {match.candidate.skills.length > 5 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 font-normal text-muted-foreground"
                            >
                              +{match.candidate.skills.length - 5}
                            </Badge>
                          )}
                        </div>

                        {/* Score breakdown bars */}
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          <ScoreBar label="Text similarity"   val={match.breakdown.semantic}   color="bg-blue-500" />
                          <ScoreBar label="Skills"     val={match.breakdown.skills}     color="bg-violet-500" />
                          <ScoreBar label="Experience" val={match.breakdown.experience} color="bg-amber-500" />
                          <ScoreBar label="Education"  val={match.breakdown.education}  color="bg-emerald-500" />
                        </div>

                        {/* AI Reasoning */}
                        <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                          {match.aiReasoning}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ResumeJobMatches() {
  const requestedId = new URLSearchParams(window.location.search).get("candidate");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const uploads = useQuery({ queryKey: ["candidates", "uploaded-resumes"], queryFn: fetchUploadedResumes, staleTime: 0, refetchOnWindowFocus: true });
  const focused = useQuery({ queryKey: ["candidate", requestedId], queryFn: () => fetchCandidateById(requestedId!), enabled: !!requestedId });
  const choices = focused.data ? [focused.data, ...(uploads.data || []).filter(candidate => candidate.id !== focused.data!.id)] : uploads.data || [];
  const candidateId = selectedId || requestedId || choices[0]?.id;
  const candidate = choices.find(item => item.id === candidateId);
  const results = useQuery({ queryKey: ["matches", "resume", candidateId], queryFn: () => fetchResumeMatches(candidateId!), enabled: !!candidateId, staleTime: 0, refetchOnWindowFocus: true });
  const visible = (results.data || []).filter(match => `${match.job.title} ${match.job.department} ${match.job.requiredSkills.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4 items-start"><div><h2 className="text-3xl font-semibold tracking-tight">Your resume matchups</h2><p className="text-sm text-muted-foreground mt-2">Choose your resume to see how it matches each active job. Demo candidates do not compete in this view.</p>{results.data && <a href="#resume-job-results" className="inline-block mt-3 text-sm font-medium text-primary underline underline-offset-4">View {results.data.length} job matchups</a>}</div><Button asChild variant="outline"><Link to="/screening">Upload a resume</Link></Button></div>
    {(uploads.isError || focused.isError) && <div role="alert" className="rounded-xl border p-4">Could not load the selected resume. <Button variant="link" onClick={() => { uploads.refetch(); if (requestedId) focused.refetch(); }}>Retry</Button></div>}
    {uploads.isLoading || (requestedId && focused.isLoading) ? <p role="status">Loading your resumes…</p> : choices.length ? <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
      <div className="nexus-card rounded-xl border p-5 space-y-5 lg:sticky lg:top-24">
        <label className="block text-sm font-medium" htmlFor="resume-choice">Resume to match</label>
        <select id="resume-choice" className="w-full rounded-lg border bg-card p-3 text-sm" value={candidateId || ""} onChange={event => setSelectedId(event.target.value)}>{choices.map(item => <option key={item.id} value={item.id}>{item.name} — {item.filename || item.id}</option>)}</select>
        {candidate && <><div><p className="font-semibold">{candidate.name}</p><p className="text-sm text-muted-foreground mt-1 break-words">{candidate.filename || candidate.currentRole}</p></div><div className="flex flex-wrap gap-1.5">{candidate.skills.slice(0, 12).map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div><p className="text-xs text-muted-foreground leading-relaxed">Scores compare this resume with each job. A low score stays visible. Review the required skills before drawing conclusions.</p></>}
        <Button className="w-full" disabled={results.isFetching} onClick={() => results.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${results.isFetching ? "animate-spin" : ""}`} />{results.isFetching ? "Matching…" : "Run AI Match"}</Button>
        {candidateId && <Link className="block text-sm underline underline-offset-4 text-muted-foreground" to={`/candidates/${candidateId}`}>Review extracted profile</Link>}
      </div>
      <div id="resume-job-results" className="space-y-4 min-w-0 scroll-mt-24">
        <label className="block"><span className="text-sm font-medium">Filter job matches</span><Input className="mt-2" placeholder="Search a job title, department or skill" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {results.isError ? <div role="alert" className="border rounded-xl p-5">Matching failed: {(results.error as any)?.response?.data?.detail || results.error.message}<Button variant="link" onClick={() => results.refetch()}>Retry</Button></div> : results.isLoading ? <div role="status" className="nexus-card border rounded-xl p-12 text-center"><BrainCircuit className="mx-auto mb-4 h-9 w-9 text-primary animate-pulse"/>Comparing your resume with active jobs…</div> : <>
          <p aria-live="polite" className="text-sm text-muted-foreground">{visible.length} of {results.data?.length || 0} job matches{results.isFetching ? " · Updating scores…" : ""}</p>
          {!visible.length && <div className="nexus-card rounded-xl border p-8 text-center"><p>{results.data?.length ? "No jobs match this search. Clear the filter to see all matchups." : "There are no active jobs to compare yet."}</p>{!results.data?.length && <Button asChild className="mt-4"><Link to="/jobs">View or create jobs</Link></Button>}</div>}
          {visible.map((match) => <article key={match.job.id} className="nexus-card rounded-xl border p-5 space-y-4">
            <div className="flex justify-between items-start gap-4"><div><h3 className="font-semibold text-lg">{match.job.title}</h3><p className="mt-1 text-sm text-muted-foreground">{match.job.department} · {match.job.location} · {match.job.experienceRequired}</p></div><div className="shrink-0 text-right"><p className="text-2xl font-bold text-primary tabular-nums">{match.overallMatch.toFixed(1)}<span className="text-xs text-muted-foreground"> / 100</span></p><p className="text-xs text-muted-foreground">Match score</p></div></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><ScoreBar label="Text similarity" val={match.breakdown.semantic} color="bg-blue-500"/><ScoreBar label="Skills" val={match.breakdown.skills} color="bg-violet-500"/><ScoreBar label="Experience" val={match.breakdown.experience} color="bg-amber-500"/><ScoreBar label="Education" val={match.breakdown.education} color="bg-teal-500"/></div>
            <div className="text-sm"><p className="text-muted-foreground">Matched skills: <span className="text-foreground">{match.matchedSkills?.join(", ") || "None of the listed skills"}</span></p><p className="mt-1 text-muted-foreground">Missing required skills: <span className="text-foreground">{match.missingSkills?.join(", ") || "None"}</span></p></div>
            <p className="text-xs leading-relaxed text-muted-foreground">{match.aiReasoning}</p>
          </article>)}
        </>}
      </div>
    </div> : !uploads.isError && <div className="nexus-card border rounded-xl p-12 text-center space-y-4"><Upload className="h-10 w-10 mx-auto text-muted-foreground"/><h3 className="text-xl font-semibold">Upload your resume to see job matches</h3><p className="text-sm text-muted-foreground">Your uploads will appear here automatically. You can also open any candidate profile and choose Run AI Match.</p><Button asChild><Link to="/screening">Upload resume</Link></Button></div>}
  </div>;
}

export default function AIRanking() {
  const params = new URLSearchParams(window.location.search);
  const jobMode = params.get("mode") === "job" || params.has("job");
  return <div className="space-y-6"><nav aria-label="Matching mode" className="flex flex-wrap gap-2"><Button asChild variant={jobMode ? "outline" : "default"}><Link to="/ranking">My resume → jobs</Link></Button><Button asChild variant={jobMode ? "default" : "outline"}><Link to="/ranking?mode=job">Job → candidates</Link></Button></nav>{jobMode ? <JobCandidateRanking/> : <ResumeJobMatches/>}</div>;
}
