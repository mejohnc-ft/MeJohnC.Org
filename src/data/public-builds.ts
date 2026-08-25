/**
 * Public open-source builds for the Projects tab. These are personal
 * projects with public repositories — statically defined, like the
 * Territories card, so they render without a database and stay versioned
 * with the site.
 */

export interface PublicBuild {
  id: string;
  name: string;
  /** Short category line shown under the title, with the maturity label. */
  category: string;
  status: "Alpha" | "Public build";
  description: string;
  tech: [string, string, string];
  /** Mono glyph rendered in the card header when there is no image. */
  glyph: string;
  /** Preview image path under /public; falls back to the glyph. */
  image?: string;
  url: string;
}

export const publicBuilds: PublicBuild[] = [
  {
    id: "cadre",
    name: "Cadre",
    category: "Agent Control Plane",
    status: "Alpha",
    description:
      "A personal agent control plane: every agent gets a real computer of its own, and every action is decided by policy before it happens and recorded after.",
    tech: ["TypeScript", "PostgreSQL", "Open Source"],
    glyph: "cadre",
    url: "https://github.com/mejohnc-ft/cadre",
  },
  {
    id: "shot-pill",
    name: "Shot Pill",
    category: "Agent Tooling",
    status: "Public build",
    description:
      "Capture a screenshot on your Mac and the remote path lands on an SSH-connected machine's clipboard — visual-context delivery for agentic coding fleets.",
    tech: ["Swift", "SSH", "macOS"],
    glyph: "⌃⌥⌘S",
    image: "/projects/shot-pill.png",
    url: "https://github.com/mejohnc-ft/pill-shot",
  },
  {
    id: "rewst-m365-utilization",
    name: "M365 Utilization Report",
    category: "Community Workflow",
    status: "Public build",
    description:
      "A signed Rewst workflow bundle and report template combining license inventory, sign-in recency, and workload activity into client-ready utilization reporting.",
    tech: ["Rewst", "Microsoft Graph", "Jinja"],
    glyph: "M365",
    image: "/projects/m365-utilization.png",
    url: "https://github.com/mejohnc-ft/Rewst-M365-Utilization-Report",
  },
  {
    id: "notmyrouter",
    name: "NotMyRouter",
    category: "Network Evidence",
    status: "Public build",
    description:
      "Continuous gateway and DNS probes render an automated verdict — charts, incident log, and an escalation toolkit — proving whether your ISP or your router is at fault.",
    tech: ["Python", "Cross-platform", "Networking"],
    glyph: "PING",
    image: "/projects/notmyrouter.jpg",
    url: "https://github.com/mejohnc-ft/NotMyRouter",
  },
  {
    id: "terminalbrain",
    name: "TerminalBrain",
    category: "MCP Server",
    status: "Public build",
    description:
      "A native macOS control surface exposing Apple Notes, Drafts, and Obsidian to agents over MCP — local-first memory with governed writeback.",
    tech: ["Swift", "MCP", "Obsidian"],
    glyph: "MCP",
    url: "https://github.com/mejohnc-ft/TerminalBrain",
  },
];
