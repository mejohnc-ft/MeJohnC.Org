import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';

const Projects = () => {
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
      description: "Internal dashboard for monitoring token usage, latency, and cost across agentic workflows. Tracks ROI per automation.",
      impact: "Real-time cost visibility",
      tech: ["TypeScript", "Observability", "n8n"],
      featured: false
    },
    {
      title: "Inventory & Shipping Automation",
      description: "Auto-matches device inventory to forms, generates shipping labels via ShipEngine, sends Teams notifications with tracking.",
      impact: "Same-day device shipping",
      tech: ["n8n", "ShipEngine API", "Teams"],
      featured: false
    },
    {
      title: "M365 Compliance Engine",
      description: "Conditional Access, Autopilot provisioning, and compliance policy enforcement across hybrid Entra ID environments.",
      impact: "Standardized compliance baseline",
      tech: ["Intune", "Entra ID", "Autopilot"],
      featured: false
    },
    {
      title: "Eval & Benchmarking Framework",
      description: "Testing harness for LLM-based workflows. Tracks accuracy, latency, and regression across prompt iterations.",
      impact: "Data-driven prompt iteration",
      tech: ["Python", "Evals", "Benchmarking"],
      featured: false
    }
  ];

  const featuredProjects = projects.filter(p => p.featured);
  const otherProjects = projects.filter(p => !p.featured);

  return (
    <section id="projects" className="py-24 bg-card">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            Projects
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
            Things I've Built
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Automation systems, AI workflows, and the infrastructure to run them.
          </p>
        </div>

        {/* Featured projects - larger cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {featuredProjects.map((project, index) => (
            <Card
              key={index}
              className="p-6 border border-border hover:border-primary transition-colors bg-background group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              <p className="text-muted-foreground text-sm mb-4">
                {project.description}
              </p>

              <div className="font-mono text-sm text-primary mb-4">
                {project.impact}
              </div>

              <div className="flex flex-wrap gap-2">
                {project.tech.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-xs border-border"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Other projects - compact grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {otherProjects.map((project, index) => (
            <Card
              key={index}
              className="p-4 border border-border hover:border-primary transition-colors bg-background group cursor-pointer"
            >
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                {project.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {project.tech.slice(0, 2).map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-[10px] px-1.5 py-0 border-border"
                  >
                    {t}
                  </Badge>
                ))}
                {project.tech.length > 2 && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] px-1.5 py-0 border-border"
                  >
                    +{project.tech.length - 2}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
