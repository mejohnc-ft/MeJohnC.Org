import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Loader2 } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import { useSupabaseClient } from '@/lib/supabase';
import { getTimelineWithEntries, type TimelineEntry } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

// Theme color definitions
const themes = {
  warm: {
    primary: 'hsl(25, 95%, 53%)',
    segments: [
      'hsl(25, 15%, 30%)',
      'hsl(25, 40%, 40%)',
      'hsl(25, 70%, 48%)',
      'hsl(25, 95%, 53%)',
    ],
    segmentText: [
      'hsl(30, 10%, 95%)',
      'hsl(30, 10%, 95%)',
      'hsl(20, 20%, 5%)',
      'hsl(20, 20%, 5%)',
    ],
    glow: 'hsla(25, 95%, 53%, 0.15)',
    gridLine: 'hsl(25, 8%, 25%)',
    progressInactive: 'hsl(25, 8%, 30%)',
  },
  crisp: {
    primary: 'hsl(177, 94%, 21%)',
    segments: [
      'hsl(177, 23%, 53%)',
      'hsl(177, 50%, 35%)',
      'hsl(177, 94%, 21%)',
      'hsl(176, 62%, 18%)',
    ],
    segmentText: [
      'hsl(169, 52%, 4%)',
      'hsl(60, 10%, 97%)',
      'hsl(60, 10%, 97%)',
      'hsl(60, 10%, 97%)',
    ],
    glow: 'hsla(177, 94%, 21%, 0.15)',
    gridLine: 'hsl(177, 15%, 80%)',
    progressInactive: 'hsl(177, 10%, 75%)',
  },
};

// Fallback timeline data
const defaultTimelineData = [
  {
    id: '2022-2023',
    label: '2022-2023',
    phase: 'Recovery & Foundation',
    summary: 'Cleared COVID backlog, created inventory sheets, standardized SOPs & SLAs',
    content: `Starting in 2022, I inherited a provisioning backlog of over 72,000 tickets accumulated during the COVID-19 pandemic. Within 6 months, I systematically cleared this backlog by implementing standardized workflows and creating comprehensive inventory tracking sheets. I reintroduced media sanitization protocols that had lapsed and established the SOPs and SLAs that would become the foundation for all future automation work. This phase was about building trust, understanding the systems, and laying groundwork for what was to come.`,
    dot_position: 13,
  },
  {
    id: '2024',
    label: '2024',
    phase: 'Automation & Knowledge',
    summary: 'Completed Immy.Bot buildout, standardized Provisioning KB',
    content: `2024 marked the shift from manual processes to intelligent automation. I completed the full Immy.Bot buildout, enabling automated software deployments and configurations across our entire client base. The Provisioning Knowledge Base was standardized and made accessible, transforming tribal knowledge into documented, searchable resources. This year laid the technical foundation that would enable the dramatic improvements seen in 2025.`,
    dot_position: 24,
  },
  {
    id: '2025',
    label: '2025',
    phase: 'Optimization & Growth',
    summary: 'One-touch provisions for 75%+ clients, <5 day turnaround, record-breaking October',
    content: `2025 was the year everything came together. We achieved in-house one-touch provisioning for over 75% of our clients. Provisioning turnaround dropped to under 5 business days—a dramatic improvement from the weeks-long timelines of previous years. October 2025 became our largest provisioning month ever, and we launched a brand-new Inventory system with enhanced UX. I successfully handed off operations to a new hire, established the Provisioning ToolBox with 15 knowledge pieces, and ended the year with fully automated provisioning and inventory intake systems.`,
    dot_position: 41,
  },
  {
    id: '2026+',
    label: '2026+',
    phase: 'Future State',
    summary: 'Autopilot/White glove for all clients, 3PL integration, office-free logistics',
    content: `Looking ahead, the vision is complete automation independence. Every client will have Autopilot or White Glove configuration ready from day one. Third-party logistics (3PL) integration will reduce costs while maintaining our rigorous SLAs. The ultimate goal: eliminate any reliance on physical office space for inventory and logistics, enabling a fully distributed, resilient provisioning operation.`,
    dot_position: 75,
  },
];

// Convert dot_position (0-100) to chart coordinates
function getDotPosition(dotPosition: number, entryCount: number, index: number) {
  // X position: distribute evenly across the chart
  const segmentWidth = 100 / entryCount;
  const left = `${segmentWidth * index + segmentWidth / 2}%`;

  // Y position: map dot_position (0=bottom, 100=top) to chart (92=bottom, 15=top)
  const top = `${92 - (dotPosition / 100) * 77}%`;

  return { left, top };
}

// Generate SVG path for growth curve based on dot positions
function generateCurvePath(entries: { dot_position: number }[]) {
  if (entries.length === 0) return '';

  const count = entries.length;
  const segmentWidth = 100 / count;

  // Calculate points
  const points = entries.map((entry, i) => {
    const x = segmentWidth * i + segmentWidth / 2;
    const y = 92 - (entry.dot_position / 100) * 77;
    return { x, y };
  });

  // Build path with bezier curves
  let path = `M 0,${92 - (entries[0].dot_position / 100) * 77 + 5}`;

  points.forEach((point, i) => {
    if (i === 0) {
      path += ` C ${point.x / 2},${point.y + 2} ${point.x - 2},${point.y} ${point.x},${point.y}`;
    } else {
      const prev = points[i - 1];
      const cpX1 = prev.x + (point.x - prev.x) * 0.4;
      const cpX2 = prev.x + (point.x - prev.x) * 0.6;
      path += ` C ${cpX1},${prev.y - 2} ${cpX2},${point.y + 2} ${point.x},${point.y}`;
    }
  });

  // Extend to edge
  const lastPoint = points[points.length - 1];
  path += ` C ${lastPoint.x + 5},${lastPoint.y - 3} ${98},${lastPoint.y - 8} 100,${lastPoint.y - 10}`;

  return path;
}

interface TimelineItem {
  id: string;
  label: string;
  phase: string;
  summary: string | null;
  content: string | null;
  dot_position: number;
}

interface ProjectTimelineProps {
  slug?: string;
  focused?: boolean;
  onRequestFocusUp?: () => void;
  onRequestFocusDown?: () => void;
}

const ProjectTimeline = ({
  slug = 'provisioning-roadmap',
  focused = false,
  onRequestFocusUp,
  onRequestFocusDown
}: ProjectTimelineProps) => {
  const { theme: currentTheme } = useTheme();
  const theme = themes[currentTheme];
  const supabase = useSupabaseClient();
  const { setFocusLevel } = useKeyboardFocus();

  const [timelineData, setTimelineData] = useState<TimelineItem[]>(defaultTimelineData);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch timeline data
  useEffect(() => {
    async function fetchTimeline() {
      try {
        const data = await getTimelineWithEntries(slug, supabase);
        if (data && data.entries.length > 0) {
          const items: TimelineItem[] = data.entries.map((entry: TimelineEntry) => ({
            id: entry.id,
            label: entry.label,
            phase: entry.phase,
            summary: entry.summary,
            content: entry.content,
            dot_position: entry.dot_position,
          }));
          setTimelineData(items);
          setExpandedId(items[0].id);
        } else {
          setExpandedId(defaultTimelineData[0].id);
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'ProjectTimeline.fetchTimeline',
          slug,
        });
        setExpandedId(defaultTimelineData[0].id);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTimeline();
     
  }, [slug, supabase]);

  const goToNext = useCallback(() => {
    const currentIndex = timelineData.findIndex(item => item.id === expandedId);
    const nextIndex = (currentIndex + 1) % timelineData.length;
    setExpandedId(timelineData[nextIndex].id);
    setIsAutoPlaying(false);
  }, [expandedId, timelineData]);

  const goToPrev = useCallback(() => {
    const currentIndex = timelineData.findIndex(item => item.id === expandedId);
    const prevIndex = (currentIndex - 1 + timelineData.length) % timelineData.length;
    setExpandedId(timelineData[prevIndex].id);
    setIsAutoPlaying(false);
  }, [expandedId, timelineData]);

  // Keyboard navigation when focused
  useEffect(() => {
    if (!focused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopImmediatePropagation();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        goToPrev();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onRequestFocusUp?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onRequestFocusDown?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [focused, goToNext, goToPrev, onRequestFocusUp, onRequestFocusDown]);

  // Auto-rotation timer (20 seconds per slide)
  useEffect(() => {
    if (!isAutoPlaying || isLoading) return;
    const timer = setInterval(goToNext, 20000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, isLoading, goToNext]);

  const handleSegmentClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedId(id);
    setIsAutoPlaying(false);
    setFocusLevel('timeline');
  };

  if (isLoading) {
    return (
      <div className="mb-12 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const curvePath = generateCurvePath(timelineData);

  return (
    <div
      className="mb-12 cursor-pointer"
      onClick={() => setFocusLevel('timeline')}
      role="region"
      aria-label="Project timeline"
    >
      {/* Growth Curve Graph */}
      <div className="relative h-32 mb-6">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="74" x2="100" y2="74" stroke={theme.gridLine} strokeWidth="0.1" opacity="0.3" />
          <line x1="0" y1="53" x2="100" y2="53" stroke={theme.gridLine} strokeWidth="0.1" opacity="0.3" />

          {/* Dynamic curve */}
          <motion.path
            d={curvePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth="0.5"
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
            style={{ filter: `drop-shadow(0 0 2px ${theme.primary})` }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Dots */}
        {timelineData.map((item, i) => {
          const pos = getDotPosition(item.dot_position, timelineData.length, i);
          return (
            <motion.button
              key={item.id}
              className="absolute w-[18px] h-[18px] rounded-full"
              style={{
                left: pos.left,
                top: pos.top,
                marginLeft: -9,
                marginTop: -9,
                background: expandedId === item.id ? theme.primary : theme.progressInactive,
                filter: expandedId === item.id && focused
                  ? `drop-shadow(0 0 12px ${theme.primary}) drop-shadow(0 0 20px ${theme.primary})`
                  : 'none',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: expandedId === item.id ? 1 : 0.667,
                opacity: 1
              }}
              transition={{
                scale: { type: 'spring', stiffness: 400, damping: 25 },
                opacity: { delay: 0.3 + i * 0.2 }
              }}
              onClick={(e) => handleSegmentClick(item.id, e)}
              aria-label={`Timeline point: ${item.label} - ${item.phase}`}
              aria-pressed={expandedId === item.id}
            />
          );
        })}
      </div>

      {/* Timeline Bar */}
      <div className="relative mb-4" role="tablist" aria-label="Timeline phases">
        <div className="flex h-12 rounded overflow-hidden">
          {timelineData.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={(e) => handleSegmentClick(item.id, e)}
              className="flex-1 flex items-center justify-center font-mono text-sm font-semibold cursor-pointer transition-all"
              style={{
                background: theme.segments[index % theme.segments.length],
                color: theme.segmentText[index % theme.segmentText.length],
              }}
              whileHover={{ scale: 1.02, zIndex: 10 }}
              whileTap={{ scale: 0.98 }}
              role="tab"
              aria-selected={expandedId === item.id}
              aria-controls={`timeline-content-${item.id}`}
            >
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Auto-play toggle */}
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded border border-border hover:border-current transition-colors"
          style={{ color: theme.primary }}
          aria-label={isAutoPlaying ? 'Pause auto-play' : 'Resume auto-play'}
          aria-pressed={isAutoPlaying}
        >
          {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Phase Labels */}
      <div className={`grid gap-4 mb-6 ${timelineData.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-' + timelineData.length}`}>
        {timelineData.map((item) => (
          <button
            key={item.id}
            onClick={(e) => handleSegmentClick(item.id, e)}
            className={`text-center font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
              expandedId === item.id ? '' : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{
              color: expandedId === item.id ? theme.primary : undefined,
            }}
          >
            {item.phase}
          </button>
        ))}
      </div>

      {/* Expanded Content */}
      <div className="relative overflow-hidden min-h-[180px]">
        <AnimatePresence mode="wait">
          {expandedId && (
            <motion.div
              key={expandedId}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              <div
                className="p-6 rounded border bg-card/50 backdrop-blur-sm h-full"
                style={{
                  borderColor: theme.primary,
                  boxShadow: `0 0 20px ${theme.glow}`,
                }}
              >
                {timelineData
                  .filter((item) => item.id === expandedId)
                  .map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className="font-mono text-lg font-bold"
                          style={{ color: theme.primary }}
                        >
                          {item.label}
                        </span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-foreground font-semibold">{item.phase}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{item.content}</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress indicator */}
      {isAutoPlaying && (
        <div className="mt-4 flex justify-center gap-2">
          {timelineData.map((item) => (
            <button
              key={item.id}
              onClick={(e) => handleSegmentClick(item.id, e)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: expandedId === item.id ? theme.primary : theme.progressInactive,
                boxShadow: expandedId === item.id ? `0 0 8px ${theme.primary}` : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;
