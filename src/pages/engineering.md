---
layout: ../layouts/Article.astro
title: Agent systems and operational knowledge
description: How Jonathan Christensen connects agent tooling, reusable knowledge, and customer-facing IT delivery.
---
I started with the work people were doing by hand. Now I build tools that turn that experience into repeatable workflows, shared context, and standards the next person can use.

## AMD hardware and inference

I build and operate a personal AMD GPU lab. [The ROCm case study](/rocm-lab/) shows my four-GPU build and preserved single- and dual-R9700 inference experiments, including Python benchmark tooling, RCCL comparisons, and context-capacity testing.

## Agent controls and reusable instructions

[Cadre](/projects/cadre/) is my personal agent control plane, currently in **Alpha**. Its artifact registry versions reusable instructions and projects them into harness-specific files such as `CLAUDE.md` and `AGENTS.md`. Instructions can be assigned to agent workspaces instead of being copied independently into each one.

The connection layer uses grant checks, per-connection egress policies, and action audit records. These are access controls; they are distinct from retrieval quality or long-term agent memory.

While reviewing browser interaction, I found that accessibility snapshots could echo typed secrets into model context. I built a scrub layer and documented residual risks. That finding concerns credential exposure through a context source; it should not be confused with a demonstrated prompt-injection exploit.

[Cadre source](https://github.com/mejohnc-ft/cadre)

## Getting useful context to agents

[TerminalBrain](/projects/terminalbrain/) exposes Apple Notes, Drafts, and Obsidian through MCP, with governed writeback. [Shot Pill](/projects/shot-pill/) delivers screenshots from my Mac into a remote coding workflow over SSH. Both address a practical part of agent work: getting the right information to the system that needs it.

## Knowledge that can be checked and reused

[Territories](/projects/territories/) publishes 50 visual-style guides for people and agents. Each has structured resources, including tokens, implementation guidance, and checklists. Automated checks verify versioned resource parity, example/token consistency, and 72 supported picker combinations.

These are deterministic checks on published resources. They are not a substitute for evaluating an agent's nondeterministic behavior.

[Agent entry point](/territories/agent.md) · [Compare working examples](/territories/compare/)

## Delivery shaped by field experience

At centrexIT, I moved from frontline support into provisioning, field support, and automation. I cleared a 72-ticket backlog and rebuilt the preparation process before automating it. On the fresh-machine onboarding path, active technician effort fell from roughly 45 minutes to two minutes, with human quality checks retained.

That experience informs my current service tools and reporting: understand the task, build with the people doing it, and leave a process the next team can own. The public replicas use fictional data; they illustrate interactions rather than exposing live customer systems.

[Work history](/work/) · [Service Toolbox replica](/projects/service-toolbox/) · [M365 reporting contribution](/projects/rewst-m365-utilization/) · [Talks and features](/media/)
