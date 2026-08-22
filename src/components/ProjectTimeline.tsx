import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Loader2 } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import { useSupabaseClient } from '@/lib/supabase';
import { getTimelineWithEntries, type TimelineEntry } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';
import { useReducedMotion } from '@/lib/reduced-motion';
import {
  DEFAULT_TIMELINE_SLUG,
  DEFAULT_TIMELINE_TRACK,
  TIMELINE_TRACKS,
  defaultTimelineData,
  entriesForTrack,
  normalizeTimelineTrack,
  type TimelineItem,
  type TimelineTrackId,
} from '@/data/timeline-tracks';

const AiProductsPanel = lazy(() => import('@/components/portfolio/AiProductsPanel'));

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
  'solarized-dark': {
    primary: 'hsl(175, 59%, 40%)',
    segments: [
      'hsl(192, 60%, 18%)',
      'hsl(205, 69%, 49%)',
      'hsl(175, 59%, 40%)',
      'hsl(68, 100%, 30%)',
    ],
    segmentText: [
      'hsl(186, 8%, 55%)',
      'hsl(44, 87%, 94%)',
      'hsl(192, 100%, 11%)',
      'hsl(44, 87%, 94%)',
    ],
    glow: 'hsla(175, 59%, 40%, 0.15)',
    gridLine: 'hsl(192, 40%, 20%)',
    progressInactive: 'hsl(192, 60%, 18%)',
  },
  'solarized-light': {
    primary: 'hsl(175, 59%, 40%)',
    segments: [
      'hsl(44, 30%, 80%)',
      'hsl(205, 69%, 49%)',
      'hsl(175, 59%, 40%)',
      'hsl(68, 100%, 30%)',
    ],
    segmentText: [
      'hsl(195, 13%, 45%)',
      'hsl(44, 87%, 94%)',
      'hsl(44, 87%, 94%)',
      'hsl(44, 87%, 94%)',
    ],
    glow: 'hsla(175, 59%, 40%, 0.15)',
    gridLine: 'hsl(44, 20%, 75%)',
    progressInactive: 'hsl(44, 25%, 80%)',
  },
};

function mapEntry(entry: TimelineEntry, index: number): TimelineItem {
  return {
    id: entry.id,
    label: entry.label,
    phase: entry.phase,
    summary: entry.summary,
    content: entry.content,
    dot_position: entry.dot_position,
    track: normalizeTimelineTrack(entry.track),
    entry_key: entry.entry_key ?? entry.label ?? `entry-${index}`,
  };
}

function mergeTimelineEntries(fetched: TimelineItem[]): TimelineItem[] {
  const logistics = entriesForTrack(fetched, 'endpoint-logistics');
  const aiProducts = entriesForTrack(fetched, 'ai-products');
  const fallbackLogistics = entriesForTrack(defaultTimelineData, 'endpoint-logistics');
  const fallbackAi = entriesForTrack(defaultTimelineData, 'ai-products');

  return [
    ...(aiProducts.length > 0 ? aiProducts : fallbackAi),
    ...(logistics.length > 0 ? logistics : fallbackLogistics),
  ];
}

// Convert dot_position (0-100) to chart coordinates
function getDotPosition(dotPosition: number, entryCount: number, index: number) {
  const segmentWidth = 100 / entryCount;
  const left = `${segmentWidth * index + segmentWidth / 2}%`;
  const top = `${92 - (dotPosition / 100) * 77}%`;

  return { left, top };
}

// Generate SVG path for growth curve based on dot positions
function generateCurvePath(entries: { dot_position: number }[]) {
  if (entries.length === 0) return '';

  const count = entries.length;
  const segmentWidth = 100 / count;

  const points = entries.map((entry, i) => {
    const x = segmentWidth * i + segmentWidth / 2;
    const y = 92 - (entry.dot_position / 100) * 77;
    return { x, y };
  });

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

  const lastPoint = points[points.length - 1];
  path += ` C ${lastPoint.x + 5},${lastPoint.y - 3} ${98},${lastPoint.y - 8} 100,${lastPoint.y - 10}`;

  return path;
}

interface ProjectTimelineProps {
  slug?: string;
  focused?: boolean;
  activeTrack?: TimelineTrackId;
  onTrackChange?: (track: TimelineTrackId) => void;
  onRequestFocusUp?: () => void;
  onRequestFocusDown?: () => void;
}

const ProjectTimeline = ({
  slug = DEFAULT_TIMELINE_SLUG,
  focused = false,
  activeTrack: controlledTrack,
  onTrackChange,
  onRequestFocusUp,
  onRequestFocusDown
}: ProjectTimelineProps) => {
  const { theme: currentTheme } = useTheme();
  const theme = themes[currentTheme];
  const supabase = useSupabaseClient();
  const { setFocusLevel } = useKeyboardFocus();
  const prefersReducedMotion = useReducedMotion();

  const [timelineData, setTimelineData] = useState<TimelineItem[]>(defaultTimelineData);
  const [internalTrack, setInternalTrack] = useState<TimelineTrackId>(
    controlledTrack ?? DEFAULT_TIMELINE_TRACK
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    entriesForTrack(defaultTimelineData, 'endpoint-logistics')[0]?.id ?? null
  );
  const [isAutoPlaying, setIsAutoPlaying] = useState(!prefersReducedMotion);

  const activeTrack = controlledTrack ?? internalTrack;

  const setActiveTrack = useCallback((track: TimelineTrackId) => {
    if (onTrackChange) {
      onTrackChange(track);
    } else {
      setInternalTrack(track);
    }
    setIsAutoPlaying(false);
    setFocusLevel('timeline');
  }, [onTrackChange, setFocusLevel]);

  useEffect(() => {
    if (controlledTrack) {
      setInternalTrack(controlledTrack);
    }
  }, [controlledTrack]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsAutoPlaying(false);
    }
  }, [prefersReducedMotion]);

  // Fetch timeline data without blocking on a spinner (fallback already rendered)
  useEffect(() => {
    let cancelled = false;

    async function fetchTimeline() {
      if (!supabase) return;
      try {
        const data = await getTimelineWithEntries(slug, supabase);
        if (cancelled) return;
        if (data && data.entries.length > 0) {
          const items = mergeTimelineEntries(data.entries.map(mapEntry));
          setTimelineData(items);
          const logistics = entriesForTrack(items, 'endpoint-logistics');
          if (logistics[0]) {
            setExpandedId((current) => {
              const stillThere = logistics.some((item) => item.id === current);
              return stillThere ? current : logistics[0].id;
            });
          }
        }
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'ProjectTimeline.fetchTimeline',
          slug,
        });
      }
    }
    fetchTimeline();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  const logisticsEntries = entriesForTrack(timelineData, 'endpoint-logistics');
  const aiProductEntries = entriesForTrack(timelineData, 'ai-products');
  const trackMeta = TIMELINE_TRACKS.find((track) => track.id === activeTrack) ?? TIMELINE_TRACKS[0];

  const goToNext = useCallback(() => {
    const currentIndex = logisticsEntries.findIndex(item => item.id === expandedId);
    const nextIndex = (currentIndex + 1) % logisticsEntries.length;
    setExpandedId(logisticsEntries[nextIndex]?.id ?? null);
    setIsAutoPlaying(false);
  }, [expandedId, logisticsEntries]);

  const goToPrev = useCallback(() => {
    const currentIndex = logisticsEntries.findIndex(item => item.id === expandedId);
    const prevIndex = (currentIndex - 1 + logisticsEntries.length) % logisticsEntries.length;
    setExpandedId(logisticsEntries[prevIndex]?.id ?? null);
    setIsAutoPlaying(false);
  }, [expandedId, logisticsEntries]);

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
        if (activeTrack === 'endpoint-logistics') {
          goToNext();
        } else {
          const currentIndex = TIMELINE_TRACKS.findIndex((track) => track.id === activeTrack);
          const next = TIMELINE_TRACKS[(currentIndex + 1) % TIMELINE_TRACKS.length];
          setActiveTrack(next.id);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (activeTrack === 'endpoint-logistics') {
          goToPrev();
        } else {
          const currentIndex = TIMELINE_TRACKS.findIndex((track) => track.id === activeTrack);
          const prev = TIMELINE_TRACKS[(currentIndex - 1 + TIMELINE_TRACKS.length) % TIMELINE_TRACKS.length];
          setActiveTrack(prev.id);
        }
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
  }, [focused, goToNext, goToPrev, onRequestFocusUp, onRequestFocusDown, activeTrack, setActiveTrack]);

  // Auto-rotation timer (20 seconds per slide) — logistics years only
  useEffect(() => {
    if (!isAutoPlaying || activeTrack !== 'endpoint-logistics' || prefersReducedMotion) return;
    const timer = setInterval(goToNext, 20000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, goToNext, activeTrack, prefersReducedMotion]);

  const handleSegmentClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedId(id);
    setIsAutoPlaying(false);
    setFocusLevel('timeline');
  };

  const motionDuration = prefersReducedMotion ? 0 : 0.4;

  return (
    <div
      className="mb-12"
      onClick={() => setFocusLevel('timeline')}
      role="region"
      aria-label="Success roadmap"
    >
      <div
        role="tablist"
        aria-label="Success roadmap tracks"
        className="flex flex-wrap gap-2 mb-6"
      >
        {TIMELINE_TRACKS.map((track) => {
          const selected = activeTrack === track.id;
          return (
            <motion.button
              key={track.id}
              type="button"
              role="tab"
              id={`roadmap-track-${track.id}`}
              aria-selected={selected}
              aria-controls={`roadmap-panel-${track.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTrack(track.id);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const index = TIMELINE_TRACKS.findIndex((item) => item.id === track.id);
                const delta = e.key === 'ArrowRight' ? 1 : -1;
                const next = TIMELINE_TRACKS[(index + delta + TIMELINE_TRACKS.length) % TIMELINE_TRACKS.length];
                setActiveTrack(next.id);
                document.getElementById(`roadmap-track-${next.id}`)?.focus();
              }}
              className={`font-mono text-sm uppercase tracking-wider px-4 py-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-current'
              }`}
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              {track.label}
            </motion.button>
          );
        })}
      </div>

      <div className="mb-8">
        <h3 className="text-2xl md:text-3xl font-black text-foreground">
          {trackMeta.heading}
        </h3>
        <p className="text-muted-foreground mt-2 max-w-3xl">{trackMeta.summary}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTrack}
          id={`roadmap-panel-${activeTrack}`}
          role="tabpanel"
          aria-labelledby={`roadmap-track-${activeTrack}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: motionDuration, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {activeTrack === 'ai-products' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
            >
              <AiProductsPanel entries={aiProductEntries} />
            </Suspense>
          ) : (
            <LogisticsTimeline
              timelineData={logisticsEntries}
              theme={theme}
              focused={focused}
              expandedId={expandedId}
              isAutoPlaying={isAutoPlaying}
              prefersReducedMotion={prefersReducedMotion}
              onSegmentClick={handleSegmentClick}
              onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface LogisticsTimelineProps {
  timelineData: TimelineItem[];
  theme: (typeof themes)['warm'];
  focused: boolean;
  expandedId: string | null;
  isAutoPlaying: boolean;
  prefersReducedMotion: boolean;
  onSegmentClick: (id: string, e?: React.MouseEvent) => void;
  onToggleAutoPlay: () => void;
}

function LogisticsTimeline({
  timelineData,
  theme,
  focused,
  expandedId,
  isAutoPlaying,
  prefersReducedMotion,
  onSegmentClick,
  onToggleAutoPlay,
}: LogisticsTimelineProps) {
  const curvePath = generateCurvePath(timelineData);
  const motionDuration = prefersReducedMotion ? 0 : 0.4;

  return (
    <div>
      <div className="relative h-32 mb-6">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="74" x2="100" y2="74" stroke={theme.gridLine} strokeWidth="0.1" opacity="0.3" />
          <line x1="0" y1="53" x2="100" y2="53" stroke={theme.gridLine} strokeWidth="0.1" opacity="0.3" />

          <motion.path
            d={curvePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth="0.5"
            strokeLinecap="round"
            shapeRendering="geometricPrecision"
            style={{ filter: `drop-shadow(0 0 2px ${theme.primary})` }}
            initial={{ pathLength: prefersReducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 1.5, ease: 'easeOut' }}
          />
        </svg>

        {timelineData.map((item, i) => {
          const pos = getDotPosition(item.dot_position, timelineData.length, i);
          return (
            <motion.button
              key={item.id}
              type="button"
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
              initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: prefersReducedMotion ? 1 : 0 }}
              animate={{
                scale: expandedId === item.id ? 1 : 0.667,
                opacity: 1
              }}
              transition={{
                scale: prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 400, damping: 25 },
                opacity: { delay: prefersReducedMotion ? 0 : 0.3 + i * 0.2, duration: motionDuration }
              }}
              onClick={(e) => onSegmentClick(item.id, e)}
              aria-label={`Timeline point: ${item.label} - ${item.phase}`}
              aria-pressed={expandedId === item.id}
            />
          );
        })}
      </div>

      <div className="relative mb-4" role="tablist" aria-label="Timeline phases">
        <div className="flex h-12 rounded overflow-hidden">
          {timelineData.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={(e) => onSegmentClick(item.id, e)}
              className="flex-1 flex items-center justify-center font-mono text-sm font-semibold cursor-pointer transition-all"
              style={{
                background: theme.segments[index % theme.segments.length],
                color: theme.segmentText[index % theme.segmentText.length],
              }}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02, zIndex: 10 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              role="tab"
              aria-selected={expandedId === item.id}
              aria-controls={`timeline-content-${item.id}`}
            >
              {item.label}
            </motion.button>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAutoPlay();
          }}
          className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded border border-border hover:border-current transition-colors"
          style={{ color: theme.primary }}
          aria-label={isAutoPlaying ? 'Pause auto-play' : 'Resume auto-play'}
          aria-pressed={isAutoPlaying}
        >
          {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      <div className={`grid gap-4 mb-6 ${timelineData.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-' + timelineData.length}`}>
        {timelineData.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={(e) => onSegmentClick(item.id, e)}
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

      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {expandedId && (
            <motion.div
              key={expandedId}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: motionDuration, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div
                className="p-6 pb-8 rounded border bg-card/50 backdrop-blur-sm"
                style={{
                  borderColor: theme.primary,
                  boxShadow: `0 0 20px ${theme.glow}`,
                }}
                id={`timeline-content-${expandedId}`}
                role="tabpanel"
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
                      <p className="text-muted-foreground leading-relaxed mb-2">{item.content}</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isAutoPlaying && (
        <div className="mt-4 flex justify-center gap-2">
          {timelineData.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => onSegmentClick(item.id, e)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: expandedId === item.id ? theme.primary : theme.progressInactive,
                boxShadow: expandedId === item.id ? `0 0 8px ${theme.primary}` : 'none',
              }}
              aria-label={`Show ${item.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectTimeline;
