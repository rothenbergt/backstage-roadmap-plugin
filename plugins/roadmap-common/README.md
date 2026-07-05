# @rothenbergt/backstage-plugin-roadmap-common

Shared types and constants for the [Backstage Roadmap Plugin](https://github.com/rothenbergt/backstage-roadmap-plugin). You normally don't install this package directly; it comes along as a dependency of the frontend and backend packages.

It contains:

- **Types**: `Feature`, `Comment`, `FeatureStatus`, and the board configuration types. API fields are camelCase with ISO 8601 UTC timestamps.
- **Permissions**: `roadmapCreatePermission` (`roadmap.create`), `roadmapAdminPermission` (`roadmap.admin`), and the `roadmapPermissions` list for policy authors.
- **Events and signals constants**: the `roadmap` events topic, action names for every mutation, the `roadmap:board` signals channel, and the `RoadmapSignal` payload type, for anyone subscribing to roadmap changes from their own modules.

See the [main README](https://github.com/rothenbergt/backstage-roadmap-plugin#readme) for plugin setup, and each package's `report.api.md` for the exact public API.
