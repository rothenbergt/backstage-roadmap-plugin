---
'@rothenbergt/backstage-plugin-roadmap-common': major
'@rothenbergt/backstage-plugin-roadmap-backend': major
'@rothenbergt/backstage-plugin-roadmap': major
---

Live boards, an events integration seam, and a cleaned-up API contract.

**Breaking: consistent camelCase API types with ISO 8601 timestamps.**

- `Feature.created_at` / `updated_at` / `board_position` are now `createdAt` / `updatedAt` / `boardPosition`; `Comment.created_at` / `updated_at` are now `createdAt` / `updatedAt`. This applies to both the TypeScript types and the REST API responses.
- Timestamps are always ISO 8601 UTC (e.g. `2026-07-04T12:00:00.000Z`) regardless of datasource. Previously the format depended on the database driver (sqlite returned `YYYY-MM-DD HH:MM:SS`) and the GitLab datasource even converted its ISO timestamps down to that format to match.
- No database migration needed: table columns are unchanged; only the mapping layer at the API boundary is new.

New in this release:

- The backend publishes every roadmap change (create, update, delete, status change, vote, comment) to the Backstage events service on the `roadmap` topic, so other backend modules can subscribe and build automations. Optional: nothing changes if the events service is not installed.
- The backend broadcasts board changes over Backstage signals, and the board subscribes: open boards update live (new suggestions, vote counts, column moves) without a refresh. Also optional; without signals the board behaves exactly as before.
- Shared event/signal constants and the `RoadmapSignal` type are exported from the common package.
- The database layer is refactored into per-table stores (features, comments, votes) with explicit row-to-API mapping, fixing the class of bugs where snake_case rows leaked into camelCase types (comments now always return `featureId`).
- Store tests run against both sqlite and Postgres (via TestDatabases) and assert the ISO timestamp contract on both engines.
- Every package now ships a committed `report.api.md` (api-extractor), verified in CI, so public API changes are always explicit. All exports carry release tags.
