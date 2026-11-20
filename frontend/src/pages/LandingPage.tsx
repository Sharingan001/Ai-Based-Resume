import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { ScanLine, GitCompareArrows, ChartNoAxesCombined, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignalPreview } from "@/components/SignalPreview"

const entrance = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }
const timing = { duration: .85, ease: [.22, 1, .36, 1] as const }

export default function LandingPage() {
  return <div className="landing dark min-h-screen">
    <header className="landing-wrap landing-nav">
      <Link to="/" className="flex items-center gap-3 font-semibold text-lg tracking-tight" aria-label="Nexus HR home"><span className="brand-mark">N</span>Nexus HR</Link>
      <nav className="hidden md:flex items-center gap-7 text-[13px] text-muted-foreground"><a href="#platform" className="hover:text-foreground transition-colors">Platform</a><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link><a href="#workflow" className="hover:text-foreground transition-colors">How it works</a></nav>
      <Button className="primary-cta" size="sm" asChild><Link to="/dashboard">Open workspace</Link></Button>
    </header>
    <main className="landing-wrap">
      <motion.section className="landing-hero" initial="hidden" animate="visible" transition={{ staggerChildren: .1 }}>
        <motion.div variants={entrance} transition={timing} className="eyebrow flex items-center gap-3"><span className="w-5 h-px bg-teal-300"/>A clearer view of talent</motion.div>
        <motion.h1 variants={entrance} transition={timing}>Less noise.<br/>More <span>human potential.</span></motion.h1>
        <motion.p variants={entrance} transition={timing}>Turn scattered resumes into a focused view of your next hire. One calm workspace to discover skills, compare candidates, and move your team forward.</motion.p>
        <motion.div variants={entrance} transition={timing} className="hero-actions"><Button size="lg" className="primary-cta" asChild><Link to="/screening">Start screening</Link></Button><Button size="lg" variant="outline" asChild><Link to="/ranking">Explore matching</Link></Button></motion.div>
        <motion.div variants={entrance} transition={timing} className="mt-12 flex flex-wrap gap-x-7 gap-y-3 eyebrow"><span>Local AI processing</span><span>Explainable scoring</span><span>Your decision, always</span></motion.div>
      </motion.section>
      <motion.section id="platform" initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.1}} transition={{...timing,delay:.15}}><SignalPreview/></motion.section>
      <section id="workflow" className="landing-section">
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={timing}><div className="eyebrow mb-5">From first impression to clear perspective</div><h2>A focused workflow.<br/><span className="text-muted-foreground">A little more clarity at every step.</span></h2></motion.div>
        <div className="feature-grid">{[
          {icon:ScanLine,title:"See the person behind the page.",description:"Upload a resume and bring skills, experience, and education into one readable profile.",href:"/screening",label:"Resume screening"},
          {icon:GitCompareArrows,title:"Find where potential aligns.",description:"Compare your talent pool against a role with transparent scores and understandable reasoning.",href:"/ranking",label:"Candidate matching"},
          {icon:ChartNoAxesCombined,title:"Keep the bigger picture clear.",description:"Explore your talent pool, follow candidate stages, and keep the next step in sight.",href:"/analytics",label:"Recruitment insights"}
        ].map(({icon:Icon,title,description,href,label}) => <motion.div key={title} className="feature-item" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={timing}><Icon className="w-6 h-6 text-teal-200" strokeWidth={1.2}/><h3>{title}</h3><p>{description}</p><Link className="inline-block text-sm text-foreground mt-7 underline underline-offset-4 decoration-white/20 hover:decoration-teal-300 transition-colors" to={href}>{label}</Link></motion.div>)}</div>
      </section>
      <section className="landing-section flex flex-col md:flex-row md:items-end justify-between gap-8"><div><Layers className="text-muted-foreground h-6 w-6 mb-6" strokeWidth={1.2}/><h2>Make room for better<br/><span className="text-muted-foreground">hiring conversations.</span></h2></div><Button size="lg" className="primary-cta" asChild><Link to="/dashboard">Enter your workspace</Link></Button></section>
    </main>
    <footer className="landing-wrap landing-footer"><span>NEXUS HR / TALENT INTELLIGENCE</span><span>Local workspace · Built for thoughtful decisions</span><span>© {new Date().getFullYear()} Nexus HR</span></footer>
  </div>
}
