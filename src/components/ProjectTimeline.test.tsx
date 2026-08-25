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
  defaultAiAutomationEntries,
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
import { defaultPortfolioExperiences } from "@/data/work-history";
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

describe("Career progress tracks", () => {
  it("restores provisioning first and keeps AI automation as the second view", () => {
    expect(TIMELINE_TRACKS.map((track) => track.id)).toEqual([
      "endpoint-logistics",
      "ai-products",
    ]);
    expect(TIMELINE_TRACKS.map((track) => track.label)).toEqual([
      "Provisioning & Logistics",
      "AI & Automation",
    ]);
    expect(DEFAULT_TIMELINE_TRACK).toBe("endpoint-logistics");
  });

  it("defaults unknown track query values to provisioning", () => {
    expect(resolveTimelineTrack(null)).toBe("endpoint-logistics");
    expect(resolveTimelineTrack("nope")).toBe("endpoint-logistics");
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
    expect(years).toEqual(["2022", "2022–2023", "2024", "2025"]);
  });

  it("renders the original provisioning roadmap selected by default", () => {
    renderTimeline();
    const ai = screen.getByRole("tab", { name: "AI & Automation" });
    const logistics = screen.getByRole("tab", {
      name: "Provisioning & Logistics",
    });
    expect(ai).toHaveAttribute("aria-selected", "false");
    expect(logistics).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "2022" })).toBeInTheDocument();
    expect(
      screen.getByText(/started with three months in Tier 1/i),
    ).toBeInTheDocument();
  });

  it("switches to AI and Automation with an honest 2023-to-2025 role transition", async () => {
    const user = userEvent.setup();
    renderTimeline();
    await user.click(screen.getByRole("tab", { name: "AI & Automation" }));
    expect(screen.getByRole("tab", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2026 YTD" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "2026 YTD" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(/returned 836\.3 hours in 2026 year to date/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a cash-savings or headcount-reduction claim/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "2023" }));
    expect(
      screen.getByText(/The formal full-time role followed in 2025/i),
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
    expect(portfolioThesis.lead).toMatch(/application platform/i);
    expect(portfolioThesis.lead).toMatch(/working apps/i);
    expect(portfolioThesis.lead).toMatch(/federation/i);
    expect(portfolioThesis.lead).toMatch(/stewarded/i);
    expect(portfolioThesis.lead).toMatch(/idea to completion/i);
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
    expect(defaultAiAutomationEntries.map((entry) => entry.label)).toEqual([
      "2023",
      "2024",
      "2025",
      "2026 YTD",
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
      expect(brief.role.length).toBeGreaterThan(0);
      expect(brief.status.length).toBeGreaterThan(0);
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
      JSON.stringify(defaultAiAutomationEntries),
      defaultPortfolioExperiences
        .flatMap((experience) => experience.highlights)
        .join(" "),
      softwareSchema.description,
      occupationSchema.description,
      aboutFaqSchema.questions.map((item) => item.answer).join(" "),
      readFileSync("public/llms.txt", "utf8"),
    ].join("\n");

    expect(publicCopy).not.toMatch(/pre-GA|preGA|general.?availab/i);
    // "Cadre" is no longer banned: it is the name of Jonathan's public
    // personal open-source project (github.com/mejohnc-ft/cadre).
    expect(publicCopy).not.toMatch(
      /\b(Spark|Spot|Vantage|Navigate|Knowledge|AI Triage)\b/,
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
      ...defaultAiAutomationEntries.flatMap((entry) => [
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
        entry_key: "iris",
      },
    ]);
    expect(ordered[0].id).toBe("iris");
    expect(ordered.map((brief) => brief.id)).toContain("client-toolbox");
    expect(ordered.map((brief) => brief.id)).toContain("deep-research");
    expect(ordered.map((brief) => brief.id)).toContain("iris-os");
  });

  it("renders the product catalog and at least one role-specific brief", async () => {
    render(
      <ThemeProvider>
        <AiProductsPanel />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("region", {
        name: "Enterprise AI product catalog",
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
      screen.getByText(
        "One brief per product, each labeled with its maturity.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/named seams/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/second catalog/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/also in the loop/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/technician workspace that routes tickets/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Co-builder and delivery lead/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Evidence/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Deployed internal capability/i),
    ).toBeInTheDocument();
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
  it("publishes the three verified Rewst appearances newest first", () => {
    expect(sortTalksByDateDesc(talks).map((talk) => talk.id)).toEqual([
      "centrex-it-automation-adoption-webinar",
      "rewst-flow-2026-community-live",
      "rewst-m365-license-reporting-community-contribution",
    ]);
    expect(talks.every((talk) => talk.url?.startsWith("https://"))).toBe(true);
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
    expect(formatTalkTimestamp("2026-06")).toBe("Jun 2026");
  });

  it("renders the supplied talks with public artwork and links", () => {
    render(<TalksSection />);
    expect(
      screen.getByRole("region", { name: "Speaking appearances" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /^Stop waiting, start now, scale fast/i,
      }),
    ).toHaveAttribute(
      "href",
      "https://rewst.io/resources/webinar/stop-waiting-start-now-scale-fast-centrexits-playbook",
    );
    expect(
      screen.getByRole("img", {
        name: /Microsoft 365 license cost reports/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No talks posted yet/i)).not.toBeInTheDocument();
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
    expect(work.url).toBe("https://mejohnc.org/products");
    expect(String(work.description)).toMatch(
      /^Governed systems I have led or shipped/,
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
