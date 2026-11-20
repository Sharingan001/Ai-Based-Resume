import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, createJob, Job } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, MapPin, Briefcase, Calendar, ChevronRight, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "Operations", "Data Science", "HR"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

export default function Jobs() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: "", department: "Engineering", location: "Remote",
    type: "Full-time", experienceRequired: "3+ years",
    requiredSkills: [] as string[], preferredSkills: [] as string[],
    description: "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [prefSkillInput, setPrefSkillInput] = useState("");
  const queryClient = useQueryClient();

  const { data: jobs, isLoading, isError, refetch } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setShowCreateModal(false);
      setForm({ title: "", department: "Engineering", location: "Remote", type: "Full-time", experienceRequired: "3+ years", requiredSkills: [], preferredSkills: [], description: "" });
    },
  });

  const addSkill = (type: "req" | "pref") => {
    const val = type === "req" ? skillInput.trim() : prefSkillInput.trim();
    if (!val) return;
    if (type === "req") { setForm(f => ({ ...f, requiredSkills: [...new Set([...f.requiredSkills, val])] })); setSkillInput(""); }
    else { setForm(f => ({ ...f, preferredSkills: [...new Set([...f.preferredSkills, val])] })); setPrefSkillInput(""); }
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    createMutation.mutate(form);
  };

  if (isError) return <div role="alert" className="p-6 border rounded-lg">Unable to load data. Check the API connection. <button className="underline" onClick={() => refetch()}>Retry</button></div>;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Descriptions</h2>
          <p className="text-muted-foreground mt-1">Manage open requisitions and screening criteria.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create New Job
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {jobs?.map((job: Job) => (
          <Card key={job.id} className="flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription className="mt-1.5 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.type}</span>
                  </CardDescription>
                </div>
                <Badge variant={job.status === "Active" ? "default" : "secondary"}>{job.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills?.map(s => (
                      <Badge key={s} variant="outline" className="font-normal text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                {job.preferredSkills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Preferred Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.preferredSkills.map(s => (
                        <Badge key={s} variant="secondary" className="font-normal text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-3">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /><span className="font-medium text-foreground">{job.activeCandidates}</span> candidates</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Posted {job.postedDate}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 py-3 gap-2">
              <Button variant="ghost" size="sm" className="flex-1 justify-between text-muted-foreground hover:text-foreground" asChild>
                <Link to={`/ranking?job=${encodeURIComponent(job.id)}`}>
                  Run AI Screen <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="glass-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
              <h3 className="text-xl font-bold">Create New Job</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Job Title *</label>
                  <Input placeholder="e.g. Senior Data Scientist" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Department</label>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <Input placeholder="e.g. Bangalore / Remote" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Experience Required</label>
                    <Input placeholder="e.g. 3+ years" value={form.experienceRequired} onChange={e => setForm(f => ({ ...f, experienceRequired: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Required Skills</label>
                  <div className="flex gap-2">
                    <Input placeholder="Type a skill and press Enter" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill("req")} />
                    <Button type="button" variant="outline" onClick={() => addSkill("req")}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.requiredSkills.map(s => (
                      <Badge key={s} variant="default" className="gap-1 cursor-pointer" onClick={() => setForm(f => ({ ...f, requiredSkills: f.requiredSkills.filter(x => x !== s) }))}>
                        {s} <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Preferred Skills</label>
                  <div className="flex gap-2">
                    <Input placeholder="Type a skill and press Enter" value={prefSkillInput} onChange={e => setPrefSkillInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill("pref")} />
                    <Button type="button" variant="outline" onClick={() => addSkill("pref")}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.preferredSkills.map(s => (
                      <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setForm(f => ({ ...f, preferredSkills: f.preferredSkills.filter(x => x !== s) }))}>
                        {s} <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Job Description *</label>
                  <textarea
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-card">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.title || !form.description}>
                {createMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
