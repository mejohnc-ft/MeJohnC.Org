import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/lib/theme";
import { KeyboardFocusProvider } from "@/lib/keyboard-focus";
import ProjectTimeline from "@/components/ProjectTimeline";
import AiProductsPanel from "@/components/portfolio/AiProductsPanel";
import {
  orderProductBriefs,
  portfolioThesis,
  productBriefs,
} from "@/data/ai-products";
import {
  DEFAULT_TIMELINE_TRACK,
  TIMELINE_TRACKS,
  defaultAiProductEntries,
  defaultTimelineData,
  entriesForTrack,
  normalizeTimelineTrack,
  resolveTimelineTrack,
} from "@/data/timeline-tracks";
import {
  formatTalkTimestamp,
  sortTalksByDateDesc,
  talks,
  type Talk,
} from "@/data/talks";
import TalksSection from "@/components/portfolio/TalksSection";
import {
  aboutFaqSchema,
  buildCreativeWorkJsonLd,
  buildOccupationJsonLd,
  buildPersonJsonLd,
  buildWebsiteJsonLd,
  personSchema,
  softwareSchema,
  occupationSchema,
} from "@/lib/seo";

vi.mock("@/lib/supabase", () => ({
  useSupabaseClient: () => null,
}));

vi.mock("@/lib/supabase-queries", () => ({
  getTimelineWithEntries: vi.fn(),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  const passThrough = actual.forwardRef(function Motion(
    {
      children,
      ...props
    }: {
      children?: actual.ReactNode;
      [key: string]: unknown;
    },
    ref,
  ) {
    const rest = { ...props } as Record<string, unknown>;
    delete rest.initial;
    delete rest.animate;
    delete rest.exit;
    delete rest.transition;
    delete rest.whileHover;
    delete rest.whileTap;
    delete rest.variants;
    delete rest.layout;
    return actual.createElement("div", { ...rest, ref }, children);
  });

  return {
    motion: new Proxy(
      {},
      {
        get: () => passThrough,
      },
    ),
    AnimatePresence: ({ children }: { children: actual.ReactNode }) => children,
  };
});

function renderTimeline() {
  return render(
    <ThemeProvider>
      <KeyboardFocusProvider>
        <ProjectTimeline />
      </KeyboardFocusProvider>
    </ThemeProvider>,
  );
}

describe("Success Roadmap tracks", () => {
  it("lists AI Products first and Endpoint Logistics second", () => {
    expect(TIMELINE_TRACKS.map((track) => track.id)).toEqual([
      "ai-products",
      "endpoint-logistics",
    ]);
    expect(DEFAULT_TIMELINE_TRACK).toBe("ai-products");
  });

  it("defaults unknown track query values to AI Products", () => {
    expect(resolveTimelineTrack(null)).toBe("ai-products");
    expect(resolveTimelineTrack("nope")).toBe("ai-products");
    expect(resolveTimelineTrack("endpoint-logistics")).toBe(
      "endpoint-logistics",
    );
  });

  it("treats missing DB track as endpoint logistics so live year pills stay on that track", () => {
    expect(normalizeTimelineTrack(undefined)).toBe("endpoint-logistics");
    expect(normalizeTimelineTrack("ai-products")).toBe("ai-products");
  });

  it("keeps the provisioning year history on Endpoint Logistics", () => {
    const years = entriesForTrack(
      defaultTimelineData,
      "endpoint-logistics",
    ).map((entry) => entry.label);
    expect(years).toEqual(["2022-2023", "2024", "2025", "2026+"]);
  });

  it("renders AI Products selected by default", async () => {
    renderTimeline();
    const ai = screen.getByRole("tab", { name: "AI Products" });
    const logistics = screen.getByRole("tab", { name: "Endpoint Logistics" });
    expect(ai).toHaveAttribute("aria-selected", "true");
    expect(logistics).toHaveAttribute("aria-selected", "false");
    expect(
      await screen.findByRole("heading", {
        name: "Governed AI for the Enterprise work I ship",
      }),
    ).toBeInTheDocument();
  });

  it("switches to Endpoint Logistics and shows year pills", async () => {
    const user = userEvent.setup();
    renderTimeline();
    await user.click(screen.getByRole("tab", { name: "Endpoint Logistics" }));
    expect(screen.getByRole("tab", { name: "2022-2023" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2026+" })).toBeInTheDocument();
    expect(
      screen.getByText(/inherited a provisioning backlog/i),
    ).toBeInTheDocument();
  });
});

const PUBLIC_CATEGORY_TITLES = [
  "Service Delivery",
  "Portfolio Management",
  "Deep Research / Technical investigations",
  "Multimodal Enterprise Agent",
  "Agentic Application OS Platform",
  "Agent and Compute Federation Platform",
  "DevOps Teammate",
] as const;

describe("AI Products briefs", () => {
  it("includes the portfolio thesis and seven public categories", () => {
    expect(portfolioThesis.lead).toMatch(/app platform/i);
    expect(portfolioThesis.lead).toMatch(/individual apps/i);
    expect(portfolioThesis.lead).toMatch(/federation/i);
    expect(portfolioThesis.lead).toMatch(/stewarded/i);
    expect(portfolioThesis.lead).toMatch(/idea/i);
    expect(portfolioThesis.lead).toMatch(/completion/i);
    expect(portfolioThesis.lead).toMatch(/not yet one uniformly integrated/i);
    expect(portfolioThesis.lead).toMatch(/IT leaders/i);
    expect(portfolioThesis.title).toBe(
      "Governed AI for the Enterprise work I ship",
    );
    expect(portfolioThesis.title).not.toMatch(/MSP|managed.?service/i);
    expect(portfolioThesis.lead).not.toMatch(/MSP|managed.?service/i);
    expect(portfolioThesis.honestClaim).toMatch(
      /not yet one uniformly integrated/i,
    );
    expect(productBriefs.map((brief) => brief.name)).toEqual([
      ...PUBLIC_CATEGORY_TITLES,
    ]);
    expect(defaultAiProductEntries.map((entry) => entry.label)).toEqual([
      ...PUBLIC_CATEGORY_TITLES,
    ]);
    const portfolio = productBriefs.find(
      (brief) => brief.id === "client-toolbox",
    );
    expect(portfolio?.name).toBe("Portfolio Management");
    expect(portfolio).not.toHaveProperty("owner");
    expect(portfolio?.capabilities.length).toBeGreaterThanOrEqual(3);
    expect(portfolio?.capabilities.length).toBeLessThanOrEqual(5);
  });

  it("keeps recruiter-length briefs without launch-status or internal sequels", () => {
    const leadWords = portfolioThesis.lead.trim().split(/\s+/).length;
    expect(leadWords).toBeGreaterThanOrEqual(40);
    expect(leadWords).toBeLessThanOrEqual(80);

    for (const brief of productBriefs) {
      expect(brief.tagline.trim().split(/\s+/).length).toBeLessThanOrEqual(40);
      expect(brief.capabilities.length).toBeLessThanOrEqual(5);
      expect(brief.stack.length).toBeGreaterThanOrEqual(4);
      expect(brief.stack.length).toBeLessThanOrEqual(8);
      expect(brief).not.toHaveProperty("owner");
      expect(brief).not.toHaveProperty("readiness");
      expect(brief).not.toHaveProperty("preGa");
      expect(brief).not.toHaveProperty("target");
    }

    const federation = productBriefs.find((brief) => brief.id === "accessai");
    expect(federation?.name).toBe("Agent and Compute Federation Platform");
    expect(federation?.tagline).toMatch(/control plane/i);
    expect(federation?.tagline).not.toMatch(/pre-GA|preGA|general.?availab/i);
    expect(federation?.tagline).not.toMatch(/accessAI/i);
  });

  it("keeps internal process language off public product copy", () => {
    const publicCopy = [
      JSON.stringify(portfolioThesis),
      JSON.stringify(productBriefs),
      JSON.stringify(TIMELINE_TRACKS),
      JSON.stringify(defaultAiProductEntries),
      softwareSchema.description,
      occupationSchema.description,
      aboutFaqSchema.questions.map((item) => item.answer).join(" "),
      readFileSync("public/llms.txt", "utf8"),
    ].join("\n");

    expect(publicCopy).not.toMatch(/pre-GA|preGA|general.?availab/i);
    expect(publicCopy).not.toMatch(
      /\b(Cadre|Spark|Spot|Vantage|Navigate|Knowledge|AI Triage)\b/,
    );
    expect(publicCopy).not.toMatch(/Still coming/i);

    const visibleCopy = [
      portfolioThesis.title,
      portfolioThesis.lead,
      ...portfolioThesis.tags,
      ...portfolioThesis.loop.map((step) => step.detail),
      portfolioThesis.honestClaim,
      portfolioThesis.agentAuthority,
      ...productBriefs.flatMap((brief) => [
        brief.name,
        brief.tagline,
        ...brief.chips,
        ...brief.capabilities,
        brief.shipped,
      ]),
      ...defaultAiProductEntries.flatMap((entry) => [
        entry.label,
        entry.phase,
        entry.summary ?? "",
      ]),
      softwareSchema.name,
      softwareSchema.description,
      ...(softwareSchema.keywords ?? []),
      occupationSchema.description,
      aboutFaqSchema.questions.map((item) => item.answer).join(" "),
      readFileSync("public/llms.txt", "utf8"),
    ].join("\n");

    expect(visibleCopy).not.toMatch(/Client Toolbox/);
    expect(visibleCopy).not.toMatch(/Service Desk Toolbox/);
    expect(visibleCopy).not.toMatch(/Incident Buddy/);
    expect(visibleCopy).not.toMatch(/SD Toolbox/);
    expect(visibleCopy).not.toMatch(/\bvITM\b/);
    expect(visibleCopy).not.toMatch(/\bIris\b/);
    expect(visibleCopy).not.toMatch(/Iris OS|irisOS/i);
    expect(visibleCopy).not.toMatch(/\bProxima\b/);
    expect(visibleCopy).not.toMatch(/accessAI/);
  });

  it("only briefs the seven public categories", () => {
    const ids = productBriefs.map((brief) => brief.id);
    expect(ids).toEqual([
      "service-desk-toolbox",
      "client-toolbox",
      "deep-research",
      "iris",
      "iris-os",
      "accessai",
      "proxima",
    ]);
    expect(portfolioThesis).not.toHaveProperty("namedSeams");
  });

  it("orders briefs from timeline entry keys when present", () => {
    const ordered = orderProductBriefs([
      {
        id: "x",
        label: "Multimodal Enterprise Agent",
        phase: "AI",
        summary: null,
        content: null,
        dot_position: 1,
        track: "ai-products",
        entry_key: "iris",
      },
    ]);
    expect(ordered[0].id).toBe("iris");
    expect(ordered.map((brief) => brief.id)).toContain("client-toolbox");
    expect(ordered.map((brief) => brief.id)).toContain("deep-research");
    expect(ordered.map((brief) => brief.id)).toContain("iris-os");
  });

  it("renders thesis copy and at least one product brief", async () => {
    render(
      <ThemeProvider>
        <AiProductsPanel />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Governed AI for the Enterprise work I ship",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/14 normalized briefs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/readiness ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/owner toby/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Service Delivery" }),
    ).toHaveAttribute("aria-selected", "true");
    for (const title of PUBLIC_CATEGORY_TITLES) {
      expect(screen.getByRole("tab", { name: title })).toBeInTheDocument();
    }
    expect(
      screen.getByText("Product categories I've shipped in."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/named seams/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/second catalog/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/also in the loop/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/technician workspace that routes tickets/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/What I shipped/i)).toBeInTheDocument();
    expect(screen.queryByText("Client Toolbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Iris")).not.toBeInTheDocument();
    expect(screen.queryByText("Proxima")).not.toBeInTheDocument();
    expect(screen.queryByText("accessAI")).not.toBeInTheDocument();
    expect(screen.queryByText(/pre-GA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MSP/)).not.toBeInTheDocument();
    expect(screen.queryByText("Cadre")).not.toBeInTheDocument();
    expect(screen.queryByText("Spark")).not.toBeInTheDocument();
    expect(screen.queryByText(/still coming/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Cadre|Vantage|AI Triage/i),
    ).not.toBeInTheDocument();
  });
});

describe("Talks timestamps", () => {
  it("has no invented talks in the typed source", () => {
    expect(talks).toEqual([]);
  });

  it("sorts talks newest first by occurredAt", () => {
    const sample: Talk[] = [
      { id: "old", title: "Older talk", occurredAt: "2024-01-15" },
      { id: "new", title: "Newer talk", occurredAt: "2026-03-02" },
      { id: "mid", title: "Middle talk", occurredAt: "2025-11-01" },
    ];
    expect(sortTalksByDateDesc(sample).map((talk) => talk.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("formats UTC timestamps for display", () => {
    expect(formatTalkTimestamp("2026-03-02")).toBe("Mar 2, 2026");
  });

  it("renders a Talks section that does not invent titles", () => {
    render(<TalksSection />);
    expect(screen.getByRole("heading", { name: "Talks" })).toBeInTheDocument();
    expect(screen.getByText(/No talks posted yet/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here is invented/i)).toBeInTheDocument();
  });
});

describe("SEO helpers", () => {
  it("builds Person JSON-LD with recruiting-relevant knowsAbout", () => {
    const json = buildPersonJsonLd(personSchema, "https://mejohnc.org");
    expect(json["@type"]).toBe("Person");
    expect(json.jobTitle).toBe("AI Automation Engineer");
    expect(json.knowsAbout).toEqual(
      expect.arrayContaining(["Governed agents", "IT operations"]),
    );
    expect(json.worksFor).toEqual({
      "@type": "Organization",
      name: "centrexIT",
    });
  });

  it("builds Website, Occupation, and CreativeWork JSON-LD", () => {
    expect(
      buildWebsiteJsonLd({
        type: "Website",
        name: "MeJohnC",
        url: "https://mejohnc.org",
      })["@type"],
    ).toBe("WebSite");
    expect(buildOccupationJsonLd(occupationSchema).name).toBe(
      "AI Automation Engineer",
    );
    const work = buildCreativeWorkJsonLd(softwareSchema, "https://mejohnc.org");
    expect(work.url).toBe("https://mejohnc.org/portfolio?track=ai-products");
    expect(String(work.description)).toMatch(
      /^Governed AI for the Enterprise work I ship/,
    );
    expect(String(work.description)).toMatch(/app platform/i);
    expect(String(work.description)).toMatch(/federation/i);
    expect(String(work.description)).toMatch(/stewarded/i);
    expect(String(work.description)).toMatch(
      /not yet one uniformly integrated/i,
    );
    expect(String(work.description)).not.toMatch(
      /pre-GA|preGA|general.?availab/i,
    );
    expect(String(work.description)).not.toMatch(/MSP|managed.?service/i);
    expect(occupationSchema.description).not.toMatch(/MSP|managed.?service/i);
    expect(occupationSchema.description).not.toMatch(
      /pre-GA|preGA|general.?availab/i,
    );
  });
});
