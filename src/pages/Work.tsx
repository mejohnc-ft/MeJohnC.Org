import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PageTransition, { fadeInUp, staggerContainer } from '@/components/PageTransition';

const Work = () => {
  const projects = [
    {
      title: "Automated User Provisioning Pipeline",
      description: "End-to-end onboarding workflow: parses intake forms (PDF/Word/plaintext), extracts data via OCR, routes by client ID, provisions through Graph API.",
      impact: "70% reduction in provisioning time",
      tech: ["n8n", "Graph API", "OCR", "HaloPSA"],
      featured: true
    },
    {
      title: "AI Service Desk Triage",
      description: "Voice assistant that transcribes calls, summarizes issues via LLM, and creates structured tickets in HaloPSA with minimal human input.",
      impact: "60% faster ticket routing",
      tech: ["Whisper.cpp", "LLM", "Python", "HaloPSA API"],
      featured: true
    },
    {
      title: "Agent Cost Tracker",
      description: "Internal dashboard for monitoring token usage, latency, and cost across agentic workflows.",
      tech: ["TypeScript", "Observability", "n8n"],
      featured: false
    },
    {
      title: "Eval & Benchmarking Framework",
      description: "Testing harness for LLM-based workflows. Tracks accuracy, latency, and regression.",
      tech: ["Python", "Evals", "Benchmarking"],
      featured: false
    },
  ];

  const caseStudies = [
    {
      metric: "70%",
      title: "Provisioning Automation",
      before: "Manual parsing of intake forms across 20+ client domains",
      after: "End-to-end OCR + Graph API pipeline with zero manual parsing",
    },
    {
      metric: "60%",
      title: "AI Service Desk Triage",
      before: "Tier 1 agents manually transcribed and routed every call",
      after: "LLM-based transcription and auto-ticket creation",
    },
    {
      metric: "2→0",
      title: "Shipping Automation",
      before: "Manual inventory matching and label generation (2 days)",
      after: "Same-day: auto-matched devices, ShipEngine labels, Teams notifications",
    },
  ];

  return (
    <PageTransition>
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-16">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Work
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-foreground mt-2 mb-6">
              Things I've Built
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Automation systems, AI workflows, and the infrastructure to run them.
            </p>
          </motion.div>

          {/* Featured Projects */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-6 mb-16"
          >
            {projects.filter(p => p.featured).map((project, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-6 h-full border border-border hover:border-primary transition-all duration-300 bg-card/50 backdrop-blur-sm group cursor-pointer">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex justify-between items-start mb-4"
                  >
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.div>

                  <p className="text-muted-foreground text-sm mb-4">
                    {project.description}
                  </p>

                  {project.impact && (
                    <div className="font-mono text-sm text-primary mb-4">
                      {project.impact}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((t, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Other Projects */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-24"
          >
            {projects.filter(p => !p.featured).map((project, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-4 border border-border hover:border-primary transition-colors bg-card/50 group cursor-pointer h-full">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {project.tech.slice(0, 2).map((t, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Case Studies */}
          <motion.div variants={fadeInUp} className="mb-12">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Case Studies
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
              Results
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="space-y-12"
          >
            {caseStudies.map((study, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="grid md:grid-cols-[200px_1fr] gap-8 items-start"
              >
                <div>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, type: 'spring' }}
                    className="font-mono text-5xl md:text-6xl font-black text-primary leading-none"
                  >
                    {study.metric}
                  </motion.div>
                  <div className="text-sm text-muted-foreground mt-2">improvement</div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{study.title}</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border-l-2 border-muted pl-4">
                      <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Before</div>
                      <p className="text-muted-foreground text-sm">{study.before}</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <div className="font-mono text-xs text-primary uppercase tracking-wider mb-1">After</div>
                      <p className="text-foreground text-sm">{study.after}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
};

export default Work;
