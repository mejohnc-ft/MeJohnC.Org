import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KeyboardFocusProvider } from "@/lib/keyboard-focus";
import { ThemeProvider } from "@/lib/theme";
import WorkTab from "@/components/portfolio/WorkTab";
import { careerClaims, headlineCareerClaims } from "@/data/career-evidence";

vi.mock("@/lib/supabase", () => ({
  useSupabaseClient: () => null,
}));

vi.mock("@/lib/supabase-queries", () => ({
  getCaseStudies: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/components/Experience", () => ({
  default: () => null,
}));

function renderWorkTab() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <KeyboardFocusProvider>
          <WorkTab />
        </KeyboardFocusProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("Career evidence", () => {
  it("keeps the headline proof stable, bounded, and free of forecasts", () => {
    expect(headlineCareerClaims.map((claim) => claim.metric)).toEqual([
      "836.3h",
      "45 → ~2 min",
      "72",
    ]);
    expect(
      headlineCareerClaims.every(
        (claim) => claim.evidenceClass !== "Projection",
      ),
    ).toBe(true);
    expect(
      careerClaims.find((claim) => claim.id === "automation-throughput")
        ?.headline,
    ).toBe(false);
    expect(
      careerClaims.find((claim) => claim.id === "strategy-capacity")
        ?.exclusions,
    ).toMatch(/not included in measured/i);
  });

  it("renders one calm career narrative with detail progressively disclosed", () => {
    renderWorkTab();

    expect(
      screen.getByRole("heading", {
        name: /I learned the work from the inside\. Now I redesign it at scale/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI Automation Engineer · centrexIT/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/giving people room to think/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The work changed\. The method did not/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /What changed/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("836.3h").length).toBeGreaterThan(0);
    expect(screen.getByText("45 → ~2 min")).toBeInTheDocument();
    expect(screen.getAllByText("72").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Measurement note/i)).toHaveLength(3);
    expect(
      screen.getByRole("heading", {
        name: /A service team needed leverage, not another tool/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Read the service-delivery case/i }),
    ).toHaveAttribute("href", "/work/service-delivery-automation");
    expect(
      screen.getByRole("link", { name: /Watch the Rewst interview/i }),
    ).toHaveAttribute(
      "href",
      "https://rewst.io/resources/webinar/stop-waiting-start-now-scale-fast-centrexits-playbook",
    );
    expect(
      screen.getByRole("heading", {
        name: /Go deeper when the detail is useful/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Two progress histories/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Role chronology/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Provisioning & Logistics/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: /AI & Automation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Public talks and walkthroughs/i }),
    ).toHaveAttribute("href", "/speaking");
    expect(
      screen.getByRole("link", { name: /Product portfolio/i }),
    ).toHaveAttribute("href", "/products");
    expect(screen.queryByText(/pre-GA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/John owns or leads/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Browse all 14 outcomes/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /Outcome window/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pause outcome window/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/never been higher/i)).not.toBeInTheDocument();
  });
});
