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
  const [experiences, setExperiences] = useState<ExperienceItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setError('Database not configured');
        setIsLoading(false);
        return;
      }

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
        setError('Unable to load work history');
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

  if (error || experiences.length === 0) {
    return (
      <section
        id="experience"
        className="min-h-[calc(100vh-8rem)] py-12 bg-background"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-10">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Experience
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2">
              Work History
            </h2>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            {error ? (
              <p>{error}</p>
            ) : (
              <p>No work history entries yet. Add them in the admin panel.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="experience"
      className="min-h-[calc(100vh-8rem)] py-12 bg-background"
      role="region"
      aria-labelledby="experience-heading"
      tabIndex={0}
      onClick={() => setFocusLevel('workHistory')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFocusLevel('workHistory');
        }
      }}
      onFocus={() => setFocusLevel('workHistory')}
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
          <h2 id="experience-heading" className="text-3xl md:text-4xl font-black text-foreground mt-2">
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
