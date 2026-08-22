import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyboardFocusProvider } from "@/lib/keyboard-focus";
import WorkTab, {
  defaultCaseStudies,
  metricSubtitle,
} from "@/components/portfolio/WorkTab";

vi.mock("@/lib/supabase", () => ({
  useSupabaseClient: () => null,
}));

vi.mock("@/lib/supabase-queries", () => ({
  getCaseStudies: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/components/ProjectTimeline", () => ({
  default: () => null,
}));

vi.mock("@/components/Experience", () => ({
  default: () => null,
}));

function renderWorkTab() {
  return render(
    <KeyboardFocusProvider>
      <WorkTab onRequestFocusUp={() => undefined} />
    </KeyboardFocusProvider>,
  );
}

describe("Results case studies", () => {
  it("leads with the sanctioned +133% card and keeps four public-safe stories", () => {
    expect(defaultCaseStudies.map((study) => study.metric)).toEqual([
      "+133%",
      "2 min",
      "clean",
      "50%",
    ]);
    expect(defaultCaseStudies[0].title).toMatch(/automation hours/i);
    expect(defaultCaseStudies[1].after).toMatch(/Immy\.Bot/);
    expect(defaultCaseStudies[1].after).toMatch(/Rewst/);
    expect(defaultCaseStudies.some((study) => study.metric === "100%")).toBe(
      false,
    );
  });

  it("does not leak internal strategy notes", () => {
    const blob = JSON.stringify(defaultCaseStudies);
    expect(blob).not.toMatch(/184|429|700k|coworker|acquisition|promotion/i);
    expect(blob).not.toMatch(/no one else performs/i);
    expect(blob).not.toMatch(/manaual|iommy/i);
  });

  it("derives the metric subtitle instead of always saying improvement", () => {
    expect(metricSubtitle("+133%")).toBe("improvement");
    expect(metricSubtitle("50%")).toBe("improvement");
    expect(metricSubtitle("2 min")).toBe("from 45 min");
    expect(metricSubtitle("clean")).toBeNull();
  });

  it("renders first-person Work intro and the four Results cards", async () => {
    renderWorkTab();

    expect(
      screen.getByText(/latest work I led or shipped/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/John owns or leads/i)).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Automation hours, same billed labor",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    expect(screen.getByText("from 45 min")).toBeInTheDocument();
    expect(screen.getByText("clean")).toBeInTheDocument();
    expect(screen.queryByText(/never been higher/i)).not.toBeInTheDocument();
  });
});
