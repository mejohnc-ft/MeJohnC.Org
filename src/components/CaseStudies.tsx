import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const CaseStudies = () => {
  const caseStudies = [
    {
      metric: "70%",
      title: "Provisioning Automation",
      before: "Manual parsing of intake forms across 20+ client domains",
      after: "End-to-end OCR + Graph API pipeline with zero manual parsing",
      tech: ["n8n", "Graph API", "OCR", "HaloPSA"]
    },
    {
      metric: "60%",
      title: "AI Service Desk Triage",
      before: "Tier 1 agents manually transcribed and routed every call",
      after: "LLM-based transcription and auto-ticket creation",
      tech: ["Whisper.cpp", "LLM", "Python"]
    },
    {
      metric: "2→0 days",
      title: "Shipping Automation",
      before: "Manual inventory matching and label generation",
      after: "Auto-matched devices, ShipEngine labels, Teams notifications",
      tech: ["n8n", "ShipEngine", "Teams"]
    },
    {
      metric: "30 days",
      title: "Compliance Baseline",
      before: "Inconsistent MDM policies across hybrid environments",
      after: "Full device compliance via Intune + Conditional Access",
      tech: ["Intune", "Entra ID", "Autopilot"]
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            Case Studies
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
            Results
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Before/after on production systems.
          </p>
        </div>

        {/* Case studies */}
        <div className="space-y-12">
          {caseStudies.map((study, index) => (
            <div key={index}>
              <div className="grid md:grid-cols-[200px_1fr] gap-8 items-start">
                {/* Metric */}
                <div>
                  <div className="font-mono text-5xl md:text-6xl font-black text-primary leading-none">
                    {study.metric}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    improvement
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {study.title}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="border-l-2 border-muted pl-4">
                      <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Before
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {study.before}
                      </p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <div className="font-mono text-xs text-primary uppercase tracking-wider mb-1">
                        After
                      </div>
                      <p className="text-foreground text-sm">
                        {study.after}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {study.tech.map((t, i) => (
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

              {index !== caseStudies.length - 1 && (
                <Separator className="mt-12" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
