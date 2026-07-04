# @rothenbergt/backstage-plugin-search-backend-module-roadmap

## 0.2.0

### Minor Changes

- ddd4137: Add Backstage notifications, global search indexing, and feature deep links.

  - The backend now sends notifications through the Backstage notifications service: feature authors are notified when their suggestion changes status or receives a comment, and `roadmap.adminUsers` (user or group refs) are notified when a new feature is suggested. The acting user is never notified about their own action, and each event uses its own topic (`new-features`, `status-changes`, `comments`) so users can opt out per topic in their Backstage notification settings. Roadmap works unchanged when the notifications backend is not installed.
  - New package `@rothenbergt/backstage-plugin-search-backend-module-roadmap` indexes roadmap features into Backstage search.
  - The board now supports deep links: `/roadmap?feature=<id>` opens the feature details drawer directly, and notification links and search results point there.
  - The backend package now ships a config schema (`config.d.ts`) covering all `roadmap.*` options, with the GitLab token marked as secret.
