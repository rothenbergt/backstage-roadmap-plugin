# @rothenbergt/backstage-plugin-roadmap-common

## 0.4.0

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

## 0.3.0

### Minor Changes

- 565cb1f: Upgrade Backstage from 1.44.1 to 1.48.3 and migrate to the new frontend system

## 0.2.0

### Minor Changes

- d117fe3: Set up changesets for automated release management and update Backstage dependencies to latest versions
