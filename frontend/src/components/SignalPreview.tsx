import { useQuery } from "@tanstack/react-query"
import { fetchOverview } from "@/api/client"

export function SignalPreview() {
  const { data } = useQuery({ queryKey: ["overview"], queryFn: fetchOverview })
  return <div className="signal-panel">
    <div className="signal-panel-bar"><span className="eyebrow text-foreground">Talent intelligence / overview</span><span className="eyebrow hidden sm:block">Workflow preview</span></div>
    <div className="signal-grid">
      <div className="signal-stats">{[{label:"Talent pool",value:data?.total_candidates?.toLocaleString() ?? "—"},{label:"Open roles",value:data?.active_jobs ?? "—"},{label:"In pipeline",value:data?.shortlisted ?? "—"}].map(item => <div key={item.label}><div className="eyebrow">{item.label}</div><div className="signal-stat-value">{item.value}</div></div>)}</div>
      <div className="signal-chart">
        <div className="flex items-center justify-between"><span className="eyebrow">Candidate / role alignment</span><span className="eyebrow text-teal-300">Illustrative</span></div>
        <svg viewBox="0 0 600 240" role="img" aria-label="Illustration of candidate and role signals converging">
          <defs><linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78ccc3" stopOpacity=".16"/><stop offset="100%" stopColor="#78ccc3" stopOpacity="0"/></linearGradient></defs>
          {[40,90,140,190,230].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#ffffff" strokeOpacity=".045"/>)}
          {[0,100,200,300,400,500,600].map(x => <line key={x} x1={x} y1="30" x2={x} y2="230" stroke="#ffffff" strokeOpacity=".045"/>)}
          <path d="M0 208 C70 208 105 190 150 145 S225 68 275 103 S355 225 415 195 S500 100 600 66 L600 240 L0 240Z" fill="url(#signalFill)"/>
          <path className="chart-line chart-secondary" d="M0 190 L48 182 L85 195 L130 170 L180 188 L230 160 L277 183 L320 109 L365 55 L410 150 L450 180 L500 125 L545 155 L600 120" fill="none" stroke="#8777c5" strokeWidth="1.4" opacity=".65"/>
          <path className="chart-line" d="M0 208 C70 208 105 190 150 145 S225 68 275 103 S355 225 415 195 S500 100 600 66" fill="none" stroke="#78ccc3" strokeWidth="2"/>
          <circle cx="275" cy="103" r="4" fill="#78ccc3"/><text x="290" y="91" fill="#78ccc3" fontSize="9" fontFamily="monospace">SKILL_ALIGNMENT</text>
        </svg>
        <div className="flex justify-between eyebrow"><span>Resume</span><span>Skills</span><span>Experience</span><span>Role</span></div>
      </div>
      <div className="signal-summary"><div className="eyebrow">One connected workflow</div>{["Parse your resumes","Discover the right skills","Compare role alignment"].map(label => <div className="signal-row" key={label}><span><span className="signal-dot"/>{label}</span></div>)}<div className="eyebrow mt-7">Built for human review</div><p className="text-xs text-muted-foreground mt-3 leading-relaxed">Clear scoring. Visible reasoning. Every decision stays with you.</p></div>
    </div>
  </div>
}
