import {
  SERVICE_HOURS_RETURNED,
  SERVICE_HOURS_PERIOD,
} from "./career-evidence";

export interface PortfolioExperience {
  title: string;
  company: string;
  period: string;
  highlights: string[];
  tech: string[];
}

const AI_AUTOMATION_HIGHLIGHTS = [
  "Began automation work inside provisioning in 2023; moved into the formal AI Automation Engineer role in 2025.",
  "Set the vision and orchestrated an AI and automation portfolio spanning standards, design, agents, teammates, governance, UX/UI/DX, and the product roadmap.",
  "Applied the operating method developed through manual provisioning, process redesign, platform automation, and concurrent provisioning-lead, logistics, and field-support responsibility.",
  "Worked in a forward-deployed engineering capacity across operations, service delivery, triage, client management, and client success.",
  "Designed governed assistants and automation boundaries where people retain writeback, merge, deploy, and spend authority.",
  `Returned ${SERVICE_HOURS_RETURNED} service-delivery hours in ${SERVICE_HOURS_PERIOD}, measured and bounded — methodology on the case page.`,
];

const AI_AUTOMATION_TECH = [
  "TypeScript",
  "React",
  "Microsoft Graph",
  "Azure AI Foundry",
  "Rewst",
  "Halo",
  "Docker",
  "PostgreSQL",
  "Agent Orchestration",
  "AI Governance",
  "Forward-Deployed Engineering",
  "Product Strategy",
  "Service Design",
  "UX / UI / DX",
];

const COPY_CORRECTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Logisitcs/gi, "Logistics"],
  [/Logisics/gi, "Logistics"],
  [/desinging/gi, "designing"],
  [/obersvability/gi, "observability"],
  [/observatrion/gi, "observability"],
  [/Santization/gi, "Sanitization"],
  [/Sucessfully/gi, "Successfully"],
  [/\bahlf\b/gi, "half"],
  [/philospohies/gi, "philosophies"],
  [/acquistion/gi, "acquisition"],
  [/consitency/gi, "consistency"],
  [/Realtions/gi, "Relations"],
  [/Mangement/gi, "Management"],
  [/Intregration/gi, "Integration"],
  [/Trroubleshooting/gi, "Troubleshooting"],
  [/Buiilding/gi, "Building"],
  [/make over/gi, "makeover"],
];

export const defaultPortfolioExperiences: PortfolioExperience[] = [
  {
    title: "AI Automation Engineer",
    company: "centrexIT",
    period: "2025 — Present",
    highlights: AI_AUTOMATION_HIGHLIGHTS,
    tech: AI_AUTOMATION_TECH,
  },
  {
    title: "Field Support Engineer II · Provisioning Lead",
    company: "centrexIT",
    period: "2024 — 2025 · Concurrent functions",
    highlights: [
      "Continued owning the provisioning operating model while serving as the primary logistics coordinator and supporting field delivery.",
      "Connected provisioning requirements to onsite-engineer readiness, inventory movement, standards, and client delivery instead of treating logistics as a separate queue.",
      "Functioned as the provisioning lead across the combined scope while automation increasingly carried repeatable configuration work.",
    ],
    tech: [
      "Field Operations",
      "Provisioning Leadership",
      "Logistics Coordination",
      "Inventory Controls",
      "Immy.Bot",
      "Microsoft Intune",
      "Microsoft 365",
    ],
  },
  {
    title: "Provisioning Engineer",
    company: "centrexIT",
    period: "2022 — 2024",
    highlights: [
      "Spent roughly 18 months performing provisioning manually, building the operational context needed to redesign the process rather than automate assumptions.",
      "Cleared a 72-ticket backlog within six months while rebuilding SOPs, SLAs, inventory tracking, knowledge, and media-sanitization controls.",
      "Began automating the redesigned process in 2023, then accelerated deployment and configuration work on Immy.Bot while retaining human quality control.",
    ],
    tech: [
      "Immy.Bot",
      "Microsoft Intune",
      "Microsoft 365",
      "PowerShell",
      "Inventory Management",
      "Process Design",
      "Knowledge Management",
    ],
  },
  {
    title: "Tier 1 Service Desk Technician",
    company: "centrexIT",
    period: "2022 · 3 months",
    highlights: [
      "Started in frontline support before moving into provisioning, gaining direct exposure to technician workflows, client needs, handoffs, and escalation paths.",
    ],
    tech: ["Service Desk", "Ticket Triage", "Microsoft 365", "Client Support"],
  },
];

export function correctPortfolioCopy(value: string): string {
  return COPY_CORRECTIONS.reduce(
    (corrected, [pattern, replacement]) =>
      corrected.replace(pattern, replacement),
    value,
  );
}

export function curatePortfolioExperience(
  experience: PortfolioExperience,
): PortfolioExperience {
  const corrected: PortfolioExperience = {
    ...experience,
    title: correctPortfolioCopy(experience.title),
    highlights: experience.highlights.map(correctPortfolioCopy),
    tech: experience.tech.map(correctPortfolioCopy),
  };

  const isCentrexIt = corrected.company.toLowerCase() === "centrexit";
  const normalizedTitle = corrected.title.toLowerCase();
  const isCurrentAiRole =
    isCentrexIt && normalizedTitle.includes("ai automation engineer");

  if (isCurrentAiRole) {
    return defaultPortfolioExperiences[0];
  }

  if (isCentrexIt && normalizedTitle.includes("field support engineer")) {
    return defaultPortfolioExperiences[1];
  }

  if (isCentrexIt && normalizedTitle.includes("provisioning engineer")) {
    return defaultPortfolioExperiences[2];
  }

  if (
    isCentrexIt &&
    (normalizedTitle.includes("tier 1") || normalizedTitle.includes("t1"))
  ) {
    return defaultPortfolioExperiences[3];
  }

  return corrected;
}
