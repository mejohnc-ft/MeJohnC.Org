import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import ProjectTimeline from "@/components/ProjectTimeline";
import Experience from "@/components/Experience";
import { useKeyboardFocus } from "@/lib/keyboard-focus";
import { useSupabaseClient } from "@/lib/supabase";
import { getCaseStudies, type CaseStudy } from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { toError } from "@/lib/errors";
import { Loader2 } from "lucide-react";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { TimelineTrackId } from "@/data/timeline-tracks";

export interface CaseStudyItem {
  metric: string;
  title: string;
  before: string;
  after: string;
}

/** Subtitle under the huge metric. Percent / +delta → improvement; minutes → baseline; else omit. */
export function metricSubtitle(metric: string): string | null {
  const value = metric.trim();
  if (value.includes("%") || value.startsWith("+")) return "improvement";
  if (/min/i.test(value)) return "from 45 min";
  return null;
}

// Fallback if public.case_studies is empty. Copy matches the 20260822040000 seed.
export const defaultCaseStudies: CaseStudyItem[] = [
  {
    metric: "+133%",
    title: "Automation hours, same billed labor",
    before:
      "More automations used to mean more engineer hours. The desk was already busy.",
    after:
      "Governed automations and agents carry the extra load. Automation hours are up 133% while billed hours stayed essentially flat. Humans still approve writeback and anything that spends money.",
  },
  {
    metric: "2 min",
    title: "User provisioning",
    before:
      "A fresh machine was 45 minutes of manual onboarding, config, and babysitting.",
    after:
      "Plug in, run the playbook, QC. About two minutes. Immy.Bot and Rewst are the stack; people still do the check.",
  },
  {
    metric: "clean",
    title: "Inventory billing",
    before:
      "Month-end billing lived in Excel. Fields were optional, access was whoever had the file, and a missed row meant a missed invoice.",
    after:
      "A governed SharePoint list with required fields and role-based access. The close is a process, not a hunt through a spreadsheet.",
  },
  {
    metric: "50%",
    title: "Faster inventory updates",
    before: "Finding a device meant hunting through SharePoint folders.",
    after: "A three-digit lookup in Teams. Half the time.",
  },
];

interface WorkTabProps {
  onRequestFocusUp: () => void;
  activeTrack?: TimelineTrackId;
  onTrackChange?: (track: TimelineTrackId) => void;
}

export default function WorkTab({
  onRequestFocusUp,
  activeTrack,
  onTrackChange,
}: WorkTabProps) {
  const workHistoryRef = useRef<HTMLDivElement>(null);
  const { focusLevel, setFocusLevel } = useKeyboardFocus();
  const supabase = useSupabaseClient();
  const prefersReducedMotion = useReducedMotion();
  const [caseStudies, setCaseStudies] =
    useState<CaseStudyItem[]>(defaultCaseStudies);
  const [isLoading, setIsLoading] = useState(true);

  const timelineFocused = focusLevel === "timeline";
  const workHistoryFocused = focusLevel === "workHistory";

  // Fetch case studies from database
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCaseStudies(supabase);
        if (data && data.length > 0) {
          setCaseStudies(
            data.map((study: CaseStudy) => ({
              metric: study.metric,
              title: study.title,
              before: study.before_content,
              after: study.after_content,
            })),
          );
        }
      } catch (err) {
        captureException(toError(err), { context: "WorkTab.fetchCaseStudies" });
        // Keep default case studies on error
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const timelineRequestFocusUp = useCallback(() => {
    onRequestFocusUp();
  }, [onRequestFocusUp]);

  const focusWorkHistory = useCallback(() => {
    setFocusLevel("workHistory");
    workHistoryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [setFocusLevel]);

  const workHistoryRequestFocusUp = useCallback(() => {
    setFocusLevel("timeline");
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setFocusLevel]);

  useEffect(() => {
    if (!workHistoryFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        workHistoryRequestFocusUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [workHistoryFocused, workHistoryRequestFocusUp]);

  return (
    <motion.div
      key="work"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: "easeInOut",
      }}
    >
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Success Roadmaps
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2 mb-4">
          AI products and endpoint logistics
        </h2>
        <p className="text-muted-foreground max-w-3xl">
          Two tracks on one roadmap. AI Products is the latest work I led or
          shipped — governed agents and evidence-preserving workflows. Endpoint
          Logistics keeps the provisioning story from COVID backlog through
          Autopilot and 3PL.
        </p>
      </div>

      {/* Hero Timeline */}
      <div className="scroll-mt-20">
        <ProjectTimeline
          focused={timelineFocused}
          activeTrack={activeTrack}
          onTrackChange={onTrackChange}
          onRequestFocusUp={timelineRequestFocusUp}
          onRequestFocusDown={focusWorkHistory}
        />
      </div>

      {/* Case Studies */}
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Case Studies
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2 mb-8">
          Results
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-12">
          {caseStudies.map((study, index) => {
            const subtitle = metricSubtitle(study.metric);
            return (
              <motion.div
                key={study.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="grid md:grid-cols-[200px_1fr] gap-8 items-start"
              >
                <div>
                  <div className="font-mono text-5xl md:text-6xl font-black text-primary leading-none">
                    {study.metric}
                  </div>
                  {subtitle && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {subtitle}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {study.title}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
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
                      <p className="text-foreground text-sm">{study.after}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Work History */}
      <div ref={workHistoryRef} className="mt-32 scroll-mt-20">
        <Experience focused={workHistoryFocused} />
      </div>
    </motion.div>
  );
}
