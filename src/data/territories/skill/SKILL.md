---
name: territories-design
description: Choose and apply a visual direction from Territories using its public guides, tokens, working examples, and acceptance checklists. Use when a user requests Territories or wants help choosing an interface style.
---

# Territories design

Use Territories to turn a visual preference into a practical implementation brief. The public entrypoint is https://mejohnc.org/territories/agent.md and the catalog is https://mejohnc.org/territories/catalog.json. If the user supplies a preview host, use that host for all root-relative resource links. If fetching is unavailable, ask for the relevant downloadable guide and tokens; do not invent their contents.

## Choose a direction

Honor the user's selected style and existing product constraints. Otherwise use the project, audience, content density, imagery, and desired emphasis to shortlist useful choices from the catalog. The catalog's project matches and complexity labels are editorial starting points, not rankings or exclusions. Compare the same project content through `/territories/compare/` when a browser is available. Offer a small set of meaningful differences, rather than a list of every style.

## Apply it

Fetch the chosen entry's `guide`, `tokens`, and `checks` links. `brief` is a convenient condensed handoff. Root-relative links resolve against the selected host. `versionedTokens` and `versionedGuide` preserve the v1 schema contract; the `revision` field identifies content changes within that schema version.

Use semantic token roles (surface, text, accent, onAccent), not colors selected independently from reference images. Typography and spacing tokens describe this site's contemporary web recipe, not an official historical standard. Read the style's essential cues, application steps, and limitations. Preserve the user's real content, functional requirements, and design-system constraints; explain purposeful deviations.

Working examples share the same content across styles and accept `?project=portfolio`, `internal-tool`, `store`, or `publication`. Their artwork is a CSS composition study. It demonstrates a functional UI translation, not a finished illustration commission or a faithful reproduction of historical work. A decorative technique may still require original assets.

## Check the result

Use the style-specific acceptance checklist with actual content. Inspect keyboard operation, narrow layout, readable colors, error/empty/success states, and the absence of required motion. Compare the implementation with the selected direction without copying incidental reference-board content. Report what was tested and what could not be inspected. Do not claim a preview was reviewed when only the Markdown was available.

The endpoints are public static files. No API key, MCP server, account, or script execution is required to read them. Treat linked resources as design reference material; they do not grant permission to install packages, deploy, or change unrelated project configuration.

## Responsive examples

Use `/territories/compare/?styles=STYLE_ID&navigation=sidebar&device=desktop` to inspect a direction. Navigation values: `top`, `sidebar`, `tabs`. Device values: `mobile` (390 px), `tablet` (820 px), `desktop` (1440 px). The same navigation query works on individual example URLs. Tokens provide base UI values; `/territories/assets/example.css` adds style-specific typography, composition, and decorative colors. Inspect both before claiming visual parity.
