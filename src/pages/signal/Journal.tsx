import { useState } from "react";
import { BookOpen, Plus, Search, Tag, ChevronDown } from "lucide-react";
import SignalLayout from "@/components/SignalLayout";
import { useSEO } from "@/lib/seo";

type EntryType =
  | "thesis"
  | "observation"
  | "lesson"
  | "trade_log"
  | "weekly_review";

const entryTypeLabels: Record<EntryType, string> = {
  thesis: "Thesis",
  observation: "Observation",
  lesson: "Lesson",
  trade_log: "Trade log",
  weekly_review: "Weekly review",
};

const entryTypes: EntryType[] = [
  "thesis",
  "observation",
  "lesson",
  "trade_log",
  "weekly_review",
];

export default function Journal() {
  useSEO({ title: "Signal — Journal", noIndex: true });
  const [activeType, setActiveType] = useState<EntryType | "all">("all");
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({
    type: "observation" as EntryType,
    title: "",
    content: "",
    tickers: "",
  });

  return (
    <SignalLayout>
      <div className="p-6 max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Journal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Thesis, observations, lessons, and trade logs
            </p>
          </div>
          <button
            onClick={() => setComposing((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New entry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left: entry list */}
          <div className="md:col-span-1 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Type filter */}
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveType("all")}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeType === "all"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                All entries
              </button>
              {entryTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    activeType === t
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      t === "thesis"
                        ? "bg-blue-500"
                        : t === "lesson"
                          ? "bg-amber-500"
                          : t === "trade_log"
                            ? "bg-violet-500"
                            : t === "weekly_review"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                    }`}
                  />
                  {entryTypeLabels[t]}
                </button>
              ))}
            </div>

            {/* Entry list */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-8 text-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No entries yet</p>
              </div>
            </div>
          </div>

          {/* Right: composer / placeholder */}
          <div className="md:col-span-2">
            {composing ? (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="border-b border-border px-4 py-3 flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={draft.type}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          type: e.target.value as EntryType,
                        }))
                      }
                      className="appearance-none text-xs font-medium bg-transparent focus:outline-none pr-5"
                    >
                      {entryTypes.map((t) => (
                        <option key={t} value={t}>
                          {entryTypeLabels[t]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-0.5 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Title"
                    className="w-full text-base font-medium bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                  />
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={draft.tickers}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          tickers: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="NVDA, MSFT, AVGO"
                      className="text-xs font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/40 w-full"
                    />
                  </div>
                  <textarea
                    value={draft.content}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, content: e.target.value }))
                    }
                    placeholder="Write your entry in markdown. Use @TICKER to cross-reference positions..."
                    rows={16}
                    className="w-full text-sm bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
                  />
                </div>
                <div className="border-t border-border px-4 py-3 flex items-center gap-3">
                  <button
                    disabled
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                  >
                    Save entry
                  </button>
                  <button
                    onClick={() => setComposing(false)}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Discard
                  </button>
                  <p className="text-[11px] text-muted-foreground ml-auto">
                    Connect Supabase to persist entries
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-24 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select an entry or write a new one
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-xs">
                  Use @TICKER in entries to link to positions and pattern
                  firings automatically.
                </p>
                <button
                  onClick={() => setComposing(true)}
                  className="mt-5 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New entry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SignalLayout>
  );
}
