import { useState, useEffect, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { useKeyboardFocus } from "@/lib/keyboard-focus";
import { useSupabaseClient } from "@/lib/supabase";
import { getWorkHistory, type WorkHistoryEntry } from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { toError } from "@/lib/errors";
import {
  curatePortfolioExperience,
  defaultPortfolioExperiences,
  type PortfolioExperience,
} from "@/data/work-history";

interface ExperienceProps {
  showHeading?: boolean;
}

// Memoized individual experience item to prevent unnecessary re-renders
const ExperienceItem = memo(function ExperienceItem({
  exp,
  isFirst,
}: {
  exp: PortfolioExperience;
  isFirst: boolean;
}) {
  return (
    <details
      open={isFirst}
      className="group border-b border-border py-5 first:border-t"
    >
      <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div>
            <h3 className="text-lg font-bold text-foreground md:text-xl">
              {exp.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{exp.company}</p>
          </div>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <span className="font-mono text-xs text-muted-foreground">
              {exp.period}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              <span className="group-open:hidden">Details +</span>
              <span className="hidden group-open:inline">Close −</span>
            </span>
          </div>
        </div>
      </summary>

      <div className="mt-5 max-w-4xl border-l border-primary pl-4 sm:ml-4">
        <ul className="space-y-2">
          {exp.highlights.map((highlight) => (
            <li
              key={highlight}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {highlight}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {exp.tech.map((technology) => (
            <Badge
              key={technology}
              variant="outline"
              className="border-border font-mono text-xs"
            >
              {technology}
            </Badge>
          ))}
        </div>
      </div>
    </details>
  );
});

const Experience = ({ showHeading = true }: ExperienceProps) => {
  const { setFocusLevel } = useKeyboardFocus();
  const supabase = useSupabaseClient();
  const [experiences, setExperiences] = useState<PortfolioExperience[]>(
    defaultPortfolioExperiences,
  );

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        return;
      }

      try {
        const data = await getWorkHistory(supabase);
        if (data && data.length > 0) {
          setExperiences(
            data.map((entry: WorkHistoryEntry) =>
              curatePortfolioExperience({
                title: entry.title,
                company: entry.company,
                period: entry.period,
                highlights: entry.highlights || [],
                tech: entry.tech || [],
              }),
            ),
          );
        }
      } catch (err) {
        captureException(toError(err), {
          context: "Experience.fetchWorkHistory",
        });
      }
    }
    fetchData();
  }, [supabase]);

  return (
    <section
      id="experience"
      className={showHeading ? "bg-background py-12" : "bg-background py-2"}
      role="region"
      aria-labelledby={showHeading ? "experience-heading" : undefined}
      aria-label={showHeading ? undefined : "Role chronology"}
      tabIndex={0}
      onClick={() => setFocusLevel("workHistory")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFocusLevel("workHistory");
        }
      }}
      onFocus={() => setFocusLevel("workHistory")}
    >
      <div className="max-w-4xl mx-auto px-6">
        {showHeading && (
          <div className="mb-10">
            <span className="font-mono text-sm uppercase tracking-widest text-primary">
              Experience
            </span>
            <h2
              id="experience-heading"
              className="mt-2 text-3xl font-black text-foreground md:text-4xl"
            >
              Work History
            </h2>
          </div>
        )}

        {/* Timeline */}
        <div>
          {experiences.map((exp, index) => (
            <ExperienceItem
              key={`${exp.company}-${exp.title}-${exp.period}`}
              exp={exp}
              isFirst={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
