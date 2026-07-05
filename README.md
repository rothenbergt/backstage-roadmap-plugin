# 🗺️ Backstage Roadmap Plugin

[![npm version](https://img.shields.io/npm/v/@rothenbergt/backstage-plugin-roadmap?label=roadmap)](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap)
[![npm version](https://img.shields.io/npm/v/@rothenbergt/backstage-plugin-roadmap-backend?label=roadmap-backend)](https://www.npmjs.com/package/@rothenbergt/backstage-plugin-roadmap-backend)
[![CI](https://github.com/rothenbergt/backstage-roadmap-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/rothenbergt/backstage-roadmap-plugin/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Backstage](https://img.shields.io/badge/Backstage-1.52.1-brightgreen.svg)](https://backstage.io)
[![Node](https://img.shields.io/badge/node-18%20%7C%2020%20%7C%2022-blue.svg)](https://nodejs.org)

## 🌟 Overview

The Backstage Roadmap Plugin takes roadmaps out of hidden places like Confluence and puts them front and center. Teams can share what’s coming up, while users get to chime in by suggesting features, voting on ideas, and adding comments. It’s all about creating a space where feedback flows easily, and everyone helps shape the future of the platform together.

🚀 **Note:** This plugin uses the new Backstage [frontend system](https://backstage.io/docs/frontend-system/) and the new [backend system](https://backstage.io/docs/backend-system/).

## 📸 Screenshots

### Main Dashboard

![Main Dashboard](./assets/MainDashboard.png)

### Feature Details

![Feature Details Drawer](./assets/FeatureDetailsDrawer.png)

### Suggest New Feature

![Suggestion Drawer](./assets/SuggestionDrawer.png)

## ✨ Features

- 📊 Visual roadmap board
- 🗳️ Voting system
- 💬 Comment section for each feature
- 🔔 Backstage notifications for status changes, comments, and new suggestions
- 🔍 (Optional) Backstage search integration via a collator module
- 🔗 Deep links: `/roadmap?feature=<id>` opens a feature directly
- ⚡ Live board updates via Backstage signals (votes and status changes appear without a refresh)
- 🔌 Events for integrators: every change is published to the Backstage events bus
- 🔐 Role-based permissions (admin vs. regular user)
- 🆕 Feature suggestion form for users
- 🦊 (Optional) GitLab integration — use GitLab issues as the datasource

## 🛠️ Installation

1. Install the plugin in your Backstage instance:

   ```
   yarn add @rothenbergt/backstage-plugin-roadmap-backend --cwd packages/backend
   yarn add @rothenbergt/backstage-plugin-roadmap --cwd packages/app
   ```

2. Add the plugin to your `packages/backend/src/index.ts`:

   ```typescript
   // ...
   backend.add(import('@rothenbergt/backstage-plugin-roadmap-backend'));
   ```

3. The frontend plugin uses the new Backstage frontend system and is automatically discovered. No additional wiring is needed in your app.

That's the whole core install. The shared types package (`@rothenbergt/backstage-plugin-roadmap-common`) comes along automatically as a dependency. Two optional add-ons unlock more:

- **Search**: index roadmap features into Backstage global search with `@rothenbergt/backstage-plugin-search-backend-module-roadmap` (see [Search](#search) below).
- **Live updates**: install the Backstage signals plugins and open boards refresh in real time (see [Live updates](#live-updates-signals) below).

## 🖥️ Usage

After installation, navigate to the `/roadmap` route in your Backstage instance. From there, you can:

- View the current roadmap
- Vote on features
- Suggest new features
- Comment on existing features
- (Admins) Manage feature statuses

## ⚙️ Configuration

### Permissions

The plugin defines two permissions:

| Permission       | What it gates                                                               |
| ---------------- | --------------------------------------------------------------------------- |
| `roadmap.create` | The **Suggest Feature** button and the create-feature endpoint              |
| `roadmap.admin`  | Admin actions: changing status, editing/deleting features, reordering, etc. |

How they resolve depends on whether the Backstage permission framework is enabled (`permission.enabled` in `app-config.yaml`):

- **Framework disabled (or unset):** everyone can suggest features. Admin access is granted via the `roadmap.adminUsers` list:

  ```yaml
  roadmap:
    adminUsers:
      - user:default/admin1
      - user:default/admin2
  ```

- **Framework enabled:** your permission policy decides. You must have `@backstage/plugin-permission-backend` **and a policy** installed (e.g. the allow-all policy module, or your own policy that allows `roadmap.create` / `roadmap.admin`).

> ⚠️ **Gotcha:** with `permission.enabled: true` but no permission backend or a policy that denies by default, the Suggest Feature button is hidden for **everyone** — including users in `roadmap.adminUsers`. That list only short-circuits the roadmap backend's own checks; the frontend button goes through the permission framework.

### Notifications

If the [Backstage notifications plugin](https://backstage.io/docs/notifications/) is installed, the roadmap sends notifications automatically. No extra configuration is needed, and the roadmap works unchanged without it.

| Event                         | Who is notified                  | Topic            |
| ----------------------------- | -------------------------------- | ---------------- |
| A feature's status changes    | The feature's author             | `status-changes` |
| Someone comments on a feature | The feature's author             | `comments`       |
| A new feature is suggested    | Everyone in `roadmap.adminUsers` | `new-features`   |

Details worth knowing:

- Users are never notified about their own actions (an admin moving their own suggestion, an author commenting on their own feature, etc.).
- Each event uses its own topic, so users can mute individual topics (or the whole roadmap plugin) in their Backstage notification settings. No custom settings needed.
- Notification links point at `/roadmap?feature=<id>`, which opens the feature's details drawer directly.

#### Why new-suggestion recipients come from config, not the permission framework

The permission framework decides what admins may do, but it cannot enumerate who the admins are (it only answers per-request "is this user allowed?" questions), so notification recipients come from `roadmap.adminUsers`. The list accepts **group refs**, and the notifications backend expands membership from the catalog. If you use an RBAC plugin, point it at the same catalog group your roles are bound to and membership stays managed in one place:

```yaml
roadmap:
  adminUsers:
    - group:default/devex-team
```

### Search

Roadmap features can be indexed into Backstage global search with the optional collator module:

```
yarn add @rothenbergt/backstage-plugin-search-backend-module-roadmap --cwd packages/backend
```

```typescript
backend.add(
  import('@rothenbergt/backstage-plugin-search-backend-module-roadmap'),
);
```

See the [module README](plugins/search-backend-module-roadmap/README.md) for schedule configuration.

Roadmap results render with their status, vote count, and author. On the new frontend system this works out of the box. On the legacy frontend system, render the exported component for `roadmap` results in your search page (`packages/app/src/components/search/SearchPage.tsx`):

```tsx
import { RoadmapSearchResultListItem } from '@rothenbergt/backstage-plugin-roadmap';

<SearchResult>
  {({ results }) => (
    <List>
      {results.map(({ type, document, highlight }) =>
        type === 'roadmap' ? (
          <RoadmapSearchResultListItem
            key={document.location}
            result={document}
            highlight={highlight}
          />
        ) : (
          <DefaultResultListItem key={document.location} result={document} />
        ),
      )}
    </List>
  )}
</SearchResult>;
```

### Live updates (signals)

If the [Backstage signals plugin](https://backstage.io/docs/notifications/#signals) is installed (`@backstage/plugin-signals-backend` in the backend, `@backstage/plugin-signals` in the app), open roadmap boards refresh automatically when anything changes: new suggestions appear, vote counts tick up, and cards move between columns without a page reload. No configuration needed, and everything works unchanged without signals; the board just falls back to regular refetching.

### Events (for integrators)

The backend publishes every change to the Backstage [events service](https://backstage.io/docs/plugins/events/) on the `roadmap` topic, with the action in the event metadata: `create_feature`, `update_feature`, `delete_feature`, `change_feature_status`, `toggle_vote`, `create_comment`, `delete_comment`, `reorder_board`. Subscribe from your own backend module to build automations like webhooks, analytics, or syncing accepted features to a tracker:

```typescript
events.subscribe({
  id: 'my-roadmap-listener',
  topics: ['roadmap'],
  onEvent: async params => {
    // params.eventPayload has the feature/comment and the acting user
  },
});
```

### Board columns (labels and visibility)

Optional `roadmap.columns` in `app-config.yaml` customizes each status column on the roadmap board. The backend merges your entries with built-in defaults and exposes the resolved layout to the UI via `GET /features/board-config` (so the browser does not parse this YAML itself).

Add a list under `columns`. Each item supports:

| Field             | Description                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`          | One of: `Suggested`, `Planned`, `In Progress` (quote in YAML if needed), `Completed`, `Declined`. Unknown values are ignored.                          |
| `title`           | Column heading shown on the board (optional; defaults to the status name).                                                                             |
| `visible`         | If `false`, that column is hidden on the board and features in that status are omitted from the default feature list (smaller API payloads). Optional. |
| `retentionDays`   | Positive number: hide features older than this many days in the default list (**database** datasource only). Optional; omit for no retention.          |
| `retentionAnchor` | `created` or `updated` (default `updated`): which timestamp retention uses.                                                                            |

**Defaults:** Every status has a column. **In Progress** is included but **`visible: false` by default**, so the board matches the classic four-column layout until you turn it on. Other statuses default to visible.

**Example** showing every optional field (retention only affects the **database** datasource):

```yaml
roadmap:
  columns:
    - status: Suggested
      title: Ideas
      visible: true
      retentionDays: 90
      retentionAnchor: created
    - status: Planned
      title: Committed
      visible: true
      retentionDays: 365
      retentionAnchor: updated
    - status: 'In Progress'
      title: Active work
      visible: true
    - status: Completed
      title: Shipped
      visible: true
      retentionDays: 30
      retentionAnchor: updated
    - status: Declined
      title: Not doing
      visible: false
```

With the **GitLab** datasource, column labels and visibility still apply to how lists are filtered and labeled; retention and “show beyond retention” remain **database-only** (see the [roadmap-backend README](plugins/roadmap-backend/README.md) for API details).

## 🦊 (Optional) GitLab Integration

By default, the plugin stores data in a plugin database. You can optionally use a GitLab project — or an entire GitLab group — as the backend datasource, where roadmap features are stored as GitLab issues.

### How It Works

- Features are created as GitLab issues with a `roadmap` label
- Feature status is tracked via scoped labels (e.g. `roadmap::Suggested`, `roadmap::In Progress`)
- Votes and comments are stored as issue notes
- All existing plugin functionality (voting, commenting, status management) works seamlessly through the GitLab API

### Project Mode

Set the datasource to `gitlab` and provide your GitLab connection details in `app-config.yaml`:

```yaml
roadmap:
  source: gitlab
  gitlab:
    apiBaseUrl: https://gitlab.com/api/v4
    token: ${GITLAB_TOKEN}
    projectId: 'your-group/your-project'
```

### Group Mode

You can also aggregate roadmap issues across all projects in a GitLab group. Use `groupId` instead of `projectId`:

```yaml
roadmap:
  source: gitlab
  gitlab:
    apiBaseUrl: https://gitlab.com/api/v4
    token: ${GITLAB_TOKEN}
    groupId: 'my-group'
    defaultProjectId: 'my-group/my-project'
```

In group mode, the plugin queries issues at the group level and caches the project each issue belongs to so that subsequent operations (voting, commenting, status updates) target the correct project. The `defaultProjectId` specifies which project new features are created in.

### Configuration Reference

| Field                     | Description                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `source`                  | Set to `gitlab` to enable the GitLab datasource (defaults to `database`)                                              |
| `gitlab.apiBaseUrl`       | Base URL for the GitLab API                                                                                           |
| `gitlab.token`            | Personal access token with API access to the project or group                                                         |
| `gitlab.projectId`        | GitLab project ID (numeric) or URL-encoded path (e.g. `your-group/your-project`). Mutually exclusive with `groupId`   |
| `gitlab.groupId`          | GitLab group ID or path. Queries roadmap issues across all projects in the group. Mutually exclusive with `projectId` |
| `gitlab.defaultProjectId` | Project where new features are created when using group mode. Required for creating features in group mode            |

> **Note:** Exactly one of `projectId` or `groupId` must be provided.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `yarn install` (after changing Node major versions, rebuild native modules so **`better-sqlite3`** matches your runtime; otherwise `plugin.test.ts` integration cases are **skipped** while the rest of the suite still runs).
3. Start the dev environment: `yarn dev` (runs the standalone frontend at `localhost:3000` and backend at `localhost:7007` with guest auth, an in-memory database, an allow-all permission policy, plus the catalog, notifications, signals, and search backends so everything is testable locally)

   Testing notifications locally: you act as the guest user, and self-notifications are excluded, so the interesting sends target the second configured admin (`user:default/roadmap-admin` in the dev `app-config.yaml`). Create a feature as guest and watch the notifications backend logs (or `GET /api/notifications` with a token for that user). The dev frontend also has a Notifications page at `/notifications`. Search can be verified after the collator's initial delay with `GET /api/search/query?term=<word>`.

4. Make your changes
5. Run tests: `yarn test:all` (the database store tests also run against Postgres via [testcontainers](https://node.testcontainers.org/) when Docker is available; set `BACKSTAGE_TEST_DISABLE_DOCKER=1` to run sqlite-only. CI provides Postgres as a service container and runs both.)
6. Run lint: `yarn lint:all`

**`jwa` resolutions:** `jws` v3 depends on `jwa` 1.x and `jws` v4 on `jwa` 2.x, so root `package.json` pins both majors separately. Replacing them with one version would break one of those stacks unless upstream upgrades.

### Creating a Changeset

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and releases. When you make a change that affects users, you need to create a changeset:

1. Run `yarn changeset`
2. Select which packages are affected (use space to select, enter to confirm)
3. Choose the type of change:
   - **patch** - Bug fixes, minor updates
   - **minor** - New features, non-breaking changes
   - **major** - Breaking changes
4. Write a short description of your changes
5. Commit the changeset file along with your changes

### Pull Request Process

1. Create a changeset if needed (see above)
2. Push your changes to your fork
3. Open a Pull Request with a clear description
4. Wait for CI checks to pass
5. A maintainer will review your PR

Once merged, your changeset will automatically trigger a "Version Packages" PR, which when merged, publishes the new version to npm!
