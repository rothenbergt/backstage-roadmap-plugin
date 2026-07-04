---
'@rothenbergt/backstage-plugin-roadmap': minor
'@rothenbergt/backstage-plugin-roadmap-backend': patch
'@rothenbergt/backstage-plugin-roadmap-common': patch
---

Upgrade to Backstage release 1.52.1 (from 1.48.3), bumping all `@backstage/*` dependencies to their latest compatible versions via `backstage-cli versions:bump`. No consumer-facing API changes from the upgrade itself.

Alongside the upgrade, the roadmap board UI received a visual refresh:

- `FeatureCard`: flatter, less "floaty" card styling (subtler hover border/shadow instead of translate + elevation), tighter typography, a relative "created" timestamp footer, and keyboard accessibility (`role="button"`, `tabIndex`, Enter/Space to open).
- `StatusChip`: adjusted status color tokens for better contrast in dark mode.
- `RoadmapBoard`: column headers switched from colored icon badges to a small status-color dot, muted/translucent column panel backgrounds, refined count badges, and skeleton loading placeholders (`@material-ui/lab` `Skeleton`) instead of a spinner.
- `FeatureDetailsDrawer`: header actions (edit/close) moved to compact icon buttons with tooltips, the "Suggested by / Created / Updated" meta block collapsed into a single inline line, and the vote/status/admin controls now live together in a bordered panel with a delete icon button replacing the old "Delete feature" text button.
- `VoteButton`, `CommentSection`: matching styling tweaks for consistency with the refreshed design.
