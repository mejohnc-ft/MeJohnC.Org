import { useState, useEffect, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import { useSupabaseClient } from '@/lib/supabase';
import { getWorkHistory, type WorkHistoryEntry } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';
import { Loader2 } from 'lucide-react';

interface ExperienceProps {
  focused?: boolean;
}

// Fallback data if database is empty
const defaultExperiences = [
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

interface ExperienceItemData {
  title: string;
  company: string;
  period: string;
  highlights: string[];
  tech: string[];
}

// Memoized individual experience item to prevent unnecessary re-renders
const ExperienceItem = memo(function ExperienceItem({
  exp,
  isLast
}: {
  exp: ExperienceItemData;
  isLast: boolean;
}) {
  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-0 top-7 w-px h-full bg-border" />
      )}

      <div className="flex gap-8">
        {/* Date column */}
        <div className="w-32 flex-shrink-0">
          <span className="font-mono text-sm text-muted-foreground">
            {exp.period}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 pb-6">
          <h3 className="text-xl font-bold text-foreground mb-1">
            {exp.title}
          </h3>
          <p className="text-muted-foreground mb-3">
            {exp.company}
          </p>

          <ul className="space-y-2 mb-4">
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

      {!isLast && <Separator className="mt-0" />}
    </div>
  );
});

const Experience = ({ focused = false }: ExperienceProps) => {
  const { setFocusLevel } = useKeyboardFocus();
  const supabase = useSupabaseClient();
  const [experiences, setExperiences] = useState<ExperienceItemData[]>(defaultExperiences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getWorkHistory(supabase);
        if (data && data.length > 0) {
          setExperiences(data.map((entry: WorkHistoryEntry) => ({
            title: entry.title,
            company: entry.company,
            period: entry.period,
            highlights: entry.highlights || [],
            tech: entry.tech || [],
          })));
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'Experience.fetchWorkHistory',
        });
        // Keep default experiences on error
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
     
  }, [supabase]);

  if (isLoading) {
    return (
      <section
        id="experience"
        className="min-h-[calc(100vh-8rem)] py-12 bg-background flex items-center justify-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section
      id="experience"
      className="min-h-[calc(100vh-8rem)] py-12 bg-background cursor-pointer"
      onClick={() => setFocusLevel('workHistory')}
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-10">
          <span
            className="font-mono text-sm text-primary uppercase tracking-widest"
            style={{
              textShadow: focused
                ? '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary))'
                : 'none',
            }}
          >
            Experience
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2">
            Work History
          </h2>
        </div>

        {/* Timeline */}
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <ExperienceItem
              key={index}
              exp={exp}
              isLast={index === experiences.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
