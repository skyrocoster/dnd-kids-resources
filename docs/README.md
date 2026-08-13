# Documentation Router

Start here after reading [the repository instructions](../AGENTS.md). This page is the concise route to
current contracts and planning workflow.

## Current references

Read [canonical documentation](canonical/README.md) for architecture, API, data model, design system,
UX patterns, and testing. These references own current facts and expose their own `title`, `purpose`, and
`read-when` metadata.

## Planning and orchestration

- Use [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) for focused Plans and nested work orders under
  `plans/active/<feature>/orders/`.
- Use [MASTER_PLAN_TEMPLATE.md](MASTER_PLAN_TEMPLATE.md) for broad destinations and independently
  selectable slices.
- Active and completed Plans are discovered directly from `plans/active/` and `plans/done/`; local Plan
  metadata and nested order artifacts are authoritative. There is no central inventory or Plan index.

Use the workflow and safety rules in [../AGENTS.md](../AGENTS.md). Historical documentation is not retained
as a parallel archive; Git history is the archive.
