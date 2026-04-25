# @rothenbergt/backstage-plugin-roadmap-backend

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
