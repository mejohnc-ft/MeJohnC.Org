import { describe, expect, it } from "vitest";
import {
  correctPortfolioCopy,
  curatePortfolioExperience,
  defaultPortfolioExperiences,
} from "@/data/work-history";

describe("portfolio work history", () => {
  it("corrects the known live-content spelling defects", () => {
    expect(
      correctPortfolioCopy(
        "Logisitcs, desinging, obersvability, Vendor Realtions, and Trroubleshooting",
      ),
    ).toBe(
      "Logistics, designing, observability, Vendor Relations, and Troubleshooting",
    );
  });

  it("replaces the current AI Automation role with recruiter-ready evidence", () => {
    const curated = curatePortfolioExperience({
      title: "AI Automation Engineer II",
      company: "centrexIT",
      period: "August 2023 — Present",
      highlights: ["Old summary"],
      tech: ["LLMs"],
    });

    expect(curated.title).toBe("AI Automation Engineer");
    expect(curated.period).toBe("2025 — Present");
    expect(curated.highlights).toHaveLength(6);
    expect(curated.highlights.join(" ")).toMatch(
      /forward-deployed engineering/i,
    );
    expect(curated.highlights.join(" ")).toMatch(/836\.3/);
    expect(curated.highlights.join(" ")).toMatch(
      /automation work inside provisioning in 2023/i,
    );
    expect(curated.highlights.join(" ")).not.toMatch(/backdated|presented as/i);
    expect(curated.tech).toEqual(
      expect.arrayContaining([
        "TypeScript",
        "Azure AI Foundry",
        "AI Governance",
        "Forward-Deployed Engineering",
        "Service Design",
      ]),
    );
  });

  it("presents overlapping scope as one progression instead of inflated titles", () => {
    expect(defaultPortfolioExperiences.map((entry) => entry.title)).toEqual([
      "AI Automation Engineer",
      "Field Support Engineer II · Provisioning Lead",
      "Provisioning Engineer",
      "Tier 1 Service Desk Technician",
    ]);
    expect(defaultPortfolioExperiences[0].period).toBe("2025 — Present");
    expect(defaultPortfolioExperiences[1].period).toMatch(
      /Concurrent functions/i,
    );
    expect(defaultPortfolioExperiences[2].highlights.join(" ")).toMatch(
      /18 months performing provisioning manually/i,
    );
    expect(defaultPortfolioExperiences[2].highlights.join(" ")).toMatch(
      /automating the redesigned process in 2023/i,
    );
    expect(defaultPortfolioExperiences[3].period).toMatch(/3 months/i);

    const concurrentRole = curatePortfolioExperience({
      title: "Field Support Engineer II",
      company: "centrexIT",
      period: "August 2024 — Present",
      highlights: ["Stale summary"],
      tech: [],
    });
    expect(concurrentRole.title).toBe(
      "Field Support Engineer II · Provisioning Lead",
    );
    expect(concurrentRole.period).toMatch(/2024 — 2025 · Concurrent functions/);
  });
});
