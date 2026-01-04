import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import ProjectTimeline from '@/components/ProjectTimeline';
import Experience from '@/components/Experience';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import { useSupabaseClient } from '@/lib/supabase';
import { getCaseStudies, type CaseStudy } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';
import { Loader2 } from 'lucide-react';

// Fallback case studies if database is empty
const defaultCaseStudies = [
  {
    metric: "70%",
    title: "Provisioning Automation",
    before: "Manual parsing of intake forms across 20+ client domains",
    after: "End-to-end OCR + Graph API pipeline with zero manual parsing",
  },
  {
    metric: "2→0",
    title: "Shipping Automation",
    before: "Manual inventory matching and label generation (2 days)",
    after: "Same-day: auto-matched devices, ShipEngine labels, Teams notifications",
  },
];

interface CaseStudyItem {
  metric: string;
  title: string;
  before: string;
  after: string;
}

interface WorkTabProps {
  onRequestFocusUp: () => void;
}

export default function WorkTab({ onRequestFocusUp }: WorkTabProps) {
  const workHistoryRef = useRef<HTMLDivElement>(null);
  const { focusLevel, setFocusLevel } = useKeyboardFocus();
  const supabase = useSupabaseClient();
  const [caseStudies, setCaseStudies] = useState<CaseStudyItem[]>(defaultCaseStudies);
  const [isLoading, setIsLoading] = useState(true);

  const timelineFocused = focusLevel === 'timeline';
  const workHistoryFocused = focusLevel === 'workHistory';

  // Fetch case studies from database
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCaseStudies(supabase);
        if (data && data.length > 0) {
          setCaseStudies(data.map((study: CaseStudy) => ({
            metric: study.metric,
            title: study.title,
            before: study.before_content,
            after: study.after_content,
          })));
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'WorkTab.fetchCaseStudies' });
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
    setFocusLevel('workHistory');
    workHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setFocusLevel]);

  const workHistoryRequestFocusUp = useCallback(() => {
    setFocusLevel('timeline');
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setFocusLevel]);

  useEffect(() => {
    if (!workHistoryFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        workHistoryRequestFocusUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [workHistoryFocused, workHistoryRequestFocusUp]);

  return (
    <motion.div
      key="work"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Provisioning Success Roadmaps Header */}
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Success Roadmaps
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2 mb-4">
          Provisioning: Automation & Logistics Transformation
        </h2>
      </div>

      {/* Hero Timeline */}
      <div className="scroll-mt-20">
        <ProjectTimeline
          focused={timelineFocused}
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
          {caseStudies.map((study, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="grid md:grid-cols-[200px_1fr] gap-8 items-start"
            >
              <div>
                <div className="font-mono text-5xl md:text-6xl font-black text-primary leading-none">
                  {study.metric}
                </div>
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
        </div>
      )}

      {/* Work History */}
      <div ref={workHistoryRef} className="mt-32 scroll-mt-20">
        <Experience focused={workHistoryFocused} />
      </div>
    </motion.div>
  );
}
