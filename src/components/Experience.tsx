import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const Experience = () => {
  const experiences = [
    {
      title: "AI Automation Engineer II",
      company: "centrexIT",
      period: "2023 — Present",
      highlights: [
        "Designed agentic workflows in n8n, Make.com, and Power Automate—reduced provisioning time by 70%",
        "Built AI-driven service desk triage using custom LLM pipelines, cutting manual routing by 60%",
        "Developed internal tools with Graph API, PowerShell, and OCR for automated intake processing",
        "Containerized workflows with Docker on Proxmox; maintained M365/Entra/Intune integrations at scale"
      ],
      tech: ["n8n", "Make.com", "Graph API", "Docker", "LLMs", "PowerShell"]
    },
    {
      title: "Field Support Engineer II",
      company: "centrexIT",
      period: "2024 — Present",
      highlights: [
        "Frontline support for 6,000+ users across dozens of clients—99.8% CSAT, strict SLA adherence",
        "On-site infrastructure: switches, firewalls, racks, CCTV, Wi-Fi deployments",
        "Cross-functional coordination on field automation and multi-site upgrade projects"
      ],
      tech: ["Networking", "Hardware", "CCTV", "Multi-site Ops"]
    },
    {
      title: "Provisioning Engineer",
      company: "centrexIT",
      period: "2022 — 2024",
      highlights: [
        "Led endpoint provisioning across hybrid environments—Intune, SCCM, Entra ID",
        "Architected Autopilot + Conditional Access deployment pipelines",
        "Authored SOPs and training materials used across all departments"
      ],
      tech: ["Intune", "SCCM", "Entra ID", "Autopilot", "Azure AD"]
    },
    {
      title: "Service Technician I",
      company: "Safemark",
      period: "2018 — 2021",
      highlights: [
        "Technical support for mobility and physical security systems",
        "Windows deployments, device configurations, field repairs"
      ],
      tech: ["Windows", "Security Systems", "Hardware"]
    }
  ];

  return (
    <section id="experience" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            Experience
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2">
            Work History
          </h2>
        </div>

        {/* Timeline */}
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div key={index} className="relative">
              {/* Timeline line */}
              {index !== experiences.length - 1 && (
                <div className="absolute left-0 top-8 w-px h-full bg-border" />
              )}

              <div className="flex gap-8">
                {/* Date column */}
                <div className="w-32 flex-shrink-0">
                  <span className="font-mono text-sm text-muted-foreground">
                    {exp.period}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pb-12">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {exp.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {exp.company}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {exp.highlights.map((highlight, i) => (
                      <li key={i} className="text-muted-foreground text-sm pl-4 border-l border-border">
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    {exp.tech.map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="font-mono text-xs border-border"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {index !== experiences.length - 1 && <Separator className="mt-0" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
