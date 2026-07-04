# @rothenbergt/backstage-plugin-roadmap-backend

## 0.7.0

### Minor Changes

- ddd4137: Add Backstage notifications, global search indexing, and feature deep links.

  - The backend now sends notifications through the Backstage notifications service: feature authors are notified when their suggestion changes status or receives a comment, and `roadmap.adminUsers` (user or group refs) are notified when a new feature is suggested. The acting user is never notified about their own action, and each event uses its own topic (`new-features`, `status-changes`, `comments`) so users can opt out per topic in their Backstage notification settings. Roadmap works unchanged when the notifications backend is not installed.
  - New package `@rothenbergt/backstage-plugin-search-backend-module-roadmap` indexes roadmap features into Backstage search.
  - The board now supports deep links: `/roadmap?feature=<id>` opens the feature details drawer directly, and notification links and search results point there.
  - The backend package now ships a config schema (`config.d.ts`) covering all `roadmap.*` options, with the GitLab token marked as secret.

## 0.6.1

### Patch Changes

- 53c1060: Upgrade to Backstage release 1.52.1 (from 1.48.3), bumping all `@backstage/*` dependencies to their latest compatible versions via `backstage-cli versions:bump`. No consumer-facing API changes from the upgrade itself.

  Alongside the upgrade, the roadmap board UI received a visual refresh:

  - `FeatureCard`: flatter, less "floaty" card styling (subtler hover border/shadow instead of translate + elevation), tighter typography, a relative "created" timestamp footer, and keyboard accessibility (`role="button"`, `tabIndex`, Enter/Space to open).
  - `StatusChip`: adjusted status color tokens for better contrast in dark mode.
  - `RoadmapBoard`: column headers switched from colored icon badges to a small status-color dot, muted/translucent column panel backgrounds, refined count badges, and skeleton loading placeholders (`@material-ui/lab` `Skeleton`) instead of a spinner.
  - `FeatureDetailsDrawer`: header actions (edit/close) moved to compact icon buttons with tooltips, the "Suggested by / Created / Updated" meta block collapsed into a single inline line, and the vote/status/admin controls now live together in a bordered panel with a delete icon button replacing the old "Delete feature" text button.
  - `VoteButton`, `CommentSection`: matching styling tweaks for consistency with the refreshed design.

- Updated dependencies [53c1060]
  - @rothenbergt/backstage-plugin-roadmap-common@0.4.1

## 0.6.0

### Minor Changes

- 6f87319: ### Configurable board layout and server-driven filtering

  The roadmap board is no longer hard-coded to four columns. Optional `roadmap.columns` in `app-config.yaml` merges with sensible defaults so each status can have a custom title, visibility, and (for the built-in database datasource) per-column retention based on created or updated time. By default, In Progress still exists in config but stays hidden, so existing four-column boards look familiar until you opt in.

  The backend resolves that layout once and serves it at `GET /features/board-config`, together with capability flags telling the UI which extra actions are allowed for the active datasource. The main feature list (`GET /features`) is filtered server-side using the merged columns: items in hidden columns are dropped from the default response (smaller payloads). With the database datasource, retention windows further trim the default list; `GET /features?includeBeyondRetention=true` returns everything that is still allowed by column visibility (ignored for GitLab). The frontend loads board config via a dedicated hook, renders only visible columns (including In Progress when enabled), and shows a “Show all (including outdated)” switch when retention is configured and the backend allows it.

  ### Column order, lifecycle, and moderation (database datasource)

  A `board_position` column is added on `features` so cards can be ordered within each status. Roadmap admins can reorder items from the board using up/down controls; order is persisted with `PUT /features/reorder`. Admins can also edit title and description (`PUT /features/:id`), delete a feature (`DELETE /features/:id`), and delete comments (`DELETE /comments/:commentId`). Authors get a narrower path: they may edit or delete their own items only while the feature is still Suggested, matching the backend rules. The details drawer and comment list expose these flows with confirmations, alerts, and In Progress in the admin status picker where appropriate.

  ### GitLab datasource stays within its supported surface

  When `roadmap.source` is `gitlab`, the new write routes return 403, capability flags turn off retention toggles, reorder, edit/delete features, and admin comment deletion, and the UI hides those controls, so GitLab-backed deployments keep the behavior they already had (read, create, vote, admin status via labels) without implying unsupported GitLab changes.

  ### Shared types and API client

  `roadmap-common` now carries `board_position` on `Feature`, plus `RoadmapBoardColumnResolved`, `RoadmapUiCapabilities`, and `RoadmapBoardConfigResponse` so backend and frontend agree on the contract. The roadmap plugin API client adds `getBoardConfig`, optional `includeBeyondRetention` on `getFeatures`, the new mutations, and proper 403 / 204 handling.

  ### Bug fixes

  Feature cards on the board render descriptions with Backstage `MarkdownContent`, matching the details drawer. Markdown in the description (for example headings) is no longer shown as plain text with visible markdown characters in the column list.

  ### Housekeeping

  Root `package.json` pins `jwa` for both major lines that the `jws` dependency stacks rely on. Backend integration tests that need `better-sqlite3` skip automatically when the native binary does not match the running Node version, so the rest of the suite still runs locally after Node upgrades.

### Patch Changes

- Updated dependencies [6f87319]
  - @rothenbergt/backstage-plugin-roadmap-common@0.4.0

## 0.5.1

### Patch Changes

- 2d06659: Fix for potential clashes occuring when in group mode between projects due to using iid in cache

## 0.5.0

### Minor Changes

- 3f81184: Added GitLab group mode support. You can now use `groupId` instead of `projectId` to aggregate roadmap issues across all projects in a GitLab group. New features are created in the project specified by `defaultProjectId`.

## 0.4.0

### Minor Changes

- 6890a7b: Add optional GitLab datasource integration and permission-gated feature creation. The backend now supports
  roadmap.source: gitlab configuration to store roadmap features as GitLab issues. A new roadmapCreatePermission is
  enforced on both the backend route and the frontend create button. The RoadmapDatabase interface has been renamed to
  RoadmapDatasource to reflect the pluggable backend design.

## 0.3.1

### Patch Changes

- 332d130: Fix route ordering bug, input validation, error handling, and type safety improvements

## 0.3.0

### Minor Changes

- 565cb1f: Upgrade Backstage from 1.44.1 to 1.48.3 and migrate to the new frontend system

### Patch Changes

- Updated dependencies [565cb1f]
  - @rothenbergt/backstage-plugin-roadmap-common@0.3.0

## 0.2.0

### Minor Changes

- d117fe3: Set up changesets for automated release management and update Backstage dependencies to latest versions

### Patch Changes

- Updated dependencies [d117fe3]
  - @rothenbergt/backstage-plugin-roadmap-common@0.2.0
