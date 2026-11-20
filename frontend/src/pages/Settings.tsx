import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User, Bell, Shield, Database, Palette,
  Moon, Sun, Monitor, CheckCircle2, AlertCircle, RefreshCw,
  Save, BrainCircuit
} from "lucide-react";

type ThemeOption = "light" | "dark" | "system";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "system", label: "System & API", icon: Database },
  { id: "security", label: "Security", icon: Shield },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const [theme, setTheme] = useState<ThemeOption>((localStorage.getItem("nexus-theme") as ThemeOption) || "system");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>(() => JSON.parse(localStorage.getItem("nexus-profile") || "null") || {
    name: "Alex Recruiter",
    email: "alex@nexushr.com",
    company: "Acme Corp",
    role: "Senior Recruiter",
    phone: "+1 (555) 000-1234",
  });
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => JSON.parse(localStorage.getItem("nexus-notifications") || "null") || {
    newCandidates: true,
    statusChanges: true,
    jobUpdates: false,
    weeklyReport: true,
    aiInsights: true,
  });
  const [apiUrl, setApiUrl] = useState(localStorage.getItem("nexus-api-url") || "http://localhost:8000/api");

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
  });

  const handleSave = () => {
    // Apply theme
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
    localStorage.setItem("nexus-theme", theme);
    localStorage.setItem("nexus-profile", JSON.stringify(profile));
    localStorage.setItem("nexus-notifications", JSON.stringify(notifications));
    localStorage.setItem("nexus-api-url", apiUrl.replace(/\/$/, ""));
    window.dispatchEvent(new Event("nexus-theme"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-3">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeSection === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="md:col-span-9 space-y-4">

          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile Information</CardTitle>
                <CardDescription>Update your personal and company details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">{profile.role}</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" disabled title="Not available in the local demo">Change Avatar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                    <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                    <Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company</label>
                    <Input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Role / Title</label>
                    <Input value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
                <CardDescription>Customize the look and feel of Nexus HR.</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm font-medium mb-3">Theme Mode</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "system", "dark"] as ThemeOption[]).map(t => (
                      <button key={t} onClick={() => setTheme(t)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === t ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"}`}>
                        {t === "light" ? <Sun className="h-6 w-6" /> : t === "dark" ? <Moon className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                        <span className="text-sm font-medium capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-semibold mb-3">Preview – Current Design System</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Primary</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge>Default</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle>
                <CardDescription>Choose what events trigger notifications.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, val]) => {
                    const labels: Record<string, { label: string; desc: string }> = {
                      newCandidates: { label: "New Candidate Uploads", desc: "Notify when a resume is uploaded and parsed" },
                      statusChanges: { label: "Status Changes", desc: "Notify when a candidate's pipeline status changes" },
                      jobUpdates: { label: "Job Updates", desc: "Notify when a new job is created or modified" },
                      weeklyReport: { label: "Weekly Analytics Report", desc: "Receive weekly summary of recruitment activity" },
                      aiInsights: { label: "AI Screening Insights", desc: "Notify when AI match results are ready" },
                    };
                    return (
                      <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{labels[key]?.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{labels[key]?.desc}</p>
                        </div>
                        <button
                          onClick={() => setNotifications(n => ({ ...n, [key]: !val }))}
                          className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${val ? "bg-primary" : "bg-muted"}`}>
                          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${val ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "system" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> API Configuration</CardTitle>
                  <CardDescription>Configure the Nexus HR AI backend endpoint.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">API Base URL</label>
                    <div className="flex gap-2">
                      <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
                      <Button variant="outline" onClick={async () => { try { const response = await fetch(`${apiUrl.replace(/\/$/, "")}/health`); if (!response.ok) throw new Error(); alert(JSON.stringify(await response.json())); } catch { alert("Cannot reach this API URL"); } }} className="gap-2 shrink-0">
                        <RefreshCw className="h-4 w-4" /> Test
                      </Button>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-4 rounded-xl border ${health ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"}`}>
                    {healthLoading ? (
                      <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : health ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">{healthLoading ? "Checking..." : health ? "Backend Connected" : "Backend Unreachable"}</p>
                      {health && <p className="text-xs text-muted-foreground">{health.candidates?.toLocaleString()} candidates · {health.jobs} jobs · v{health.version}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Database Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Candidates Database", value: `${health?.candidates?.toLocaleString() || "—"} records`, ok: !!health },
                      { label: "Jobs Database", value: `${health?.jobs || "—"} job descriptions`, ok: !!health },
                      { label: "TF-IDF Vector Model", value: health?.tfidf_ready ? "Loaded & Ready" : "Not Available", ok: !!health?.tfidf_ready },
                      { label: "NLP Engine", value: health?.ollama_available ? health.ollama_model : "Ollama unavailable — fallback mode", ok: !!health?.ollama_available },
                    ].map(({ label, value, ok }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{value}</span>
                          <div className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security</CardTitle>
                <CardDescription>Manage your account security settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">Change Password</p>
                  <div className="space-y-3 max-w-sm">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" />
                    <Button variant="outline" size="sm" disabled title="Not available in the local demo">Update Password</Button>
                  </div>
                </div>
                <div className="border-t pt-6">
                  <p className="text-sm font-medium mb-1">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mb-3">Add an extra layer of security to your account.</p>
                  <Button variant="outline" size="sm" disabled title="Not available in the local demo">Enable 2FA</Button>
                </div>
                <div className="border-t pt-6">
                  <p className="text-sm font-medium mb-1 text-destructive">Danger Zone</p>
                  <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all associated data.</p>
                  <Button variant="destructive" size="sm" disabled title="Not available in the local demo">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Settings saved; reload to apply API URL
              </span>
            )}
            <Button onClick={handleSave} className="ml-auto gap-2">
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
