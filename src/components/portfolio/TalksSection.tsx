import { ExternalLink, Mic } from "lucide-react";
import { formatTalkTimestamp, sortTalksByDateDesc, talks } from "@/data/talks";

export default function TalksSection() {
  const ordered = sortTalksByDateDesc(talks);

  return (
    <section className="mb-16" aria-label="Speaking appearances">
      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <div className="inline-flex p-3 bg-muted rounded-full mb-4">
            <Mic className="w-6 h-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-foreground font-semibold mb-2">
            No talks posted yet
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This section is wired to a typed talks list. Titles, venues, and ISO
            dates still need to be added — nothing here is invented.
          </p>
        </div>
      ) : (
        <ol className="grid gap-5 lg:grid-cols-3">
          {ordered.map((talk) => (
            <li
              key={talk.id}
              className="group overflow-hidden rounded-xl border border-border bg-card/50"
            >
              {talk.imageUrl && (
                <div className="aspect-video overflow-hidden border-b border-border bg-muted">
                  {talk.url ? (
                    <a
                      href={talk.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Watch ${talk.title}`}
                    >
                      <img
                        src={talk.imageUrl}
                        alt={talk.imageAlt ?? ""}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </a>
                  ) : (
                    <img
                      src={talk.imageUrl}
                      alt={talk.imageAlt ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <time
                    className="font-mono text-xs text-primary uppercase tracking-widest"
                    dateTime={talk.occurredAt}
                  >
                    {formatTalkTimestamp(talk.occurredAt)}
                  </time>
                  {talk.format && (
                    <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {talk.format}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-foreground mt-3">
                  {talk.url ? (
                    <a
                      href={talk.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>{talk.title}</span>
                      <ExternalLink
                        className="mt-1 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  ) : (
                    talk.title
                  )}
                </h4>
                {talk.venue && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {talk.venue}
                  </p>
                )}
                {talk.summary && (
                  <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                    {talk.summary}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
