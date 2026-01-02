import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const Skills = () => {
  const skillCategories = [
    {
      title: "AI & Agents",
      skills: [
        "Claude Code",
        "Agentic Workflows",
        "Tool Use / Function Calling",
        "RAG Systems",
        "Prompt Engineering",
        "RLHF / Tuning",
        "LLM Benchmarking",
        "Cost Optimization"
      ]
    },
    {
      title: "Infrastructure",
      skills: [
        "Azure / Entra ID",
        "Docker / Containers",
        "Proxmox",
        "n8n / Make.com",
        "Graph API",
        "Apple Business Manager",
        "Intune / SCCM",
        "Observability"
      ]
    },
    {
      title: "Development",
      skills: [
        "TypeScript",
        "Python",
        "PowerShell",
        "Bash",
        "REST APIs",
        "React / Next.js",
        "Node.js",
        "Git"
      ]
    },
    {
      title: "Platform",
      skills: [
        "Agent Management Planes",
        "Token Economics",
        "Eval Frameworks",
        "CI/CD Pipelines",
        "HaloPSA / ServiceNow",
        "Process Automation",
        "ITIL",
        "Workflow Design"
      ]
    }
  ];

  const focusAreas = [
    { label: "Agentic Systems", description: "Building autonomous AI agents that reason, plan, and execute" },
    { label: "Cost Measurement", description: "Tracking token usage, latency, and ROI across AI workloads" },
    { label: "Benchmarking", description: "Designing evals and regression tests for AI system quality" }
  ];

  return (
    <section id="skills" className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
            Technical Stack
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Focused on AI agents, automation infrastructure, and the tooling
            that makes agentic systems reliable and cost-effective.
          </p>
        </div>

        {/* Focus areas */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {focusAreas.map((area, index) => (
            <div
              key={index}
              className="p-6 border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-mono text-sm text-primary uppercase tracking-wider mb-2">
                {area.label}
              </h3>
              <p className="text-muted-foreground text-sm">
                {area.description}
              </p>
            </div>
          ))}
        </div>

        <Separator className="mb-16" />

        {/* Skills grid */}
        <div className="grid md:grid-cols-2 gap-12">
          {skillCategories.map((category, index) => (
            <div key={index}>
              <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <Badge
                    key={skillIndex}
                    variant="outline"
                    className="font-mono text-xs px-3 py-1.5 border-border hover:border-primary hover:text-primary transition-colors cursor-default"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
