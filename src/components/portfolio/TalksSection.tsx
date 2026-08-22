import { Mic } from "lucide-react";
import {
  formatTalkTimestamp,
  sortTalksByDateDesc,
  talks,
} from "@/data/talks";

export default function TalksSection() {
  const ordered = sortTalksByDateDesc(talks);

  return (
    <section className="mb-16" aria-labelledby="talks-heading">
      <span className="font-mono text-sm text-primary uppercase tracking-widest">
        Speaking
      </span>
      <h3
        id="talks-heading"
        className="text-2xl md:text-3xl font-black text-foreground mt-2 mb-3"
      >
        Talks
      </h3>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Timestamped talks, newest first. Dates stay attached to each title so
        recruiters and crawlers can see when something was actually given.
      </p>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <div className="inline-flex p-3 bg-muted rounded-full mb-4">
            <Mic className="w-6 h-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-foreground font-semibold mb-2">No talks posted yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This section is wired to a typed talks list. Titles, venues, and
            ISO dates still need to be added — nothing here is invented.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {ordered.map((talk) => (
            <li
              key={talk.id}
              className="rounded-xl border border-border bg-card/50 p-5"
            >
              <time
                className="font-mono text-xs text-primary uppercase tracking-widest"
                dateTime={talk.occurredAt}
              >
                {formatTalkTimestamp(talk.occurredAt)}
              </time>
              <h4 className="text-lg font-bold text-foreground mt-2">
                {talk.url ? (
                  <a
                    href={talk.url}
                    className="hover:text-primary transition-colors"
                  >
                    {talk.title}
                  </a>
                ) : (
                  talk.title
                )}
              </h4>
              {talk.venue && (
                <p className="text-sm text-muted-foreground mt-1">{talk.venue}</p>
              )}
              {talk.summary && (
                <p className="text-sm text-muted-foreground mt-2">{talk.summary}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
