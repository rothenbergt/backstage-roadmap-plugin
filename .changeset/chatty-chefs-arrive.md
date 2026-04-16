---
'@rothenbergt/backstage-plugin-roadmap-backend': minor
'@rothenbergt/backstage-plugin-roadmap': minor
---

Add optional GitLab datasource integration and permission-gated feature creation. The backend now supports
roadmap.source: gitlab configuration to store roadmap features as GitLab issues. A new roadmapCreatePermission is
enforced on both the backend route and the frontend create button. The RoadmapDatabase interface has been renamed to
RoadmapDatasource to reflect the pluggable backend design.
